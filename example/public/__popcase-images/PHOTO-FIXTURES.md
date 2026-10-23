# Synthetic photography fixtures

`photo.jpg`, `photo.png`, `photo.webp`, `photo.avif`, `photo-empty.jpg`, and `photo-preview.jpg` are synthetic test images derived from this repository's `detail.svg` and `preview.svg`. No real photograph or personal metadata is included. The camera and lens names are invented test values.

Regenerate them with `node scripts/generate-photo-fixtures.ts` on a machine with ImageMagick. The script writes standard synthetic EXIF into a JPEG and converts it into the other three formats. The empty image is stripped of metadata, and the preview image deliberately names a different camera and lens.
