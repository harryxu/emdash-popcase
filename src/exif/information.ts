/** Photography values for the actual image displayed in the lightbox. */
export interface PhotoInformation {
  camera?: string;
  lens?: string;
  /** Actual focal length in millimeters. */
  focalLength?: number;
  aperture?: number;
  /** Exposure duration in seconds. */
  exposureTime?: number;
  iso?: number;
  /** Camera wall time, without conversion to the reader's timezone. */
  capturedAt?: { dateTime: string; offset?: string };
}

export type ExifLoadResult =
  | { status: "ready"; information: PhotoInformation }
  | { status: "empty" }
  | { status: "unsupported" }
  | { status: "error"; reason?: "network" | "parse" | "timeout" | "limit" };

export interface PhotoInformationField {
  key: keyof PhotoInformation;
  label: string;
  value: string;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  return (
    value
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 200) || undefined
  );
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function cameraName(make: unknown, model: unknown): string | undefined {
  const brand = text(make);
  const name = text(model);
  if (!brand || !name) return name || brand;
  const lower = name.toLowerCase();
  const prefix = brand.toLowerCase();
  return lower === prefix || lower.startsWith(`${prefix} `) ? name : `${brand} ${name}`;
}

export function captureTime(value: unknown, offset?: unknown): PhotoInformation["capturedAt"] {
  if (typeof value !== "string") return;
  const match = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return;
  const [, year, month, day, hour, minute, second] = match;
  if (
    +year! < 1000 ||
    +month! < 1 ||
    +month! > 12 ||
    +day! < 1 ||
    +day! > new Date(Date.UTC(+year!, +month!, 0)).getUTCDate() ||
    +hour! > 23 ||
    +minute! > 59 ||
    +second! > 59
  )
    return;
  const zone =
    typeof offset === "string" && /^[+-](?:[01]\d|2[0-3]):[0-5]\d$/.test(offset.trim())
      ? offset.trim()
      : undefined;
  return {
    dateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    ...(zone ? { offset: zone } : {}),
  };
}

export function normalizePhotoInformation(value: PhotoInformation): PhotoInformation {
  return {
    camera: text(value.camera),
    lens: text(value.lens),
    focalLength: positive(value.focalLength),
    aperture: positive(value.aperture),
    exposureTime: positive(value.exposureTime),
    iso: positive(value.iso),
    capturedAt: captureTime(value.capturedAt?.dateTime, value.capturedAt?.offset),
  };
}

const number = (value: number) =>
  new Intl.NumberFormat("en", { maximumSignificantDigits: 4, useGrouping: false }).format(value);

function exposure(value: number): string {
  const inverse = 1 / value;
  const reciprocal = Math.round(inverse);
  return value < 1 && reciprocal >= 2 && Math.abs(inverse - reciprocal) / inverse < 0.01
    ? `1/${reciprocal} s`
    : `${number(value)} s`;
}

export function photoInformationFields(value: PhotoInformation): PhotoInformationField[] {
  const info = normalizePhotoInformation(value);
  const fields: PhotoInformationField[] = [];
  const add = (key: keyof PhotoInformation, label: string, value?: string) => {
    if (value) fields.push({ key, label, value });
  };
  add("camera", "Camera", info.camera);
  add("lens", "Lens", info.lens);
  add(
    "focalLength",
    "Focal length",
    info.focalLength ? `${number(info.focalLength)} mm` : undefined,
  );
  add("aperture", "Aperture", info.aperture ? `f/${number(info.aperture)}` : undefined);
  add("exposureTime", "Shutter speed", info.exposureTime ? exposure(info.exposureTime) : undefined);
  add("iso", "Sensitivity", info.iso ? `ISO ${number(info.iso)}` : undefined);
  add(
    "capturedAt",
    "Captured",
    info.capturedAt
      ? `${info.capturedAt.dateTime.replace("T", " ")} ${info.capturedAt.offset || "· Camera time"}`
      : undefined,
  );
  return fields;
}
