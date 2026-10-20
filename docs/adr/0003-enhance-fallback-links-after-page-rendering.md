# Enhance fallback links after the complete page has rendered

Astro can evaluate body slots before the EmDash head hook, so an image renderer cannot depend on that hook having already established collection scope. Pair the native plugin with an Astro integration: renderers emit removable block metadata, the page hook emits the eligible page configuration, and response middleware enhances only those blocks after rendering finishes.

This preserves server-rendered fallback links and correct collection exclusions without changing theme templates or sharing mutable request state. The trade-off is buffering public HTML instead of streaming it; preserve Astro cookies and response privacy/cache headers, and invalidate body-dependent validators after transformation.
