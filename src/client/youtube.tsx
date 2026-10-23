import { ImageSlide } from "yet-another-react-lightbox";
import type { CSSProperties } from "react";
import type { ContainerRect } from "yet-another-react-lightbox";
import type { ViewerYoutube } from "./group";
import { youtubeEmbedUrl } from "../youtube.js";

declare module "yet-another-react-lightbox" {
  interface SlideTypes {
    youtube: ViewerYoutube;
  }
}

export function YoutubeSlide({
  slide,
  videoAutoplay,
}: {
  slide: ViewerYoutube;
  videoAutoplay: boolean;
}) {
  return (
    <div
      className="popcase-youtube"
      style={{ "--popcase-youtube-ratio": slide.shorts ? 9 / 16 : 16 / 9 } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <iframe
        title={slide.alt || "YouTube video"}
        src={youtubeEmbedUrl(slide, videoAutoplay)}
        width={slide.shorts ? 720 : 1280}
        height={slide.shorts ? 1280 : 720}
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export function YoutubeThumbnail({ slide, rect }: { slide: ViewerYoutube; rect: ContainerRect }) {
  return (
    <>
      {slide.poster && (
        <ImageSlide slide={{ src: slide.poster, alt: "" }} rect={rect} imageFit="cover" />
      )}
      <svg className="yarl__thumbnails_thumbnail_icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M9 5v14l11-7z" />
      </svg>
    </>
  );
}
