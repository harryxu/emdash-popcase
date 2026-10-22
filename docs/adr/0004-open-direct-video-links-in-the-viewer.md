# Open direct video links in the existing viewer

The exclusion of YouTube video-site links below is extended by [ADR-0005](./0005-open-youtube-links-with-on-demand-embeds.md). Other exclusions still apply.

Image and text links to browser-playable video files express viewing intent on eligible content detail pages. Enhance links whose URL pathname ends in `.mp4`, `.webm`, or `.ogv`, retaining query strings, fragments, original fallback destinations, and modified-click behavior. Do not probe URLs to infer media types. Exclude download links and visual editing.

This extends ADR-0002's image-only destination rule to direct video files. Image previews provide video posters, without assuming their dimensions describe the video. Images and linked videos share the existing ordered viewing group. Native video blocks retain their inline players; video-site pages, provider embeds, streaming manifests and extensionless video destinations remain unchanged.

The native plugin component map supports custom block types but cannot override ordinary paragraph marks. Therefore, direct video links are enhanced across the eligible completed page, rather than only within image block markers. This explicitly broadens the scope for direct video links while retaining ADR-0003's page eligibility and block-scoped image enhancement. The integration injects the lightweight bootstrap so text-only pages also work; React, the Video plugin, and viewer styles still load on first open.
