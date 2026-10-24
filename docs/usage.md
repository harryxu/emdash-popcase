# Using Popcase

## Installation

Requires EmDash 1.3.1+, Astro 7, React, React DOM, and `@astrojs/react`.

```sh
pnpm add emdash-popcase
```

Popcase uses ExifReader's shipped parser. Its optional custom-build script is unnecessary; pnpm projects that require an explicit build-script decision can set `exifreader: false` under `allowBuilds` in `pnpm-workspace.yaml`.

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

## Admin settings

Open Popcase in the admin sidebar or visit `/_emdash/admin/plugins/popcase/settings`. Requires `plugins:manage`.

- "Enable all content types" is checked by default and includes future types.
- Uncheck it to select types individually. The selection starts empty; new types stay disabled until selected.
- "Enable thumbnails" adds a clickable strip below the image. It is off by default.
- "Show photo information" adds a photography information panel. It is on by default; readers expand it to load the information.
- "Autoplay videos" controls linked video files and YouTube playback in the viewer; it is on by default.
- Click "Save settings" to apply changes to existing and new content. An empty content type selection disables Popcase everywhere.

The page lists all registered content types, including hidden types and types without routes. Switching back to individual selection clears earlier selections.

The former `collections` factory option has been removed. Sites without saved admin settings enable all content types, including those excluded by older project configuration. Use the admin page to restrict them.

For cached or prerendered pages, invalidate the cache or rebuild after changing settings.

### Advanced: Custom CSS

Expand "Advanced" to enter custom CSS in a multiline field, then click "Save".
The section starts collapsed on each visit. Clear the field and save to remove
your overrides. Custom CSS saves atomically with the other settings; structural
syntax errors prevent the entire save and preserve your draft. Popcase does not
impose a custom CSS size limit.

Popcase wraps your entire input in `.popcase-dialog[data-popcase-root] { ... }`.
Use ordinary selectors for viewer contents, `&` for the dialog itself, and
`&::backdrop` for its native backdrop. For example:

```css
.popcase-viewer {
  --yarl__color_backdrop: rgb(0 0 0 / 85%);
}

.yarl__toolbar {
  padding: 20px;
}

@media (width < 600px) {
  .yarl__toolbar {
    padding: 8px;
  }
}
```

The stylesheet is added after all default viewer styles when the lightbox opens
and removed when it closes or the page changes. Before opening, CSS is present
only as encoded inert configuration; there is no custom stylesheet or resource
loading from it. Normal CSS specificity and `!important` still apply.

Only add CSS you trust. Native nesting is a convention, not a security boundary:
advanced selectors such as `& + *` can affect other parts of the page. No feature
allowlist is enforced, but rules must be valid in a native nested context for the
browser to apply them. Popcase checks syntax structure, not every selector,
property, or browser-specific feature. Unsupported rules are handled by the
browser; Popcase does not compile Sass or lift nested at-rules to the top level.
External `url()` resources are allowed and subject to the host's Content Security
Policy. Dynamic custom styles also require a CSP that permits their inline style
element; Popcase does not change the site's policy. Relative resource URLs
resolve against the content page's base URL.

## Using a different image in the viewer

By default, an image opens its own source. To use a separate preview, set the preview image's "Link URL" to the viewer image's public URL.

Use a direct URL with a supported image-file extension. Extensionless URLs also work when they match an image reference known to the rendered block. Other links keep their normal navigation.

For inline HTML, choose the HTML block's "Inline" mode:

```html
<a href="/images/full.jpg">
  <img src="/images/preview.jpg" alt="Image description" />
</a>
```

## Supported content

### Linked video files

Text and image links to `.mp4`, `.webm`, or `.ogv` files open in the viewer with native playback controls.

### YouTube

Text and image links to YouTube videos and Shorts load a player on demand in the same viewer, preserving linked start times.

### Images and other content

Popcase supports local media and direct image URLs, excluding featured images, listing cards, avatars, cover backgrounds, isolated iframes, third-party blocks, and editing surfaces.

See [Photo information](photo-information.md) for EXIF display, supported formats, and the standalone YARL plugin.
