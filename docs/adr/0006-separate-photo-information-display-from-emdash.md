# Separate photo information display from EmDash data acquisition

Provide a reusable Yet Another React Lightbox EXIF display plugin through a separate export of `emdash-popcase`, and integrate it into Popcase. The display plugin accepts normalized photo information; Popcase owns its EmDash-specific acquisition, so other YARL consumers can supply information without adopting EmDash's media pipeline. This introduces a public plugin interface to maintain, in exchange for reuse outside EmDash.

Photo information always describes the current viewer image, consistent with ADR-0002. When a preview and viewer image differ, missing viewer-image information must not be filled from the preview image.

In Popcase, acquire this information in the reader's browser only when the information panel is first expanded for the current image. Keep results within that viewer session, and do not introduce a server-side proxy or require authors to edit existing content. This preserves the existing server rendering and deployment boundaries, accepting that cross-origin access restrictions or stripped image metadata can leave photo information unavailable.
