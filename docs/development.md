# Development

Use Node.js 24+ and pnpm 12 with the self-contained `example/` site.

```sh
pnpm install
pnpm format         # Format source and documentation
pnpm format:check   # Check formatting without changing files
pnpm build          # Compile server code and generate declarations
pnpm build:example  # Build the example site
pnpm test
pnpm typecheck
pnpm dev
pnpm test:package
```

`pnpm test:package` installs the tarball in a temporary consumer, checks public types, builds it, and verifies rendered output over HTTP; CI also runs tests and type checks.

Use `?case=video` or `?case=youtube` for video examples, and `?case=nojs` or `?case=fail` for fallback checks; the failed-module case requires a production build.

Use `?case=exif` for synthetic photography fixtures and `/standalone-exif` to exercise the reusable plugin with supplied information, thumbnails, and zoom. Fixture provenance and regeneration instructions are in `example/public/__popcase-images/PHOTO-FIXTURES.md`.

Rebuild after server code changes when using a linked checkout.

## Using a local checkout

Add `"emdash-popcase": "link:../emdash-popcase"` to a sibling site's dependencies. Run `pnpm install` and `pnpm build` in this repository, then install the site's dependencies. After publishing, replace the link with a registry version, for example `pnpm add emdash-popcase@0.1.0`.
