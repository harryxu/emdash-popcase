import type { PluginDescriptor } from "emdash";
import type { AstroIntegration } from "astro";

export interface PopcaseOptions {
  zoom?: boolean;
  counter?: boolean;
  captions?: boolean;
  /** Override the labels for the page's Chinese or English interface. */
  labels?: Record<string, string>;
}

export interface PopcaseConfig {
  zoom: boolean;
  counter: boolean;
  captions: boolean;
  labels: Record<string, string>;
}

export function popcase(options?: PopcaseOptions): PluginDescriptor;
export function createPlugin(options?: PopcaseOptions): ReturnType<typeof import("emdash").definePlugin>;
export function popcaseIntegration(): AstroIntegration;
export default popcase;
