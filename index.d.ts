import type { PluginDescriptor } from "emdash";
import type { AstroIntegration } from "astro";

export interface PopcaseOptions {
  /** Content collections to enhance. Defaults to posts and pages. */
  collections?: string[];
  zoom?: boolean;
  counter?: boolean;
  captions?: boolean;
  /** Override the labels for the page's Chinese or English interface. */
  labels?: Record<string, string>;
}

export interface PopcaseConfig {
  collections: string[];
  zoom: boolean;
  counter: boolean;
  captions: boolean;
  labels: Record<string, string>;
}

export function popcase(options?: PopcaseOptions): PluginDescriptor;
export function createPlugin(options?: PopcaseOptions): ReturnType<typeof import("emdash").definePlugin>;
export function popcaseIntegration(): AstroIntegration;
export default popcase;
