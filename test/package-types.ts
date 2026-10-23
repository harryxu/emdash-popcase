import type { AstroIntegration, MiddlewareHandler } from "astro";
import type { PluginDescriptor } from "emdash";
import popcase, { createPlugin, popcaseIntegration, type PopcaseConfig, type PopcaseOptions } from "emdash-popcase";
import { onRequest } from "emdash-popcase/middleware";

const options: PopcaseOptions = { zoom: false, labels: { Close: "Close viewer" } };
const descriptor: PluginDescriptor = popcase(options);
const integration: AstroIntegration = popcaseIntegration();
const middleware: MiddlewareHandler = onRequest;
const config: PopcaseConfig = { zoom: true, counter: true, captions: true, thumbnails: false, videoAutoplay: true, labels: {} };
createPlugin(options);

// @ts-expect-error Viewer flags must be booleans.
popcase({ zoom: "yes" });
// @ts-expect-error Content type eligibility is managed in the admin settings.
popcase({ collections: ["posts"] });

void [descriptor, integration, middleware, config];
