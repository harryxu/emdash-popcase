# emdash-popcase

A native EmDash plugin for viewing body images with [Yet Another React Lightbox](https://yet-another-react-lightbox.com/).

Popcase opens images from existing image and gallery blocks without requiring you to resave entries. Images on each content page form one group in page order, including supported images in columns and linked images in inline HTML. The viewer loads its code and styles on the first click. Image links still work without JavaScript.

![Screenshot 1](images/screenshot1.jpg)

## Installation

Popcase requires EmDash 1.3.1+, Astro 7, React, and React DOM. Configure `@astrojs/react` in your site to compile the packaged React client.

```sh
pnpm add emdash-popcase
```

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

Your theme must render `EmDashHead` with the content page context and collection, as the blog template already does. Render body content with `PortableText` from `emdash/ui`. If your site overrides the same block renderers, those overrides take precedence.

Register `popcaseIntegration()` before `emdash()`. The integration processes completed HTML using the native plugin's page scope. This works regardless of whether Astro executes the head before its content slots. It buffers public HTML responses to determine the collection scope and add fallback links that work without JavaScript, so these responses cannot stream. Other response types and EmDash admin/API routes pass through unchanged. If your site caches full responses, the cache should wrap this integration to store the transformed HTML.

Install this native plugin through your site's dependencies and configuration. It is not available through the EmDash plugin registry. Rebuild and redeploy after installation or configuration changes.

## Configuration

```ts
popcase({
  zoom: true,
  counter: true,
  captions: true,
  labels: { Close: "Close viewer" },
});
```

Zoom, the image counter, and captions are enabled by default. Interface labels use English regardless of the page language. Use `labels` to override individual strings, including `Open image`, `Close`, `Next`, `Previous`, `Zoom in`, and `Zoom out`.

Navigate with a mouse, keyboard, or touch. The viewer stops at the first and last image and restores focus when closed. Each image uses the caption from its placement in the content, keeping alternative text separate. Repeated images keep their own positions in the group. You can also enable a thumbnail strip at the bottom of the viewer to navigate within that group. The viewer has no download, browser fullscreen, or slideshow controls.

## Admin settings

Open Popcase in the admin sidebar, or visit `/_emdash/admin/plugins/popcase/settings`. Managing these settings requires `plugins:manage`. The page uses English and lists every registered content type, including hidden types and types without their own routes.

- The "Enable all content types" checkbox is checked by default, including on sites with no saved settings. This includes future content types. In this mode, the individual checkboxes are checked and disabled.
- Uncheck "Enable all content types" to choose types individually. The selection starts empty. New types stay disabled until you select them.
- Click "Save settings" to apply the selection to existing and new content. Saving an empty selection disables Popcase everywhere.
- Saving with all types enabled stores `{ mode: "all", thumbnails: false }` (or `true` when enabled) under the plugin-scoped `contentTypes` setting. Selected mode stores `{ mode: "selected", collections: [...], thumbnails: false }` (or `true`). Switching back to selected mode does not restore earlier selections.

The "Enable thumbnails" checkbox is off by default. Check it and click "Save settings" to show clickable thumbnails at the bottom of the viewer. Popcase saves this preference as a boolean `thumbnails` field alongside `mode` and `collections` in the same plugin-scoped `contentTypes` record. Both settings apply together. Existing records without this field keep thumbnails disabled. Thumbnail assets load when you first open the viewer.

The viewer preloads up to two images before and after the current image. The thumbnail strip uses the same range: in a group of three images, all three thumbnails are included even when you open the first or last image. How many thumbnails are visible also depends on the screen width.

The former `collections` factory option has been removed. After upgrading, sites with no saved admin settings enable all content types, including types excluded by an earlier code configuration. Use the admin page to choose which types use Popcase. Viewer options such as zoom stay in project configuration.

Popcase reads settings each time it renders an eligible page and does not cache them locally. If your site caches full pages or prerenders HTML, invalidate the cache or rebuild those pages after changing settings. Selecting a content type does not add routes or change which kinds of images Popcase supports.

## Using a different image in the viewer

An unlinked image opens its own source. To open a different image, insert the preview in the editor and set its "Link URL" to the viewer image's public URL. Enter the URL directly; the editor has no second media picker.

Popcase opens links with a supported image-file extension in the viewer. It also accepts extensionless URLs that match an image reference known to the rendered block. Ordinary page links and destinations it cannot identify keep their normal navigation. Popcase does not probe arbitrary URLs. If it cannot identify an external service's extensionless address, use a direct image URL with a supported extension.

You can link the images the same way in inline HTML:

```html
<a href="/images/full.jpg">
  <img src="/images/preview.jpg" alt="Image description">
</a>
```

Choose the HTML block's "Inline" mode. Standard HTML sanitization still applies. Popcase does not include content inside isolated iframes.

Popcase supports local media and saved direct image URLs. Provider-specific assets without an explicit source URL keep their normal rendering. Popcase does not guess a provider's master-image address, generate derivatives, or change stored content.

## Supported content and limitations

Choose content types in the Popcase admin settings. Popcase excludes featured images, listing cards, avatars, cover backgrounds, isolated iframes, and arbitrary third-party blocks. It leaves frontend visual editing and the backend editor unchanged.

Popcase keeps the core image and gallery rendering and wraps otherwise unlinked images in fallback links. If your theme's selectors expect images to be direct children of figures, check them after installation. Viewer entry points use `a[data-popcase]`, and viewer styles are scoped to `.popcase-viewer`.

## Development

Use Node.js 24+ and pnpm 12. The `example/` site is self-contained and uses generated diagram fixtures, its own SQLite database, and its own uploads directory. It does not access another site's content or credentials.

```sh
pnpm install
pnpm build          # Compile server code and generate declarations
pnpm build:example  # Build the example site
pnpm test
pnpm typecheck
pnpm dev
pnpm test:package
```

The server logic, tests, verification scripts, and example configuration use TypeScript. Astro templates use `.astro`, and React components use `.tsx`.

`pnpm build` compiles the server entry and middleware from `src/` into `dist/`. It produces JavaScript, type declarations, and source maps. The package root and middleware exports point to these compiled files. The build generates declarations from the implementation, so you do not need to maintain `index.d.ts` by hand.

The host compiles the Astro renderers, native React admin entry, and browser client from their separate TypeScript/Astro source entry points. Include both `dist` and `src` in the package; consuming sites do not need local source aliases. `prepack` builds the server before normal package creation. `pnpm dev` builds it before starting the example. If you change server code while a linked host is running, run `pnpm build` again.

`pnpm test` builds the server, then uses Node.js 24's TypeScript support to run the test sources against that compiled output. `pnpm typecheck` compiles the server with strict checking and uses Astro's checker for TypeScript, React, Astro components, tests, and verification scripts.

`pnpm test:package` creates a tarball and checks its file list, then installs it in a fresh temporary consumer. It verifies the public TypeScript declarations and builds the consumer. HTTP checks cover image enhancement and confirm that new content types are enabled by default. The script removes the temporary consumer afterward. CI runs this verification along with unit tests and type checks, but does not publish the package.

The example runs at `/` and supports `?case=single`, `?case=new-type`, `?case=excluded`, `?case=nojs`, and `?case=fail`. No-JavaScript and failed-module scenarios use a test-only content security policy; the failed-module scenario is intended for a production build.

To create a temporary consumer that stays on disk for manual inspection:

```sh
pnpm build
npm pack --ignore-scripts --pack-destination /tmp
node test/prepare-host.ts /tmp/emdash-popcase-0.1.0.tgz
```

Install dependencies and run `pnpm dev` or `pnpm build` in the printed directory.

## Using a local checkout

Before the first npm release, a sibling site can use `"emdash-popcase": "link:../emdash-popcase"` in its dependencies. Run `pnpm install` and `pnpm build` in this plugin repository first, then install dependencies in the site. After publishing, replace the link with a registry version, for example `pnpm add emdash-popcase@0.1.0`.

## Manual release

The npm package name is `emdash-popcase`, and the EmDash plugin ID is `popcase`. Publish this native plugin through npm. The sandboxed EmDash registry does not distribute it.

Before the first publication, set `repository`, `homepage`, and `bugs` in `package.json` to the real public repository, confirm the package version, and log in to your npm account. No remote or publisher account is configured by this repository.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm test:package
npm pack --dry-run
npm publish --access public
```

`npm publish` also runs the verification suite through `prepublishOnly`. Commit and tag the verified release yourself before pushing. Source code is licensed under MIT; dependencies retain their own licenses.
