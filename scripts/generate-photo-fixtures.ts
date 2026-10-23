import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Synthetic EXIF and existing synthetic SVGs only; no personal photographs.
const directory = fileURLToPath(new URL("../example/public/__popcase-images/", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "popcase-photo-fixtures-"));

function exifProfile(camera: string, lens: string) {
  const ascii = (value: string) => Buffer.from(`${value}\0`, "ascii");
  const short = (value: number) => {
    const data = Buffer.alloc(2);
    data.writeUInt16LE(value);
    return data;
  };
  const rational = (numerator: number, denominator: number) => {
    const data = Buffer.alloc(8);
    data.writeUInt32LE(numerator);
    data.writeUInt32LE(denominator, 4);
    return data;
  };
  const root = [
    [0x010f, 2, ascii("Popcase")],
    [0x0110, 2, ascii(camera)],
    [0x8769, 4, Buffer.alloc(4)],
  ] as const;
  const photo = [
    [0x829a, 5, rational(1, 250)],
    [0x829d, 5, rational(28, 10)],
    [0x8827, 3, short(400)],
    [0x9003, 2, ascii("2026:10:23 15:04:05")],
    [0x9011, 2, ascii("+08:00")],
    [0x920a, 5, rational(50, 1)],
    [0xa433, 2, ascii("Popcase")],
    [0xa434, 2, ascii(lens)],
  ] as const;
  const subOffset = 8 + 2 + root.length * 12 + 4;
  root[2][2].writeUInt32LE(subOffset);
  const dataOffset = subOffset + 2 + photo.length * 12 + 4;
  const output = Buffer.alloc(4096);
  output.write("II");
  output.writeUInt16LE(42, 2);
  output.writeUInt32LE(8, 4);
  let cursor = dataOffset;
  const ifd = (offset: number, entries: readonly (readonly [number, number, Buffer])[]) => {
    output.writeUInt16LE(entries.length, offset);
    entries.forEach(([tag, type, data], index) => {
      const start = offset + 2 + index * 12;
      output.writeUInt16LE(tag, start);
      output.writeUInt16LE(type, start + 2);
      output.writeUInt32LE(type === 2 ? data.length : 1, start + 4);
      if (data.length <= 4) data.copy(output, start + 8);
      else {
        output.writeUInt32LE(cursor, start + 8);
        data.copy(output, cursor);
        cursor += data.length;
      }
    });
  };
  ifd(8, root);
  ifd(subOffset, photo);
  return Buffer.concat([Buffer.from("Exif\0\0"), output.subarray(0, cursor)]);
}

try {
  const inject = async (path: string, data: Buffer) => {
    const jpeg = await readFile(path);
    const marker = Buffer.from([0xff, 0xe1, 0, 0]);
    marker.writeUInt16BE(data.length + 2, 2);
    await writeFile(path, Buffer.concat([jpeg.subarray(0, 2), marker, data, jpeg.subarray(2)]));
  };
  execFileSync("magick", [
    "-size",
    "1200x800",
    "xc:#45523b",
    "-stroke",
    "#f5e8c8",
    "-strokewidth",
    "3",
    "-fill",
    "none",
    "-draw",
    "circle 600,370 840,370 circle 600,370 760,370 line 180,370 1020,370 line 600,90 600,650 line 360,130 840,610 line 840,130 360,610",
    join(directory, "photo.jpg"),
  ]);
  await inject(
    join(directory, "photo.jpg"),
    exifProfile("Popcase Camera One", "50mm F2.8 Test Lens"),
  );
  for (const extension of ["png", "webp", "avif"]) {
    execFileSync("magick", [join(directory, "photo.jpg"), join(directory, `photo.${extension}`)]);
  }
  execFileSync("magick", [
    join(directory, "photo.jpg"),
    "-strip",
    join(directory, "photo-empty.jpg"),
  ]);
  execFileSync("magick", [
    "-size",
    "480x320",
    "xc:#705b4c",
    "-stroke",
    "#f5e8c8",
    "-strokewidth",
    "2",
    "-fill",
    "none",
    "-draw",
    "rectangle 50,50 430,270 line 50,50 430,270 line 430,50 50,270",
    join(directory, "photo-preview.jpg"),
  ]);
  await inject(
    join(directory, "photo-preview.jpg"),
    exifProfile("Popcase Preview Camera", "Preview-only Lens"),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
