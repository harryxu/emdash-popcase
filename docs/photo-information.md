# Photo information

Open the information button in the viewer toolbar to see the current image's camera, lens, actual focal length, aperture, shutter speed, ISO, and capture time. Missing fields are omitted. The panel appears on the right on desktop and below the photograph on phones, independently of captions and thumbnails. Its visibility follows navigation through a viewer session and resets on reopening. Focus inside the panel makes Escape collapse it; elsewhere Escape closes the viewer.

Popcase reads retained EXIF in JPEG, PNG, WebP, and AVIF images on demand. Information belongs to the viewer image, including when a different preview is used. A capture time without a timezone is labeled "Camera time" and is not converted to the reader's timezone. GPS, serial numbers, author, and copyright fields are not displayed.

Image hosts must allow browser reads through CORS, and the site's CSP `connect-src` must permit the viewer-image origin. An image may display normally while these policies prevent reading EXIF. Re-encoding, image transformations, or exporting without metadata can also remove the information. Popcase does not proxy images or retrieve a different original to recover missing data. It caches results only within the open viewer session.

Each attempt waits up to 10 seconds and accepts at most 8 MiB for processing; a limit or failure offers a retry rather than claiming the image has no information. JPEG metadata can usually be read before its pixel stream; other containers may require the complete file. Cancellation limits application reads, but browser buffering and HTTP caching determine actual transferred bytes. Viewing, navigation, and original fallback links remain available when EXIF cannot be read.

## Standalone YARL plugin

The display plugin can also be used with a compatible YARL 3 installation. Import its stylesheet alongside YARL's stylesheet. This entry does not import EmDash or fetch image bytes automatically.

```tsx
import Lightbox from "yet-another-react-lightbox";
import { Exif, type PhotoInformation } from "emdash-popcase/exif";
import "yet-another-react-lightbox/styles.css";
import "emdash-popcase/exif.css";

const information: PhotoInformation = {
  camera: "Camera model",
  lens: "Lens model",
  focalLength: 50,
  aperture: 2.8,
  exposureTime: 1 / 250, // Seconds.
  iso: 400,
  capturedAt: { dateTime: "2026-10-23T15:04:05", offset: "+08:00" },
};

<Lightbox
  open={open}
  close={() => setOpen(false)}
  plugins={[Exif]}
  slides={[{ src: "/photo.jpg", exif: information }]}
/>;
```

For asynchronous data, supply `exif={{ load: async (slide, { signal }) => result }}`. The loader runs only for an expanded image without inline `slide.exif`. Return an `ExifLoadResult`: `{ status: "ready", information }`, `{ status: "empty" }`, `{ status: "unsupported" }`, or `{ status: "error", reason? }`. The optional error reason is `network`, `parse`, `timeout`, or `limit`. Use the signal to cancel your request; the display plugin also discards late results. Ready data contains numbers for millimeters, aperture, seconds, and ISO; capture time is a local date/time string with a separate optional offset. Inline information takes precedence. Public `ExifOptions` and `ExifLoadResult` types describe this contract.
