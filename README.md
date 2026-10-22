# emdash-popcase

A native EmDash lightbox plugin with [Yet Another React Lightbox](https://yet-another-react-lightbox.com/).

Popcase supports images, linked videos, and YouTube links in the same viewer.

![Screenshot 1](images/screenshot1.jpg)

## Installation

Requires EmDash 1.3.1+, Astro 7, React, React DOM, and `@astrojs/react`.

```sh
pnpm add emdash-popcase
```

Add the configuration below to `astro.config.mjs` (or `astro.config.ts`) in your EmDash site's root directory, next to `package.json`. Keep your existing settings and plugins, and register `react()` only once.

```ts
import react from "@astrojs/react";
import emdash from "emdash/astro";
import { popcase, popcaseIntegration } from "emdash-popcase";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    react(),
    popcaseIntegration(),
    emdash({
      // Your database and storage configuration.
      plugins: [popcase()],
    }),
  ],
});
```

Register `popcaseIntegration()` before `emdash()`. Your theme must render `EmDashHead` with the content page context and collection, and use `PortableText` from `emdash/ui` for body content. The blog template already does this. Custom block renderers take precedence over Popcase's renderers.

The integration buffers public HTML responses, which disables streaming. If your site caches full responses, wrap this integration with the cache so it stores the processed HTML. Rebuild and redeploy after installation or project configuration changes.

## Configuration

```ts
popcase({
  zoom: true,
  counter: true,
  captions: true,
  labels: { Close: "Close viewer" },
});
```

## Admin settings

Open Popcase in the admin sidebar or visit `/_emdash/admin/plugins/popcase/settings`. Requires `plugins:manage`.

- "Enable all content types" is checked by default and includes future types.
- Uncheck it to select types individually. The selection starts empty; new types stay disabled until selected.
- "Enable thumbnails" adds a clickable strip below the image. It is off by default.
- Click "Save settings" to apply changes to existing and new content. An empty content type selection disables Popcase everywhere.

The page lists all registered content types, including hidden types and types without routes. Switching back to individual selection clears earlier selections.

The former `collections` factory option has been removed. Sites without saved admin settings enable all content types, including those excluded by older project configuration. Use the admin page to restrict them.

For cached or prerendered pages, invalidate the cache or rebuild after changing settings.

## Using a different image in the viewer

By default, an image opens its own source. To use a separate preview, set the preview image's "Link URL" to the viewer image's public URL.

Use a direct URL with a supported image-file extension. Extensionless URLs also work when they match an image reference known to the rendered block. Other links keep their normal navigation.

For inline HTML, choose the HTML block's "Inline" mode:

```html
<a href="/images/full.jpg">
  <img src="/images/preview.jpg" alt="Image description">
</a>
```

## Supported content and limitations

### Linked video files

Text and image links to `.mp4`, `.webm`, or `.ogv` files open in the viewer with native playback controls.

### YouTube

Text and image links to YouTube videos and Shorts load a player on demand in the same viewer, preserving linked start times.

### Images and other content

Popcase supports local media and direct image URLs, excluding featured images, listing cards, avatars, cover backgrounds, isolated iframes, third-party blocks, and editing surfaces.

## Development

Use Node.js 24+ and pnpm 12. The self-contained `example/` site has generated diagrams, its own SQLite database, and uploads directory.

```sh
pnpm install
pnpm build          # Compile server code and generate declarations
pnpm build:example  # Build the example site
pnpm test
pnpm typecheck
pnpm dev
pnpm test:package
```

`pnpm build` compiles server code from `src/` into `dist/`, with type declarations and source maps. The host compiles the Astro renderers, React admin page, and browser client from source, so the package includes both `dist` and `src`. Rebuild after changing server code while using a linked checkout. Plugin metadata reads its version from `package.json`, which is the single source for both npm and EmDash versions.

`pnpm test:package` installs the tarball in a temporary consumer, checks its files and public types, builds it, and verifies image markup and default content type settings over HTTP. It removes the consumer afterward. CI runs this alongside tests and type checks.

The example supports `?case=single`, `?case=new-type`, `?case=excluded`, `?case=nojs`, and `?case=fail`. Test the failed-module scenario in a production build.

Use `?case=video` for linked covers, text links, mixed image/video navigation, and the unchanged native player. Use `?case=video-text` to verify a page with no images. The included silent video is a two-second FFmpeg `testsrc2` pattern encoded as H.264, with no external media dependency.

Use `?case=youtube` for mixed YouTube/Shorts/image/file navigation and repeated YouTube links, or `?case=youtube-text` for a text-only entry. `?case=youtube-nojs` and `?case=youtube-fail` exercise fallback links (the latter requires a production build). YouTube URLs use the video ID from YouTube's official embed example; the Shorts link exercises portrait framing rather than supplying a separate Short. External playback requires access to YouTube and a video that permits embedding. Package HTTP verification does not require YouTube access.

To keep a consumer for manual inspection:

```sh
pnpm build
npm pack --ignore-scripts --pack-destination /tmp
node test/prepare-host.ts /tmp/emdash-popcase-0.1.0.tgz
```

Install dependencies and run `pnpm dev` or `pnpm build` in the printed directory.

## Using a local checkout

Add `"emdash-popcase": "link:../emdash-popcase"` to a sibling site's dependencies. Run `pnpm install` and `pnpm build` in this repository, then install the site's dependencies. After publishing, replace the link with a registry version, for example `pnpm add emdash-popcase@0.1.0`.


Source code is licensed under MIT. Dependencies retain their own licenses.
