# Popcase 0.1.0 verification before repository extraction

Historical record: the results below were recorded on 2026-10-20 in the original blog repository before extraction. They do not establish coverage of the current checkout. Mentions of the real database, temporary host, theme-following appearances, and `.impeccable/config.json` describe that earlier environment, not dependencies of this repository. Use the current [spec](./spec.md) for requirements and [README](../../README.md#development) for current validation commands.

Verified on 2026-10-20 against EmDash 1.3.1, Astro 7.4.0, React 19.2.4, and Node 24.19.0.

## Automated checks

- 16 behavioral tests passed: source resolution, conservative image destination recognition, provider fallback, configuration and labels, SSR link fallback, separate preview/viewer dimensions, safe caption text, group ordering and repeated sources, editor exclusion, actual collection scope, rendering-order independence, HTTP headers, and Astro cookie preservation.
- Host `astro check`: 19 files, zero errors, warnings, or hints.
- Plugin `astro check`: 18 files, zero errors, warnings, or hints.
- Production builds passed for both the real host and an isolated consumer using the extracted npm tarball rather than a workspace alias.
- `git diff --check` passed.

## Browser checks

Chromium (Codex in-app browser), desktop and mobile-sized viewports:

- The real existing `/posts/playground` entry opens its body images without resaving content.
- Standard images, gallery positions, column images, and inline HTML produce one correctly ordered group; ordinary page links and ambiguous destinations retain navigation.
- A separate preview opens the selected 3000-by-2000 viewer source, rather than its 480-by-320 preview.
- Single-image navigation buttons are absent; group boundaries stop rather than wrap.
- Chinese and English labels work. All three optional features can be disabled, and project label overrides take effect.
- Viewer styles are absent before opening and four stylesheet assets load when opened. React/Lightbox are loaded through the first-interaction dynamic module.
- Keyboard Space opens; Tab and Shift+Tab wrap between controls; Escape closes and restores the originating image's focus. The viewer uses a native modal dialog with explicit keyboard boundary handling.
- Blocking all scripts leaves an ordinary working image link. Blocking only the dynamic viewer module triggers direct-image fallback after the click.
- A failed image request leaves close and previous-image navigation available.
- Light and dark appearances were visually checked, including the configuration with zoom, counter, and captions disabled.

Firefox:

- The packed consumer opens an image with Chinese controls and caption, renders the overlay, and restores image-entry focus after Escape.
- The temporary test tab was closed afterward.

Safari was not tested because computer-control access to Safari was not approved in this environment. Physical-device pinch gestures were not tested; touch behavior uses the library's existing implementation.

## Packaging and operational limits

The package contains the server entry, public type declarations, Astro renderers, and client source; the host compiles its assets. Installation requires both `popcaseIntegration()` before EmDash and the native `popcase()` descriptor inside EmDash's `plugins` array. The completed-HTML processing buffers public HTML instead of streaming it; this is documented in ADR-0003 and the package README.

The fixture host used a read-only SQLite backup of the real development database and a separate temporary directory. No test route or fixture content was added to the actual site. No package was published.

The design hook's broken-image finding in `test/rendering.test.js` was a false positive on intentionally isolated HTML test strings. A file-scoped value ignore was recorded in `.impeccable/config.json`; production image code has no suppression. The behavior issues found during verification (eager stylesheet delivery and Tab escaping the viewer) were fixed and retested.
