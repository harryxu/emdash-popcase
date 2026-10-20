# emdash-popcase

A native EmDash plugin for viewing body images with [Yet Another React Lightbox](https://yet-another-react-lightbox.com/).

Existing image and gallery blocks gain click-to-open viewing without resaving entries. Each content page has one ordered viewing group, including supported column images and linked images in inline HTML. Viewer code and styles load on the first click; normal image links remain usable without JavaScript.

## Installation

Install the package alongside EmDash 1.3.1+, Astro 7, React, and React DOM. The host must have `@astrojs/react` configured so it can compile the packaged React client.

```sh
pnpm add emdash-popcase
```

```js
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

```js
popcase({
  collections: ["posts", "pages"],
  zoom: true,
  counter: true,
  captions: true,
  labels: { Close: "Close viewer" },
});
```

All three features default to enabled. `collections: []` disables enhancement. Labels follow the page's `lang`: Chinese for `zh` locales and English otherwise. `labels` overrides individual strings, including `Open image`, `Close`, `Next`, `Previous`, `Zoom in`, and `Zoom out`.

The viewer stops at the first and last image, supports mouse, keyboard, and touch navigation, and restores focus on close. Captions come from the image's use in the content; alternative text is not shown as a caption. Repeated uses of a source remain separate positions. Thumbnail strips, downloads, browser fullscreen, and slideshows are not included.

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

Only content collections selected in configuration are enhanced. Featured images, listing cards, avatars, cover backgrounds, isolated iframes, and arbitrary third-party blocks are excluded. Visual editing keeps its editing behavior; the backend editor is unchanged.

The plugin preserves core image and gallery rendering and adds fallback links around otherwise unlinked images. Check structural theme selectors if your theme relies on images being direct children of figures. `a[data-popcase]` is the viewer entry-point selector; viewer styles are scoped to `.popcase-viewer`.

## Development

Use Node.js 24+ and pnpm 12. The `example/` site is self-contained and uses generated diagram fixtures, its own SQLite database, and its own uploads directory. It does not access another site's content or credentials.

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm dev
pnpm test:package
```

The package ships server JavaScript and type declarations, Astro renderers, and client source for compilation by the host. The packed artifact must include `src`; no local source aliases are required by consumers.

`pnpm test:package` packs the package, checks its file list, installs the tarball in a fresh temporary consumer, builds it, and checks image enhancement and collection exclusions over HTTP. It removes the temporary consumer afterward. CI runs this verification together with unit tests and type checks; it never publishes.

The example runs at `/` and supports `?case=single`, `?case=excluded`, `?case=nojs`, `?case=fail`, and `?lang=zh`. No-JavaScript and failed-module scenarios use a test-only content security policy; the failed-module scenario is intended for a production build.

For a retained consumer to inspect manually:

```sh
npm pack --ignore-scripts --pack-destination /tmp
node test/prepare-host.mjs /tmp/emdash-popcase-0.1.0.tgz
```

Install dependencies and run `pnpm dev` or `pnpm build` in the printed directory.

## Using a local checkout

Before the first npm release, a sibling site can use `"emdash-popcase": "link:../emdash-popcase"` in its dependencies. Run `pnpm install` in this plugin repository first, then in the site. After publishing, replace the link with a registry version, for example `pnpm add emdash-popcase@0.1.0`.

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
