# Photo information in Popcase

Status: Implemented

## Goal

Add a photographer-oriented EXIF display plugin for Yet Another React Lightbox (YARL), exported from `emdash-popcase` and integrated into Popcase. Use Lucide icons for the new interface.

The maintainer confirmed all three interview rounds and authorized implementation on 2026-10-23, requesting Impeccable UI refinement.

## Confirmed decisions

Confirmed by the maintainer on 2026-10-23:

- Provide a separately importable, reusable YARL plugin within the existing package, and integrate it into Popcase. A separate npm package is not required.
- The display plugin receives normalized photo information. Popcase is responsible for acquiring data in its EmDash integration. See [ADR-0006](../../docs/adr/0006-separate-photo-information-display-from-emdash.md).
- Photo information belongs to the current viewer image. When a linked viewer image differs from its preview, never use the preview's EXIF to fill missing information.
- The first release displays camera model, lens model, focal length, aperture, shutter speed, ISO sensitivity, and capture time. Omit individual missing fields.
- Do not display GPS coordinates, camera or lens serial numbers, author information, or copyright information in the first release.
- Use Lucide React icons for the new interface.

### Acquisition and caching

Confirmed in the second interview round on 2026-10-23:

- Popcase automatically reads EXIF in the browser only when the reader first expands photo information for the current viewer image. Existing content does not need editing or resaving.
- Read the actual viewer-image URL, preserving its query parameters. Do not read preview images, responsive preview variants, or a guessed original-image resource instead.
- Cache results only for the current viewer session. Do not persist a URL-keyed cache across sessions.
- Cross-origin access requires the image host to allow browser reads. The host site's CSP can also restrict these requests. Document both deployment requirements.
- An inaccessible image or an image without retained EXIF may have no available photo information. Do not introduce a server-side proxy to bypass this limitation.

### Visibility and navigation

- Provide a Lucide information button in the viewer toolbar. The panel starts collapsed on each viewer opening; displaying an image alone does not initiate EXIF extraction.
- Use a right-side information panel on desktop and a bottom information panel on phones. Give the photograph, captions, and thumbnail strip clear display regions.
- Show field icons together with English field names and formatted values. Do not require readers to identify fields by icons alone.
- Keep the reader's expanded/collapsed preference while navigating within the same viewer session, updating information for the current image.
- Hide photo information on direct-video and YouTube slides without losing that preference; restore it on returning to an image.
- Closing and reopening the viewer resets the panel to collapsed and starts a new cache session.

### Administration

- Add an English `Show photo information` admin setting, enabled by default.
- Disabling this setting removes the public feature. Enabling it still leaves the panel collapsed until the reader opens it.

### Formats and reading limits

Confirmed in the third interview round on 2026-10-23:

- Support EXIF in JPEG, PNG, WebP, and AVIF viewer images. RAW file parsing is outside the first release.
- Retain the information button on image slides even when no information is known yet. Its panel distinguishes loading, empty information, unsupported format, and failed reads.
- Limit each read attempt to 10 seconds of waiting and at most 8 MiB of image data accepted for processing. Count bytes while reading and cancel the response when the limit is reached; do not rely on Content-Length or a parser's chunk settings alone.
- A limit or timeout is a failed read, not evidence that the image has no EXIF. An incomplete buffer must not produce a false empty-information result.
- Cancel unfinished acquisition when the active image changes, the panel collapses, or the viewer closes. Discard stale results even if an asynchronous operation cannot be cancelled.
- Offer manual retry after a failed read. Do not automatically loop failed requests. Extraction failure must not affect viewing, navigation, dismissal, or the original image-link fallback.

### Display conventions

- Display actual focal length, such as `50 mm`, rather than substituting 35 mm-equivalent focal length.
- Use photographer-oriented values such as `f/1.8`, `1/250 s`, and `ISO 400`. Preserve meaningful fractional-second and long-exposure values rather than forcing all exposure times into reciprocal notation.
- Keep camera and lens names, removing duplicated brand prefixes only. Do not infer a model from a filename or another photograph.
- Show capture time as the camera recorded it, formatted like `2026-10-23 15:04:05`. Append a recorded timezone offset when present; otherwise identify it as `Camera time`. Do not silently convert through the reader's timezone or invent a UTC instant.
- Omit unavailable individual fields. If none of the seven fields are usable after a complete, successful parse, show the empty-information state.

### Public plugin contract

- Export the reusable display plugin from `emdash-popcase/exif` and provide a separately importable stylesheet at `emdash-popcase/exif.css`.
- Provide TypeScript types for normalized photo information and the loading contract. The seven fields describe camera, lens, actual focal length, aperture, exposure time, ISO sensitivity, and capture time with an optional recorded timezone offset.
- Support photo information supplied directly on an image slide and an optional asynchronous loading function for slides without supplied information. Supplied information takes precedence; the display plugin does not merge it with data from another image.
- The asynchronous loader receives the current image slide and an AbortSignal, and runs only when that image's information panel is expanded. Distinguish empty information, unsupported format, and read failure in its typed result or error contract.
- The reusable display plugin does not require EmDash and does not fetch image bytes on its own. Popcase supplies the browser acquisition and parsing adapter.
- New display icons use explicit Lucide React imports. The acquisition/parser dependency stays outside the page bootstrap and is loaded on demand with the information feature.

### Keyboard and panel interaction

