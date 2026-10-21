# emdash-popcase

A native EmDash plugin for viewing body images with [Yet Another React Lightbox](https://yet-another-react-lightbox.com/).

Existing image and gallery blocks gain click-to-open viewing without resaving entries. Each content page has one ordered viewing group, including supported column images and linked images in inline HTML. Viewer code and styles load on the first click; normal image links remain usable without JavaScript.

## Installation

Install the package alongside EmDash 1.3.1+, Astro 7, React, and React DOM. The host must have `@astrojs/react` configured so it can compile the packaged React client.

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

The theme must render `EmDashHead` with the content page context and collection. The blog template already does this. Body content must use `PortableText` from `emdash/ui`; explicit host overrides of the same block renderers take precedence.

Register `popcaseIntegration()` before `emdash()`. It processes the completed HTML using the native plugin's page scope, so it does not depend on Astro executing the head before its content slots. Processing buffers public HTML responses, trading HTML streaming for correct collection scope and working fallback links without JavaScript. Other response types and EmDash admin/API routes pass through. A host's full-response cache should wrap this integration so it stores the final transformed HTML.

Native plugins install through site dependencies and configuration, rather than the EmDash plugin registry. Rebuild and redeploy after installation or configuration changes.

## Configuration

```ts
popcase({
  zoom: true,
  counter: true,
  captions: true,
  labels: { Close: "Close viewer" },
});
```

All three viewer features default to enabled. Interface labels use English regardless of the page language. `labels` overrides individual strings, including `Open image`, `Close`, `Next`, `Previous`, `Zoom in`, and `Zoom out`.

The viewer stops at the first and last image, supports mouse, keyboard, and touch navigation, and restores focus on close. Captions come from the image's use in the content; alternative text is not shown as a caption. Repeated uses of a source remain separate positions. Optional thumbnail strips appear at the bottom of the viewer and navigate within the same viewing group. Downloads, browser fullscreen, and slideshows are not included.

## Admin settings

Open **Popcase** in the admin sidebar, or visit `/_emdash/admin/plugins/popcase/settings`. Managing these settings requires `plugins:manage`. The page uses English and lists every registered content type, including hidden types and types without their own routes.

- **Enable all content types** is checked by default, including on sites with no saved settings. It also enables future content types. Individual checkboxes are checked and disabled in this mode.
- Uncheck **Enable all content types** to choose types individually. The selection starts empty, and newly created types remain disabled until explicitly selected.
- Click **Save settings** to apply the selection to existing and new content. Saving an empty selection disables Popcase everywhere.
- Saving all-types mode stores `{ mode: "all", thumbnails: false }` (or `true` when enabled) under the plugin-scoped `contentTypes` setting. Selected mode stores `{ mode: "selected", collections: [...], thumbnails: false }` (or `true`). Switching back to selected mode does not restore earlier selections.

**Enable thumbnails** is off by default. Enable it and click **Save settings** to show clickable thumbnails at the bottom of the viewer. This preference is saved as a boolean `thumbnails` field alongside `mode` and `collections` in the same plugin-scoped `contentTypes` record, so both settings are applied together. Existing records without this field keep thumbnails disabled. Thumbnail assets load with the viewer on the first open interaction.

The viewer preloads up to two images on each side of the current image. The thumbnail strip uses the same range, so a three-image group includes all three thumbnails even when opening the first or last image. The visible thumbnails also depend on the available screen width.

The former `collections` factory option has been removed and no longer controls eligibility. **Upgrade behavior:** sites with no saved admin settings now enable all content types, even if an earlier code configuration excluded them. Use the admin page to restrict the scope. Viewer options such as zoom remain in project configuration.

Settings are read on each eligible page render without a plugin-local cache. Sites with full-page caches or prerendered HTML must invalidate that cache or rebuild those pages for changed settings to appear. Selecting a type does not add routes or expand Popcase's supported image rendering scope.

## A separate preview and viewer image

An unlinked image opens its own source. To open a different image, insert the preview with the normal editor and set its **Link URL** to the viewer image's public URL. The existing editor accepts a URL; it does not provide a second media picker.

Links with a supported image-file extension are viewer destinations. Extensionless URLs are accepted when they match an image reference known to the rendered block. Ordinary page links and ambiguous destinations keep normal navigation. No arbitrary URL probing is performed. Use a direct image URL with a supported extension when an external service's extensionless address cannot be identified.

Inline HTML supports the same association:

```html
<a href="/images/full.jpg">
  <img src="/images/preview.jpg" alt="Image description">
</a>
```

Choose the HTML block's **Inline** mode. Its standard sanitization remains in place. Isolated iframe content is not included.

Local media and saved direct image URLs are supported. A provider-specific asset with no explicit source URL retains its normal rendering. Popcase does not guess provider master-image addresses, generate derivatives, or alter stored content.

## Boundaries

Content types are controlled by the Popcase admin settings. Featured images, listing cards, avatars, cover backgrounds, isolated iframes, and arbitrary third-party blocks are excluded. Visual editing keeps its editing behavior; the backend editor is unchanged.

The plugin preserves core image and gallery rendering and adds fallback links around otherwise unlinked images. Check structural theme selectors if your theme relies on images being direct children of figures. `a[data-popcase]` is the viewer entry-point selector; viewer styles are scoped to `.popcase-viewer`.

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

All maintained code uses TypeScript, including server logic, tests, verification scripts, and the example configuration. Astro templates remain `.astro`, and React components use `.tsx`.

`pnpm build` compiles the server entry and middleware from `src/` into `dist/`, generating JavaScript, declarations, and source maps. The package root and middleware exports resolve to those compiled files. Type declarations are generated from the implementation; there is no manually maintained `index.d.ts`.

Astro renderers, the native React admin entry, and browser client source remain separate TypeScript/Astro source entrypoints compiled by the host. The packed artifact must include both `dist` and `src`; no local source aliases are required by consumers. `prepack` builds the server before normal package creation, and `pnpm dev` builds it before starting the example. Run `pnpm build` again after server-side source changes while a linked host is running.

`pnpm test` builds the server and uses Node.js 24's TypeScript support to run the test sources against compiled server output. `pnpm typecheck` strictly compiles the server and checks TypeScript, React, Astro components, tests, and verification scripts with Astro's checker.

`pnpm test:package` packs the package, checks its file list, installs the tarball in a fresh temporary consumer, verifies its public TypeScript declarations, builds it, and checks image enhancement and default enablement of new content types over HTTP. It removes the temporary consumer afterward. CI runs this verification together with unit tests and type checks; it never publishes.

The example runs at `/` and supports `?case=single`, `?case=new-type`, `?case=excluded`, `?case=nojs`, and `?case=fail`. No-JavaScript and failed-module scenarios use a test-only content security policy; the failed-module scenario is intended for a production build.

For a retained consumer to inspect manually:

```sh
pnpm build
npm pack --ignore-scripts --pack-destination /tmp
node test/prepare-host.ts /tmp/emdash-popcase-0.1.0.tgz
```

Install dependencies and run `pnpm dev` or `pnpm build` in the printed directory.

## Using a local checkout

Before the first npm release, a sibling site can use `"emdash-popcase": "link:../emdash-popcase"` in its dependencies. Run `pnpm install` and `pnpm build` in this plugin repository first, then install dependencies in the site. After publishing, replace the link with a registry version, for example `pnpm add emdash-popcase@0.1.0`.

## Manual release

The npm package name is `emdash-popcase`; the EmDash plugin ID remains `popcase`. This is a native plugin distributed through npm, not the sandboxed EmDash registry.

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
