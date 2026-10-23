import {
  cameraName,
  captureTime,
  photoInformationFields,
  type ExifLoadResult,
  type PhotoInformation,
} from "../exif/information.js";

const maxImageBytes = 8 * 1024 * 1024;
const readTimeout = 10_000;
const tagsToRead = [
  "Make",
  "Model",
  "LensMake",
  "LensModel",
  "FocalLength",
  "FNumber",
  "ExposureTime",
  "ISOSpeedRatings",
  "ISOSpeed",
  "DateTimeOriginal",
  "OffsetTimeOriginal",
];

function imageFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | "avif" | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value))
    return "png";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp") {
    const length = Math.min(
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0),
      bytes.length,
    );
    for (let offset = 8; offset + 4 <= length; offset += 4) {
      if (offset !== 12 && ["avif", "avis"].includes(ascii(offset, offset + 4))) return "avif";
    }
  }
}

/** JPEG metadata is complete at the start of scan, before the pixel stream. */
function jpegHeaderEnd(bytes: Uint8Array): number | undefined {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Invalid JPEG header.");
    if (bytes[offset + 1] === 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd9) return;
    const length = (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
    if (length < 2) throw new Error("Invalid JPEG segment.");
    if (offset + 2 + length > bytes.length) return;
    if (marker === 0xda) return offset + 2 + length;
    offset += 2 + length;
  }
}

function completeContainer(bytes: Uint8Array, format: ReturnType<typeof imageFormat>): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (format === "jpeg") return jpegHeaderEnd(bytes) !== undefined;
  if (format === "png")
    return (
      bytes.length >= 12 &&
      view.getUint32(bytes.length - 12) === 0 &&
      view.getUint32(bytes.length - 8) === 0x49454e44
    );
  if (format === "webp") return bytes.length >= 12 && view.getUint32(4, true) + 8 <= bytes.length;
  if (format === "avif") {
    let offset = 0;
    while (offset + 8 <= bytes.length) {
      let length = view.getUint32(offset);
      if (length === 0) return true;
      if (length === 1) {
        if (offset + 16 > bytes.length) return false;
        length = Number(view.getBigUint64(offset + 8));
        if (length < 16) return false;
      }
      if (length < 8 || length > bytes.length - offset) return false;
      offset += length;
    }
    return offset === bytes.length;
  }
  return false;
}

async function readImage(
  response: Response,
  signal: AbortSignal,
  limit: number,
): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error("Image request failed.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let jpeg: boolean | undefined;
  const join = () => {
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) return join();
      const available = Math.max(0, limit - size);
      chunks.push(value.subarray(0, available));
      size += Math.min(value.length, available);
      if (jpeg === undefined && size >= 2) {
        const signature = join();
        jpeg = signature[0] === 0xff && signature[1] === 0xd8;
      }
      if (jpeg) {
        const bytes = join();
        const end = jpegHeaderEnd(bytes);
        if (end) return bytes.slice(0, end);
      }
      if (value.length > available) throw new RangeError("Photo information read limit exceeded.");
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type RawTag = { value?: unknown } | undefined;
function tagValue(tag: RawTag): unknown {
  const value = tag?.value;
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

function rational(tag: RawTag): number | undefined {
  const value = tagValue(tag);
  if (typeof value === "number") return value;
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number") &&
    value[1] !== 0
  )
    return value[0] / value[1];
}

export async function readPhotoInformation(
  slide: { src: string },
  { signal }: { signal: AbortSignal },
  options: { fetch?: typeof fetch; maxBytes?: number; timeoutMs?: number } = {},
): Promise<ExifLoadResult> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? readTimeout);
  let parsing = false;
  try {
    controller.signal.throwIfAborted();
    const response = await (options.fetch ?? fetch)(slide.src, {
      signal: controller.signal,
      credentials: "same-origin",
    });
    const bytes = await readImage(response, controller.signal, options.maxBytes ?? maxImageBytes);
    controller.signal.throwIfAborted();
    const format = imageFormat(bytes);
    if (!format) return { status: "unsupported" };
    if (!completeContainer(bytes, format)) return { status: "error", reason: "parse" };
    parsing = true;
    const { default: parser } = await import("exifreader");
    controller.signal.throwIfAborted();
    try {
      const tags = parser.load(bytes, {
        expanded: true,
        includeOffsets: true,
        includeTags: { exif: tagsToRead },
      });
      if (tags.metadataRange && !tags.metadataRange.complete)
        return { status: "error", reason: "parse" };
      const exif = (tags.exif ?? {}) as Record<string, RawTag>;
      const information: PhotoInformation = {
        camera: cameraName(tagValue(exif.Make), tagValue(exif.Model)),
        lens: cameraName(tagValue(exif.LensMake), tagValue(exif.LensModel)),
        focalLength: rational(exif.FocalLength),
        aperture: rational(exif.FNumber),
        exposureTime: rational(exif.ExposureTime),
        iso: rational(exif.ISOSpeedRatings) ?? rational(exif.ISOSpeed),
        capturedAt: captureTime(tagValue(exif.DateTimeOriginal), tagValue(exif.OffsetTimeOriginal)),
      };
      return photoInformationFields(information).length
        ? { status: "ready", information }
        : { status: "empty" };
    } catch (error) {
      if (error instanceof parser.errors.MetadataMissingError) return { status: "empty" };
      throw error;
    }
  } catch (error) {
    if (signal.aborted)
      throw signal.reason ?? new DOMException("Photo information reading cancelled.", "AbortError");
    return {
      status: "error",
      reason: timedOut
        ? "timeout"
        : error instanceof RangeError && !parsing
          ? "limit"
          : parsing
            ? "parse"
            : "network",
    };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
    controller.abort();
  }
}
