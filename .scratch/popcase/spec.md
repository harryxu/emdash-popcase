# Popcase

Status: Implemented as native plugin `popcase` 0.1.0, distributed in the npm package `emdash-popcase`.

Repository context updated on 2026-10-20 after extraction into `emdash-popcase`. See [validation.md](./validation.md) for the historical verification before extraction; use the current [README](../../README.md#development) for independent validation commands.

## Goal

Build `popcase`, a reusable native EmDash plugin that opens body images in Yet Another React Lightbox. Use `popcase` as the plugin ID and `emdash-popcase` as the repository and npm package name. Existing published content must gain the feature without editing or resaving entries. The self-contained `example/` site is the development host; packed-package verification creates a fresh temporary consumer with synthetic media. The original blog is a separate consumer.

Use the terminology in [GLOSSARY.md](../../GLOSSARY.md). Distribution and image-link semantics are recorded in [ADR-0001](../../docs/adr/0001-distribute-image-viewer-as-native-plugin.md) and [ADR-0002](../../docs/adr/0002-use-image-links-for-viewer-image-overrides.md).

## Installation and configuration

- Distribute a reusable native plugin package, installed as a site dependency, registered in the EmDash configuration, and enabled by redeploying.
- Register the companion `popcaseIntegration()` before the EmDash Astro integration. It completes server-rendered fallback links after page scope is known; public HTML is buffered rather than streamed. See [ADR-0003](../../docs/adr/0003-enhance-fallback-links-after-page-rendering.md).
- Provide an admin settings page for content type eligibility. Default to all content types, including future types, and disable individual checkboxes while all-types mode is selected.
- Unchecking all-types mode starts with an empty explicit selection. New types remain disabled in selected mode. Switching modes discards the previous selection; save explicitly to apply changes to existing and new content.
- Store one plugin-scoped `contentTypes` value: `{ mode: "all", thumbnails: false, videoAutoplay: true }` or `{ mode: "selected", collections: [...], thumbnails: false, videoAutoplay: true }`. An empty selection disables Popcase everywhere. Enumerate all registered types, including hidden and non-routable types.
- Add an English "Autoplay videos" checkbox under "Video playback" in admin settings, enabled by default. Save `videoAutoplay` atomically with thumbnails and content type eligibility; absent legacy fields default to true and non-boolean values are rejected. Apply the flag to both direct video files and YouTube on opening and navigation, retaining manual controls when disabled. Only an explicit Save applies changes; cached/prerendered pages need invalidation or regeneration. Existing inline players are unaffected.
- Replace the former `collections` factory option. Sites without saved settings default to all types, including those excluded by older project configuration. Read settings on each eligible page render; externally cached or prerendered HTML requires cache invalidation or regeneration.
- Make zoom, image count, and captions individually configurable, enabled by default.
- Use English interface labels in the admin settings page and public viewer regardless of the page or administrator language. Allow viewer label configuration overrides.
- Preserve the host's server rendering, image layout, and light/dark presentation. Keep theme changes out of the plugin's installation requirements.
- Render the image viewer with a dark, partially transparent backdrop in both site themes and light controls. Preview links use the normal link pointer. These presentation choices were confirmed on 2026-10-20 and supersede the original theme-following overlay.

## Content scope

### YouTube links (2026-10-23)

Extend the direct-video scope below to ordinary text/image links for single YouTube videos: exact `youtube.com`, `www.youtube.com`, or `m.youtube.com` hosts with `/watch?v=VIDEO_ID` or `/shorts/VIDEO_ID`, and `youtu.be/VIDEO_ID`. Validate video IDs; do not classify lookalike hosts, credential-bearing URLs, playlists without a video, channel/live entry points, `/live/` or `/embed/` URLs. Existing iframes remain unchanged. Detection uses the entire eligible completed page, including header/footer, retaining download and editing exclusions. No additional setting or editor markup is required. This supersedes the YouTube portion of the video-site exclusion below; see [ADR-0005](../../docs/adr/0005-open-youtube-links-with-on-demand-embeds.md).

YouTube occurrences join images and direct videos in document order, retaining repeated placements and finite boundaries. Load a privacy-enhanced `youtube-nocookie.com` iframe only for the current, open slide, removing it on navigation or dismissal. Do not connect, preconnect, fetch provider metadata, or preload neighboring players. Attempt inline audible autoplay when the saved video autoplay setting is enabled, retaining manual controls when disabled or blocked, and disable fullscreen. Reopening starts again at the link's offset. Accept nonnegative integer seconds and h/m/s forms from query/fragment `t` and `start`; ignore other player/list parameters while retaining the complete original destination.

Use author-provided images for thumbnails, otherwise a generic play icon. Preserve figure captions and use alt/link text for accessible naming; do not fetch titles or thumbnail images. Fit regular players at 16:9 and Shorts at 9:16 without cropping. Reserve clearance below the top toolbar and increase surrounding insets on larger windows, limiting the player to 1280px wide. On portrait phones (coarse primary pointer, up to 767px wide), fill the screen width without horizontal gutters and derive height from the aspect ratio; allow vertical scrolling when a tall player exceeds its available area. Do not display an additional `Open on YouTube` link outside the player (revised on 2026-10-23). Keep provider error UI without automatic redirects. Preserve modified-click, no-JavaScript and failed-viewer navigation. Retain the origin referrer required by YouTube; document host CSP requirements and that privacy-enhanced mode still contacts a third party.

Keep close/navigation controls accessible outside the iframe and restore trigger focus on dismissal. Parent Escape/arrow handling applies when focus is outside the cross-origin player; inside it YouTube owns keyboard events. Verify lazy loading, mixed navigation, player removal on close/switch, fallback, thumbnails, viewport fitting, and focus behavior in available browsers, recording network/browser gaps honestly.

### Direct video links (2026-10-22)

On eligible content detail pages, enhance image links and text links whose URL pathname ends in `.mp4`, `.webm`, or `.ogv`. Preserve URL queries and fragments, fallback links, modified-click navigation, and placement order. Images provide posters without assigning image dimensions to videos. Mixed image/video groups retain repeated occurrences. Inject the bootstrap independently of image renderers so text-only content works.

Video link enhancement applies across the completed eligible page; image enhancement remains restricted to supported body blocks. This supersedes image-only destination exclusions below for confirmed direct video links. See [ADR-0004](../../docs/adr/0004-open-direct-video-links-in-the-viewer.md).

Native `/video` blocks keep inline playback. Video-site links, extensionless URLs, streaming manifests, download links, and visual editing are excluded. Use the YARL Video plugin with controls, inline playback, autoplay with sound when opened or navigated to if the saved video autoplay setting is enabled, and no video preloading before opening the viewer. Retain manual playback controls when the browser blocks autoplay. Do not introduce editor blocks, core editor fields, URL probes, or transcoding.

Enhance body images on eligible content detail pages of any content type. Support standard image blocks, gallery blocks, images nested inside columns, and linked preview images in inline HTML blocks.

Exclude listing cards, featured/cover images, cover backgrounds, author avatars, isolated HTML iframes, and arbitrary blocks contributed by other plugins. Add no album collection, album management screen, editor block, or shortcode parser.

Disable enhancement in frontend visual editing and do not add a backend editor preview. Ordinary draft preview and visual editing are distinct states; the editing interaction is the exclusion.

## Preview images and viewer images

- An unlinked body image opens its own source image.
- Preserve responsive preview rendering; do not use a displayed thumbnail or `currentSrc` as the assumed full-resolution source.
- Authors may insert a separately prepared preview image and use the existing image Link URL to select a different viewer image.
- A link confirmed to address an image resource opens that resource in the viewer and participates in the viewing group.
- A link to an ordinary page, or a destination whose image type cannot be established, keeps its normal navigation and is excluded from the viewing group.
- Use actual viewer-image dimensions to bound zoom. Preview dimensions are not viewer dimensions when the resources differ; unknown dimensions must not be invented.
- Do not add image generation, transformation, or storage services.

Support local EmDash media and ordinary direct image URLs. Resolve storage/public URLs using supported interfaces. For third-party media providers without an explicit usable source URL, preserve existing rendering rather than guessing a master-image URL. An explicit supported image destination remains usable as an override.

Image destination recognition must be conservative and tested against local media routes, ordinary direct URLs, non-image links, and ambiguous destinations. Do not introduce broad server-side URL probing or private EmDash imports merely to classify arbitrary destinations.

The existing editor supports manually entering a link URL; it does not provide a second media picker. Inline HTML may express the same association:

```html
<a href="/images/full.jpg">
  <img src="/images/preview.jpg" alt="Image description">
</a>
```

Keep the core HTML sanitization behavior. An isolated HTML block is not part of the document's viewing group.

## Viewing groups and interaction

- One viewing group per content page, ordered by body placement, including gallery and supported nested images.
- Treat repeated appearances of the same source as separate positions; do not deduplicate by URL.
- Open at the selected occurrence.
- Stop at the first and last images rather than wrapping.
- Hide navigation controls for a single-image group.
- Support navigation buttons, keyboard navigation, and touch swipes. Hide previous/next arrow buttons for coarse primary pointers, retaining mouse-device arrows and touch swipes. YouTube player surroundings must pass swipe gestures through to the viewer; interaction inside the iframe belongs to YouTube.
- Support zoom controls, double-click/double-tap, pinch zoom, and panning when enlarged.
- Close with the close control, Escape, or a click on the backdrop. Clicking the image itself must remain available for zoom interaction.
- Show the position/count and the caption stored at that content placement. Keep alternative text separate; do not substitute it as a visible caption.
- Provide keyboard-operable image entry points, contained dialog focus, and focus restoration to the originating entry point on close.
- Provide an admin-controlled thumbnail strip at the bottom of the viewer, disabled by default. Save a boolean `thumbnails` alongside content type eligibility in the existing `contentTypes` record; legacy records default to disabled. Saving both preferences is atomic. Thumbnails navigate the same ordered viewing group and load only after opening the viewer.
- Exclude downloads, slideshows, and browser fullscreen controls.

## Loading and failure behavior

- Keep body content server-rendered and readable independently of React.
- Load the Lightbox implementation on the first open interaction. The pre-interaction bootstrap must remain small; verify production asset loading rather than assuming a dynamic import is sufficient.
- Preload only a bounded set of neighboring viewer images after opening.
- Preserve a normal link to the viewer image when JavaScript is unavailable or the viewer module fails to load. A failed dynamic import must not swallow the reader's click without fallback.
- Keep ordinary linked-image navigation intact, including native modified-click behavior.
- A failed viewer-image request must leave the viewer closable and allow navigation to other images.

## Integration approach and known constraints

Use native Portable Text rendering extensions and preserve the core image/gallery rendering wherever practical. The host already has EmDash page contribution insertion points, so changing its base template is unnecessary.

Verified against installed EmDash 1.3.1:

- Plugin `blockComponents` are merged into regular Portable Text rendering. Explicit host renderer overrides take precedence.
- Nested columns do not automatically use that same renderer map; they require explicit adaptation to meet the agreed scope.
- A `componentsEntry` is statically imported and does not receive plugin factory options. Explicitly connect configuration and page/collection scope to rendering; do not assume options are injected.
- Core image components do not transparently forward arbitrary metadata attributes. Supply viewer metadata without breaking existing image/caption layout or structural CSS selectors.
- Public media APIs do not expose one universal master-image resolver for all third-party providers.
- Core image editor conversions retain known fields; adding a custom top-level viewer-source field would not be a reliable persistence strategy.
- Visual editing may bypass normal block renderers. Use editor-state checks and plugin-owned markers rather than a global image click handler.

The plugin's Astro renderers and client entry must be compiled by the host. Validate a packed installation, browser imports, dynamic React/Lightbox chunks, and stylesheet delivery in a production build before expanding the integration. Do not rely on raw page fragments automatically bundling npm imports.

## Acceptance and verification

1. A packed plugin installs and builds in a fresh independent consumer without private EmDash imports or base-template changes. Production JavaScript and CSS assets return successfully. Verification uses the repository's example and synthetic media rather than a sibling site's database or uploads.
2. Existing post/page fixtures work without resaving. Standard, gallery, column, and inline-HTML images enter the same ordered group; excluded images remain unaffected.
3. Selecting an occurrence opens the right index, including repeated URLs. Single-image groups and first/last boundaries behave as specified.
4. Local source images, separate preview/viewer images, direct external images, ordinary navigation links, and ambiguous links follow the specified source and exclusion rules.
5. Keyboard opening, navigation, zoom, dismissal, focus restoration, and mobile touch interaction work. English labels and configuration overrides are observable regardless of the page language.
6. No-JavaScript and simulated module-load failure preserve image-link fallback. A broken image cannot trap the reader in the overlay.
7. Visual editing retains editing clicks. Saved content type eligibility and the three feature switches take effect.
8. Desktop/mobile and light/dark visual checks preserve the host's figure layout, captions, article rails, and reading flow. Check current Chromium, Firefox, and Safari behavior, including a mobile/touch viewport.
9. The admin settings page lists all registered content types, defaults to all-types mode, disables individual checkboxes in that mode, clears selections when switching to selected mode, and persists only on explicit save. Empty selected mode disables all types; new types are enabled only in all-types mode. Invalid settings are rejected, and the private settings route requires `plugins:manage` and host CSRF protections.

Use focused behavioral tests for grouping, URL classification, and source selection, plus browser checks for integration and accessibility. Run `pnpm test`, `pnpm typecheck`, and `pnpm test:package`; the last command builds the isolated consumer and verifies its HTTP output. Report actual browser/tool coverage and any unverified environment explicitly.

## Sources

- [Yet Another React Lightbox](https://github.com/igordanchenko/yet-another-react-lightbox)
- [Lightbox API](https://yet-another-react-lightbox.com/documentation)
- [Lightbox plugins](https://yet-another-react-lightbox.com/plugins)
- [EmDash native plugin distribution](https://docs.emdashcms.com/plugins/creating-native-plugins/distributing/)
- [EmDash Portable Text rendering components](https://docs.emdashcms.com/plugins/creating-native-plugins/portable-text-components/)
- [EmDash content editing and HTML blocks](https://docs.emdashcms.com/guides/working-with-content/)
- [EmDash media library](https://docs.emdashcms.com/guides/media-library/)
- [EmDash preview and visual editing](https://docs.emdashcms.com/guides/preview/)
- [Astro client scripts](https://docs.astro.build/en/guides/client-side-scripts/)
