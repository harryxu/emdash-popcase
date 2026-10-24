# Treat custom viewer CSS as trusted administrator code

Wrap administrator CSS in the viewer's root selector using native CSS nesting,
without a feature allowlist or selector rewriting. Administrators explicitly
retain responsibility for their CSS: nesting keeps ordinary descendant rules
local but is not a security boundary, and selectors such as `& + *` can target
outside the viewer. This accepts greater customization in exchange for strict
isolation; rejecting or rewriting advanced rules was considered and declined.

Validate structural syntax before saving all settings
atomically. Transport the CSS once as encoded inert page configuration, then
insert a stylesheet after the default styles only for the open viewer session.
Remove it when the viewer is disposed. Native nesting and host CSP determine
which saved rules actually take effect; do not weaken the host's CSP.
