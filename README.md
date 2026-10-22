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

Zoom, the image counter, and captions are enabled by default. Labels use English; override them with `labels`.

The viewer supports mouse, keyboard, and touch navigation. It stops at the first and last image. Captions come from each image's placement in the content.

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

### Playing linked videos

On enabled content detail pages, image links and text links to `.mp4`, `.webm`, or `.ogv` files open in the viewer. Query strings and fragments are preserved. Images and linked videos share one viewing group in page order.

- For a video cover, insert an image and set its **Link URL** to the public video file URL. The image becomes the player's poster; its caption is shown in the viewer.
- For a text entry point, select text and add a link to the public video file URL. No image is required.
- Videos show native playback controls and attempt to play with sound when opened or navigated to. If the browser blocks autoplay, press Play. Video files are not preloaded by Popcase before opening the viewer.

Direct video links are detected throughout the eligible page, including ordinary Portable Text paragraphs, columns, and inline HTML. No content block or editor setting is required. Download links and visual-editing surfaces are excluded. Without JavaScript or if the viewer fails to load, links retain their original destinations.

Native `/video` blocks keep their inline players. Vimeo and other unsupported video-site pages, streaming manifests, and extensionless video file URLs are not enhanced. Popcase does not transcode videos or probe arbitrary URLs.

### Playing YouTube links

Ordinary text and image links to `youtube.com/watch?v=VIDEO_ID`, `youtu.be/VIDEO_ID`, and `youtube.com/shorts/VIDEO_ID` open a YouTube player in the same viewer. The `www` and mobile `m.youtube.com` hosts are supported. Detection covers the entire enabled content detail page, including header/footer links, with the same download and editing exclusions as direct videos. No author opt-in or additional setting is needed. Repeated links retain separate positions in the mixed viewing group.

- Preserve start times from `t` or `start` in the query or fragment, using seconds or forms such as `1h2m3s`. Invalid offsets default to zero. Other URL parameters, including playlists and looping, do not configure the player. The complete original link remains available for normal navigation.
- Only the current YouTube slide connects to `www.youtube-nocookie.com`, after opening or navigating to it. Neighboring slides do not load players. Popcase does not fetch YouTube titles, thumbnails, or dimensions. Privacy-enhanced embedding still connects to YouTube and is not a promise of zero third-party data collection.
- Players attempt audible autoplay with inline controls. If autoplay is blocked, press Play. Switching away or closing removes the player; returning starts at the link's specified time. Fullscreen is disabled. Regular videos use a 16:9 frame and Shorts use 9:16, fitting the window without cropping.
- When thumbnails are enabled, image links use the author's existing preview; text links show a play icon. Existing figure captions remain captions, while image alt text or link text names the entry point. No caption is synthesized from a fetched title.
- An **Open on YouTube** link is always visible outside the player (override with `labels["Open on YouTube"]`). Unavailable, restricted, blocked, or non-embeddable videos retain YouTube's error UI without automatically navigating away. Host CSP rules must permit `frame-src https://www.youtube-nocookie.com`; the iframe uses `strict-origin-when-cross-origin` to retain YouTube's required origin referrer.
- Focus inside the cross-origin player uses YouTube's keyboard behavior. Escape and arrow keys control the viewer when focus is outside the player. Outer close/navigation buttons remain available, and closing restores focus to the originating link.

Playlist-only links, channel/live entry points, `/live/` and `/embed/` URLs, and existing embedded players are unchanged. Without JavaScript or when the viewer cannot load, the original YouTube link remains usable. See [ADR-0005](./docs/adr/0005-open-youtube-links-with-on-demand-embeds.md).

### Images and other content

Popcase supports local media and saved direct image URLs. Provider-specific assets need an explicit source URL.

Featured images, listing cards, avatars, cover backgrounds, isolated iframes, and arbitrary third-party blocks are excluded. Popcase leaves frontend visual editing and the backend editor unchanged.

Popcase wraps unlinked images in links. Check theme selectors that expect images to be direct children of figures. Viewer entry points use `a[data-popcase]`; viewer styles use `.popcase-viewer`.

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
