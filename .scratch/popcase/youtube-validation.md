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
