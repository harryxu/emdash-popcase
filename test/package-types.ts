import type { AstroIntegration, MiddlewareHandler } from "astro";
import type { PluginDescriptor } from "emdash";
import popcase, { createPlugin, popcaseIntegration, type PopcaseConfig } from "emdash-popcase";
import { onRequest } from "emdash-popcase/middleware";
import { Exif, type PhotoInformation, type ExifOptions } from "emdash-popcase/exif";
import type { SlideImage, LightboxExternalProps, Plugin } from "yet-another-react-lightbox";
// @ts-expect-error The code configuration type is no longer exported.
export type RemovedCodeOptions = import("emdash-popcase").PopcaseOptions;

const descriptor: PluginDescriptor = popcase();
const integration: AstroIntegration = popcaseIntegration();
const middleware: MiddlewareHandler = onRequest;
const config: PopcaseConfig = { thumbnails: false, videoAutoplay: true, photoInformation: true };
const information: PhotoInformation = {
  camera: "Camera One",
  aperture: 2.8,
  exposureTime: 1 / 250,
};
const slide: SlideImage = { src: "/photo.jpg", exif: information };
const exifPlugin: Plugin = Exif;
const options: ExifOptions = {
  load: async (_slide, { signal }) =>
    signal.aborted ? { status: "error" } : { status: "ready", information },
};
const lightbox: LightboxExternalProps = { plugins: [exifPlugin], slides: [slide], exif: options };
createPlugin();

// @ts-expect-error Code configuration is no longer supported.
popcase({ zoom: false });
// @ts-expect-error Runtime behavior is configured in the admin settings.
createPlugin({ captions: false });
// @ts-expect-error Content type eligibility is managed in the admin settings.
popcase({ collections: ["posts"] });

void [descriptor, integration, middleware, config, lightbox];
