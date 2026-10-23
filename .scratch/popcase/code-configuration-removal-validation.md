# Code configuration removal

Date: 2026-10-23.

Removed factory parameters and the `PopcaseOptions` export, together with zoom/counter/caption switches and label overrides. Those viewer features now use fixed English defaults. The remaining page configuration contains only the admin-controlled `thumbnails` and `videoAutoplay` values. Cached legacy code options are ignored.

Validation: `pnpm test` passed all 50 tests; `pnpm typecheck`, `pnpm build:example`, and `NPM_CONFIG_CACHE=/tmp/npm-cache pnpm test:package` passed. Public type checks reject configuration arguments and the removed type export. A package dry run confirmed the obsolete options module is absent and the admin configuration normalizer is included. `git diff --check` passed.

Chrome against the production example confirmed fixed English dialog/close labels, visible zoom controls, counter and captions despite legacy metadata attempting to disable or rename them. Injecting the admin autoplay flag as false still left the native video paused on opening. This was a component/metadata check, not verification of the separately reported settings mismatch on the user's site. Firefox, Safari and real devices were not tested. The temporary server was stopped after verification.
