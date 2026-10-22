import { ImageSlide } from "yet-another-react-lightbox";
import type { ContainerRect } from "yet-another-react-lightbox";
import type { ViewerYoutube } from "./group";
import { youtubeEmbedUrl } from "../youtube.js";

declare module "yet-another-react-lightbox" {
  interface SlideTypes {
    youtube: ViewerYoutube;
  }
}

export function YoutubeSlide({ slide, rect, captions, labels }: {
  slide: ViewerYoutube; rect: ContainerRect; captions: boolean; labels: Record<string, string>;
}) {
  const ratio = slide.shorts ? 9 / 16 : 16 / 9;
  const availableHeight = Math.max(0, rect.height - (captions && slide.description ? 128 : 48));
  const width = Math.min(rect.width, availableHeight * ratio);
  return <div className="popcase-youtube" onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}>
    <iframe
      title={slide.alt || (labels["YouTube video"] ?? "YouTube video")}
      src={youtubeEmbedUrl(slide)}
      width={width}
      height={width / ratio}
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
    />
    <a href={slide.src} target="_blank" rel="noopener" className="popcase-youtube-link">
      {labels["Open on YouTube"] ?? "Open on YouTube"}
    </a>
  </div>;
}

export function YoutubeThumbnail({ slide, rect }: { slide: ViewerYoutube; rect: ContainerRect }) {
  return <>
    {slide.poster && <ImageSlide slide={{ src: slide.poster, alt: "" }} rect={rect} imageFit="cover" />}
    <svg className="yarl__thumbnails_thumbnail_icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M9 5v14l11-7z" />
    </svg>
  </>;
}
