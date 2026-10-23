import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { readPhotoInformation } from "../dist/client/photo-information.js";
import { cameraName, captureTime, photoInformationFields } from "../dist/exif/information.js";

const fixture = (name: string) =>
  readFile(new URL(`../example/public/__popcase-images/${name}`, import.meta.url));
const context = () => ({ signal: new AbortController().signal });
const source = { src: "https://media.example/photo.jpg?version=2" };
const responseFetch =
  (bytes: Uint8Array): typeof fetch =>
  async () =>
    new Response(Uint8Array.from(bytes));

for (const format of ["jpg", "png", "webp", "avif"]) {
  test(`reads seven photography fields from a real synthetic ${format} file`, async () => {
    const result = await readPhotoInformation(source, context(), {
      fetch: responseFetch(await fixture(`photo.${format}`)),
    });
    assert.equal(result.status, "ready");
    if (result.status !== "ready") return;
    assert.deepEqual(result.information, {
      camera: "Popcase Camera One",
      lens: "Popcase 50mm F2.8 Test Lens",
      focalLength: 50,
      aperture: 2.8,
      exposureTime: 1 / 250,
      iso: 400,
      capturedAt: { dateTime: "2026-10-23T15:04:05", offset: "+08:00" },
    });
    assert.equal(photoInformationFields(result.information).length, 7);
  });
}

test("formats photography values without replacing missing data or inventing a timezone", () => {
  assert.deepEqual(
    photoInformationFields({ focalLength: 50, aperture: 1.8, exposureTime: 1 / 250, iso: 400 }).map(
      ({ value }) => value,
    ),
    ["50 mm", "f/1.8", "1/250 s", "ISO 400"],
  );
  assert.equal(photoInformationFields({ exposureTime: 0.3 })[0]?.value, "0.3 s");
  assert.equal(photoInformationFields({ exposureTime: 2.5 })[0]?.value, "2.5 s");
  assert.deepEqual(
    photoInformationFields({
      aperture: NaN,
      focalLength: -1,
      exposureTime: Infinity,
      iso: 0,
      camera: " ",
    }),
    [],
  );
  assert.equal(cameraName("Canon", "Canon EOS R5"), "Canon EOS R5");
  assert.equal(cameraName("Sony", "ILCE-7RM5"), "Sony ILCE-7RM5");
  assert.equal(cameraName(undefined, "Lens One"), "Lens One");
  const capturedAt = captureTime("2026:10:23 15:04:05");
  assert.deepEqual(capturedAt, { dateTime: "2026-10-23T15:04:05" });
  assert.match(photoInformationFields({ capturedAt })[0]!.value, /15:04:05 · Camera time$/);
  assert.equal(captureTime("2026:02:30 12:00:00"), undefined);
  assert.equal(captureTime("2026:10:23 25:00:00"), undefined);
  assert.deepEqual(captureTime("2026:10:23 15:04:05", "bogus"), capturedAt);
});

test("reads exactly the viewer URL and does not mix preview-image metadata", async () => {
  let requested = "";
  const result = await readPhotoInformation(source, context(), {
    fetch: async (url) => {
      requested = String(url);
      return new Response(await fixture("photo.jpg"));
    },
  });
  assert.equal(requested, source.src);
  assert.equal(result.status, "ready");
  assert.doesNotMatch(JSON.stringify(result), /Preview Camera|Preview-only Lens/);
});

test("distinguishes complete images without EXIF, unsupported SVG, and truncated metadata", async () => {
  assert.deepEqual(
    await readPhotoInformation(source, context(), {
      fetch: responseFetch(await fixture("photo-empty.jpg")),
    }),
    { status: "empty" },
  );
  assert.deepEqual(
    await readPhotoInformation(source, context(), {
      fetch: responseFetch(await fixture("detail.svg")),
    }),
    { status: "unsupported" },
  );
  const truncated = (await fixture("photo.jpg")).subarray(0, 200);
  const result = await readPhotoInformation(source, context(), { fetch: responseFetch(truncated) });
  assert.equal(result.status, "error");
  for (const format of ["jpg", "png", "webp", "avif"]) {
    const partial = (await fixture(`photo.${format}`)).subarray(0, 24);
    assert.equal(
      (await readPhotoInformation(source, context(), { fetch: responseFetch(partial) })).status,
      "error",
    );
  }
});

test("enforces a streamed read budget even if Content-Length lies or the server returns a full 200", async () => {
  const bytes = await fixture("photo.png");
  const result = await readPhotoInformation(source, context(), {
    maxBytes: 128,
    fetch: async () => new Response(bytes, { headers: { "Content-Length": "12" } }),
  });
  assert.deepEqual(result, { status: "error", reason: "limit" });
});

test("can finish JPEG metadata before downloading a large pixel stream, including split signatures", async () => {
  const bytes = await fixture("photo.jpg");
  const sos = bytes.indexOf(Buffer.from([0xff, 0xda]));
  const headerEnd = sos + 2 + bytes.readUInt16BE(sos + 2);
  let sent = false;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 1));
    },
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(bytes.subarray(1, headerEnd));
      } else controller.enqueue(new Uint8Array(65536));
    },
    cancel() {
      cancelled = true;
    },
  });
  const result = await readPhotoInformation(source, context(), {
    maxBytes: headerEnd,
    fetch: async () => new Response(stream),
  });
  assert.equal(result.status, "ready");
  assert.equal(cancelled, true);
});

test("reports timeout and network errors without converting them to empty EXIF", async () => {
  const slowFetch: typeof fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal!.reason), {
        once: true,
      });
    });
  assert.deepEqual(
    await readPhotoInformation(source, context(), { timeoutMs: 10, fetch: slowFetch }),
    { status: "error", reason: "timeout" },
  );
  assert.deepEqual(
    await readPhotoInformation(source, context(), {
      fetch: async () => {
        throw new TypeError("CORS blocked");
      },
    }),
    { status: "error", reason: "network" },
  );
});

test("propagates explicit cancellation to the actual fetch and discards its result", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  const pending = readPhotoInformation(
    source,
    { signal: controller.signal },
    {
      fetch: async (_url, options) => {
        receivedSignal = options?.signal ?? undefined;
        return new Promise((_resolve, reject) =>
          options?.signal?.addEventListener("abort", () => reject(options.signal!.reason), {
            once: true,
          }),
        );
      },
    },
  );
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.ok(receivedSignal?.aborted);
});

test("aborts a real HTTP response stalled during streaming", async () => {
  const closed = Promise.withResolvers<void>();
  let closeTimeout: ReturnType<typeof setTimeout> | undefined;
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.write(Buffer.from([137, 80, 78, 71]));
    response.on("close", () => closed.resolve());
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    const result = await readPhotoInformation(
      { src: `http://127.0.0.1:${address.port}/slow.png` },
      context(),
      { timeoutMs: 100 },
    );
    assert.deepEqual(result, { status: "error", reason: "timeout" });
    await Promise.race([
      closed.promise,
      new Promise<never>((_resolve, reject) => {
        closeTimeout = setTimeout(
          () => reject(new Error("The HTTP response was not cancelled.")),
          1000,
        );
      }),
    ]);
  } finally {
    clearTimeout(closeTimeout);
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});
