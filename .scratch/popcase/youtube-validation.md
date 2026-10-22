# YouTube support validation

Date: 2026-10-23. This records checks on the current YouTube implementation, independently of the historical `validation.md`.

## Automated checks

- `pnpm test`: 47 behavioral tests passed, including exact-host/URL classification, rejected destinations, time offsets, controlled embed parameters, text/image metadata, original href/target/rel, responsive image attributes, mixed order and repeated placements, editing/download/native-player exclusions, and page eligibility.
- `pnpm typecheck`: passed with zero diagnostics.
- `NPM_CONFIG_CACHE=/tmp/npm-cache pnpm test:package`: passed. A fresh tarball consumer installed, checked public types, built, served the expected mixed and text-only YouTube metadata, included the text-only bootstrap, and emitted no server-rendered iframe. The initial attempt without the temporary npm cache failed on local cache permissions; no package code was changed to work around that environment issue.
- `pnpm build:example`: passed. Build tools report a large-chunk warning; the fresh consumer also reports an eval warning in the transitive `@acemir/cssom` dependency.
- Impeccable's mechanical detector returned no findings for the changed viewer component/styles.
- `git diff --check`: passed.

## Browser checks

Used the installed Google Chrome through bundled Playwright against the example's production build, at 1440×1000 and 390×844 with touch/mobile emulation. Provider responses were intercepted with a small test document for deterministic lifecycle and layout assertions, separately from the real-provider check below.

Confirmed no viewer-module or provider requests before interaction; no YouTube iframe or provider requests when opening an adjacent image; only the current player mounts; mixed navigation and repeated entries; 16:9 and 9:16 viewport fitting; original external-link destination; fullscreen disabled; iframe removal on switching to an image and on dismissal; Enter opening, outer Escape dismissal, trigger focus restoration; single-item navigation hidden; author-image and play-icon thumbnails; thumbnail navigation without provider preloading. Desktop/mobile screenshots were inspected after the opening animation completed. The first screenshot attempt captured the opening fade and was replaced with settled captures.

With JavaScript disabled, the original YouTube href remained usable and no iframe mounted. The production `youtube-fail` CSP fixture blocked the dynamic module, and clicking navigated to the full original URL (the destination response was intercepted).

A separate real-provider run used the public video from YouTube's official embed example. `youtube-nocookie.com/embed/M7lc1UVf-VE` returned HTTP 200; the player's video reported `currentTime: 30.020652`, `paused: false`, `muted: false`, and `readyState: 4`, confirming playback from the requested 30-second offset. The actual player dialog closed successfully. This browser run preceded the final `hl=en` parameter addition; the final automated parameter and package checks include that addition. Audio output was not listened to.

## Remaining coverage

Firefox, Safari/WebKit, real mobile devices, screen readers, and every YouTube restriction/error variant were not verified. Touch emulation is not a real-device result. The Shorts fixture uses the sample video through a Shorts URL to exercise portrait framing, rather than providing a separate real Short. Parent keyboard behavior was tested outside the cross-origin player; YouTube owns keyboard handling inside it. Real autoplay remains subject to browser policy and provider availability.

Temporary example and package-consumer servers were stopped after verification. No publishing, tagging, or remote pushing was performed.

## Layout refinement (2026-10-23)

The maintainer requested toolbar clearance, more surrounding space on large displays, and removal of the separate `Open on YouTube` link. This supersedes the earlier external-link assertions above.

The player now fits inside a CSS size container, preserving its aspect ratio and a 1280px width cap. Fluid inner gutters reserve at least 72px above and 24px below the player area, growing with the viewport. Captions occupy their actual flow height, and the thumbnail strip retains its own space. Gutters are inside the player container so all carousel slide boxes keep the same widths.

Re-ran `pnpm test` (47 passed), `pnpm typecheck` (zero diagnostics), `pnpm build:example`, and `NPM_CONFIG_CACHE=/tmp/npm-cache pnpm test:package` successfully. Type and package checks were repeated after the final CSS change. `git diff --check` passed; the active design hook reported no deterministic issues.

Checked 20 Chrome layout combinations: 2560×1440, 1440×900, 1024×768, 390×844, and 844×390; thumbnails enabled/disabled; landscape videos and portrait Shorts with captions. Waited for carousel animations to finish before checking bounds and centering. Every player stayed at least 8px below the toolbar, remained above the thumbnail strip, preserved its aspect ratio, and displayed no external link. At 2560×1440 the landscape frame was 1280×720, with 640px horizontal and 360px vertical margins when thumbnails were disabled. Phone landscape with thumbnails and a caption retained a 132.8px-tall portrait frame rather than collapsing under a fixed caption allowance.

Inspected settled large-screen and phone screenshots. Provider responses were simulated for these layout checks; real playback was not repeated for this styling-only refinement. Firefox, Safari, and real-device limitations above remain. Temporary verification servers were stopped afterward.
