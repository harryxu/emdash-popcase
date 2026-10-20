# Use existing image links to select a different viewer image

Authors may need a separately prepared preview image to open a different viewer image. Reuse the existing image destination link for this override instead of introducing a new content block or adding fields that the core image editor does not preserve.

The plugin opens destinations confirmed to be image resources in the viewer. Links to ordinary pages and destinations whose image type cannot be established retain their navigation behavior and are excluded from the viewing group. An unlinked image opens its own source by default.

This keeps existing image editing and content data usable without migration, at the cost of requiring authors to enter a URL rather than select a second image through a dedicated media picker. An image resource link therefore expresses viewer intent when the plugin is enabled.
