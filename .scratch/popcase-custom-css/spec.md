# Advanced settings and custom viewer CSS

Design confirmed and implemented on 2026-10-24. See [validation.md](./validation.md)
for checks actually performed and browser coverage limits.

## Confirmed behavior

- Add an `Advanced` settings section, initially collapsed, to the existing admin
  settings form. Keep application labels in English.
- Add a `Custom CSS` multiline monospace text field with concise guidance and an
  example. Do not add live preview or a full code editor in the initial version.
- Accept custom CSS without a syntax-feature allowlist. Wrap the entire input
  inside the Popcase root selector using native CSS nesting. Administrators do
  not need to prefix every ordinary descendant selector manually. Add guidance
  that administrators are responsible for the safety of their CSS.
- The intended region includes the open viewer's backdrop, toolbar, images,
  video, thumbnails, and photo information panel. Ordinary descendant selectors
  leave body previews, links, and host layout unchanged. Administrators remain
  responsible for advanced selectors that can reach outside the root.
- Include media-query support. Browser support and native nesting determine
  which constructs take effect; wrapping does not make every standalone CSS
  construct valid inside a style rule.
- Use the existing explicit Save action. An empty saved value restores default
  styles. Preserve atomic saving with the other settings.
- Load custom styles with the viewer, after all its default styles, including
  YARL plugin and photo information styles. Normal CSS cascade rules still apply.
- Insert the custom stylesheet only while the lightbox is open, and remove it
  on dismissal or viewer disposal. Do not insert it on initial page load.
- Reject structurally invalid CSS atomically, preserving the
  administrator's draft and displaying an actionable error.
- Do not impose a custom CSS size limit; the previously agreed 32 KiB limit was
  removed at the user's request on 2026-10-24, together with its admin hint.
- Allow CSS resource references such as `url()`, subject to the host's CSP.

## Existing implementation facts

- The viewer uses a native dialog with `data-popcase-root` and an inner
  `.popcase-viewer` container.
- Six default stylesheets are loaded on the first open interaction.
- Existing settings are read into a page marker and then copied to each enhanced
  link. Avoid repeating the custom stylesheet on every link.
- The host's Content Security Policy is preserved. Style delivery must account
  for this rather than assuming inline styles are accepted.

## Confirmed isolation contract

- The revised isolation contract: wrapping is a convention for trusted
  administrator CSS, not a strict boundary. For example, `& + *` can select an
  element outside the root. This conflicts with the earlier requirement to
  reject anything that cannot be safely isolated. The user explicitly accepted
  this revision; validation does not reject legitimate advanced selectors.
- Add the complete source inside `.popcase-dialog[data-popcase-root]` using a
  dynamically created style element and `textContent`, after all default CSS.
  Preserve the host's CSP; document that inline custom styles must be permitted
  by that policy. Root declarations, `&`, nested rules and at-rules are accepted
  structurally; browser support determines whether they apply.
- See [ADR-0007](../../docs/adr/0007-treat-custom-viewer-css-as-trusted-administrator-code.md).

## Verification planned

Validate settings defaults, persistence, atomic rejection, selector isolation,
style ordering, lazy loading, viewer lifecycle, and fallback navigation. Run
`pnpm test`, `pnpm typecheck`, and `pnpm test:package` after implementation.
Record only checks actually performed and identify browser coverage gaps.
