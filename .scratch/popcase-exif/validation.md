# Photo information validation

Date: 2026-10-23

## Automated checks

- `pnpm test`: 63 tests passed. New coverage includes real synthetic JPEG/PNG/WebP/AVIF EXIF, empty and truncated data, rational exposure formatting, local capture time, actual viewer URL selection, read budgets, cancellation, timeout, and a real HTTP response stalled during streaming. Settings tests cover fresh/legacy defaults, atomic saves, invalid values, and completed-page configuration.
- `pnpm typecheck`: passed with zero errors, warnings, or hints.
- `NPM_CONFIG_CACHE=/tmp/popcase-npm-cache pnpm test:package`: passed. The tarball installed into a fresh temporary consumer, checked the public plugin/types, built both native and standalone examples, and returned the standalone JavaScript/CSS assets over HTTP. The temporary npm cache avoids an existing permission problem in the user's normal npm cache; no global cache permissions were changed.
- `pnpm build:example`: passed. EXIF parsing is a separate production chunk, imported by the information reader rather than the page bootstrap.
- Prettier checks and `git diff --check`: passed for the changed source and documentation.

## Browser checks

Used the Codex in-app browser against the example's production Node server, with repository-owned synthetic images.

- Expanded information displayed all seven fields, with English labels and Lucide icons.
- Navigated the four image formats and a distinct preview/viewer pair; the viewer image's camera information remained authoritative.
- Verified empty information, unsupported SVG, request failure, retry, and continued image navigation/dismissal.
- Verified panel visibility across image/video navigation, collapsed state on reopening, panel Escape versus viewer Escape, and focus restoration to the image trigger.
- Verified the standalone package entry with inline supplied information, captions, thumbnails, and working zoom controls.
- Checked desktop (logical 1440×900), phone (390×844), approximately 547×694, and the normal browser panel (778×694). The phone panel stays within 48% of the available height and scrolls independently. These are viewport-width checks, not physical touch tests.
- A temporary local verification proxy served the production HTML with a controlled cross-origin viewer image. Server request records showed only an image request before expansion; expanding added one CORS metadata read. Closing/reopening the information panel reused that session result without another metadata read.
- The same controlled origin verified allowed CORS, denied CORS, and a host `connect-src 'self'` restriction. The denied/CSP cases showed the recoverable information failure while the photograph and viewer remained available.

## UI review

- Impeccable detector returned no mechanical findings on the changed UI targets.
- A fresh Impeccable finish reviewer inspected all four final captures and the relevant source: disposition `ship`, no material fixes. Admin UI was reviewed from source only.
- The documenter checked the incumbent and new conventions and preserved the existing absence of global DESIGN.md/design.json because this is a component extension. Evidence is in `.impeccable/review/documentation-evidence.md`.
- Screenshots are local verification artifacts under `.impeccable/review/`. Viewport override captures contained exporter padding around the complete downsampled scene; cropped versions remove only that padding. The normal browser capture has no such adjustment.

## Gaps

- Firefox, Safari, physical touch/pinch, and Cloudflare deployment were not exercised.
- No authenticated admin browser save was performed; route behavior and persistence were tested through the existing handler fixture, and the new control was inspected from source.
- Rapid navigation cleanup and stale-result rejection are implemented, with actual fetch cancellation tested. A browser scenario with an intentionally uncancellable third-party loader completing after navigation was not separately exercised.
- No new no-JavaScript or viewer-module-failure browser run was performed. Existing fallback behavior is retained and covered by the repository's rendering/response regression tests.

Test services and temporary viewport overrides were stopped/reset after verification. No package publication, Git push, or tag was performed.