- Move focus into the panel when the reader explicitly expands it. Keep it within the existing lightbox focus boundary rather than introducing a nested modal dialog.
- With focus inside the panel, Escape collapses the panel and returns focus to its toolbar button. Outside the panel, preserve the existing lightbox Escape behavior.
- Provide a keyboard-operable panel close control and return focus to the information button on explicit collapse.
- Scrolling or selecting text inside the panel must not navigate slides or dismiss the lightbox.
- Keep existing image zoom, caption, thumbnail, and mixed-media interactions usable while the information panel is displayed.

## Existing constraints

Retain the [Popcase specification](../popcase/spec.md) and existing ADRs. Keep preview rendering, responsive images, captions, mixed-media navigation, and fallback links usable. Keep public and admin interface labels in English. Viewer assets load on the first open interaction.

## Design review status

All twelve product/design questions have accepted answers and final implementation authorization. The implementation uses ExifReader for parsing and Lucide React for icons, with a separate reusable display plugin and Popcase browser adapter as agreed.

## Acceptance and implementation verification

1. A consumer can import the EXIF display plugin, its stylesheet, and TypeScript types without using the EmDash plugin factory. Test the packed package in a fresh consumer; a workspace import alone is insufficient.
2. Popcase defaults the new setting to enabled for both fresh and legacy settings. Save it explicitly and atomically with existing settings, reject invalid values, and preserve the settings route's authorization and CSRF protection. Disabling it removes the public control and prevents EXIF acquisition.
3. No EXIF image-byte requests occur before the panel is expanded. No neighboring-slide extraction occurs because of carousel preloading. Repeated occurrences of the same source remain separate viewing positions while session-local acquisition results may be reused.
4. Synthetic JPEG, PNG, WebP, and AVIF fixtures cover retained EXIF and missing fields. Include an image without photography metadata, an unsupported format, malformed metadata, and a preview/viewer pair with deliberately different photography data. Use repository-owned fixtures, never a sibling site's media.
5. Confirm rational exposure formatting, actual focal length, duplicate-brand cleanup, partial information, and capture times both with and without a recorded timezone offset. Unknown or invalid individual fields do not invent values or leak excluded metadata.
6. Exercise successful reads, no-EXIF results, CORS allow/deny, CSP restrictions where the browser permits simulation, request/parse failures, timeouts, size limits, and a server that ignores Range. Prove cancellation and stale-result isolation on image change, panel collapse, viewer dismissal, and Astro page navigation. A limit failure must not render as empty information.
7. Verify session-only caching, manual retry, panel-state retention across mixed image/video navigation, and a collapsed panel with a fresh cache on reopening. Video slides initiate no EXIF extraction.
8. Check desktop right-side and phone bottom-panel layouts with captions and thumbnails both enabled and disabled. Preserve zoom, touch navigation, text selection, panel scrolling, focus containment/restoration, and the agreed Escape behavior. Verify English labels, accessible control names, decorative icon semantics, and visible keyboard focus.
9. Preserve no-JavaScript and failed-viewer fallback links. An information-only failure must not trigger navigation away from the page or break image display.
10. Run `pnpm test`, `pnpm typecheck`, and `pnpm test:package`. Inspect production asset loading and available desktop/mobile browser behavior. Record only checks actually performed, note browser/environment gaps, and stop development servers started for verification.

## Implementation outline

1. Implement normalized information types, field validation/formatting, and the reusable YARL display module with its stylesheet and public exports.
2. Implement Popcase's cancellable browser adapter, format parsing, result states, session cache, and on-demand parser loading.
3. Wire the saved setting through the existing native descriptor, completed-page configuration, bootstrap, and viewer without changing the established rendering boundaries.
4. Add synthetic photography fixtures and focused behavioral/consumer coverage, then perform the acceptance checks above and document actual results.

## Verified facts

- YARL provides custom module, toolbar, current-slide, and slide-type extension APIs; its bundled official plugins do not include EXIF.
- The current Popcase pipeline carries image URLs, dimensions, alt text, and captions, but no normalized photography information.
- EmDash media metadata APIs expose dimensions, alt text, caption, and crop focal points; these crop points are not photographic focal length. The documented media hooks and byte-reading APIs are possible integration building blocks, not an existing EXIF pipeline.
- A parser's range/chunk options alone do not establish a hard network-read budget. The acquisition adapter must be assessed separately for cancellation, response limits, and servers that ignore Range requests.
- ExifReader provides browser support, JPEG/PNG/WebP/AVIF EXIF parsing, and an ArrayBuffer input API. The installed parser receives independently acquired, bounded bytes and an explicit photography tag allowlist.
- Camera capture time can lack a timezone offset. Display semantics must not silently interpret such values in the reader's local timezone or invent a UTC instant.
- A bounded partial image may omit metadata stored later in the file. A truncated read must not be treated as proof that the image has no EXIF.

## Sources

- [YARL plugins](https://yet-another-react-lightbox.com/plugins)
- [YARL Advanced API](https://yet-another-react-lightbox.com/advanced)
- [Lucide React](https://lucide.dev/guide/react)
- [EmDash media capabilities](https://docs.emdashcms.com/plugins/creating-plugins/capabilities/)
- [EmDash media hooks](https://docs.emdashcms.com/reference/hooks/)
- [ExifReader formats and API](https://github.com/mattiasw/ExifReader)

## Validation

See [validation.md](./validation.md) for checks performed on this checkout on 2026-10-23 and the remaining environment gaps.
