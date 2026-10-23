import type { AstroIntegration, MiddlewareHandler } from "astro";
import type { PluginDescriptor } from "emdash";
import popcase, { createPlugin, popcaseIntegration, type PopcaseConfig } from "emdash-popcase";
import { onRequest } from "emdash-popcase/middleware";
// @ts-expect-error The code configuration type is no longer exported.
export type RemovedCodeOptions = import("emdash-popcase").PopcaseOptions;

const descriptor: PluginDescriptor = popcase();
const integration: AstroIntegration = popcaseIntegration();
const middleware: MiddlewareHandler = onRequest;
const config: PopcaseConfig = { thumbnails: false, videoAutoplay: true };
createPlugin();

// @ts-expect-error Code configuration is no longer supported.
popcase({ zoom: false });
// @ts-expect-error Runtime behavior is configured in the admin settings.
createPlugin({ captions: false });
// @ts-expect-error Content type eligibility is managed in the admin settings.
popcase({ collections: ["posts"] });

void [descriptor, integration, middleware, config];
