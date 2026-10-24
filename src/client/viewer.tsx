import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { createRoot, type Root } from "react-dom/client";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import lightboxStyles from "yet-another-react-lightbox/styles.css?url";
import counterStyles from "yet-another-react-lightbox/plugins/counter.css?url";
import captionStyles from "yet-another-react-lightbox/plugins/captions.css?url";
import thumbnailStyles from "yet-another-react-lightbox/plugins/thumbnails.css?url";
import viewerStyles from "./viewer.css?url";
import { focusElement } from "../exif/focus.js";
import Exif from "../exif/index.js";
import exifStyles from "../exif/exif.css?url";
import { readPhotoInformation } from "./photo-information.js";
import type { OpenRequest } from "./group";
import { YoutubeSlide, YoutubeThumbnail } from "./youtube";
import { mountCustomCss } from "./custom-css.js";

let root: Root | undefined;
let host: HTMLDialogElement | undefined;
let stylesReady: Promise<unknown> | undefined;
let customStyle: HTMLStyleElement | undefined;

export function prepareViewer() {
  const existing = document.querySelectorAll("link[data-popcase-style]");
  const styles = [
    lightboxStyles,
    counterStyles,
    captionStyles,
    thumbnailStyles,
    viewerStyles,
    exifStyles,
  ];
  if (stylesReady && existing.length !== styles.length) {
    existing.forEach((link) => link.remove());
    stylesReady = undefined;
  }
  if (!stylesReady) {
    const links = styles.map((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.popcaseStyle = "";
      return link;
    });
    stylesReady = Promise.all(
      links.map(
        (link) =>
          new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(
              () => reject(new Error("Popcase viewer styles timed out.")),
              10000,
            );
            link.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            link.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Popcase could not load viewer styles."));
            };
            document.head.appendChild(link);
          }),
      ),
    ).catch((error) => {
      links.forEach((link) => link.remove());
      stylesReady = undefined;
      throw error;
    });
  }
  return stylesReady;
}

function Viewer({ request, restoreFocus }: { request: OpenRequest; restoreFocus: () => void }) {
  const [open, setOpen] = useState(true);
  const plugins = [
    Video,
    Zoom,
    Counter,
    Captions,
    ...(request.config.thumbnails ? [Thumbnails] : []),
    ...(request.config.photoInformation ? [Exif] : []),
  ];
  return (
    <Lightbox
      open={open}
      close={() => {
        host?.querySelectorAll("video").forEach((video) => video.pause());
        setOpen(false);
      }}
      slides={request.slides}
      index={request.index}
      plugins={plugins}
      className="popcase-viewer"
      portal={{
        root: host,
        container: { role: "presentation", "aria-modal": undefined, "aria-label": undefined },
      }}
      carousel={{ finite: true, preload: 2 }}
      controller={{ aria: true, closeOnBackdropClick: true }}
      zoom={{ maxZoomPixelRatio: 1 }}
      counter={{ separator: "of" }}
      captions={{ descriptionMaxLines: 3, showToggle: false }}
      thumbnails={{ position: "bottom", showToggle: false }}
      exif={{ load: readPhotoInformation }}
      video={{
        controls: true,
        playsInline: true,
        autoPlay: request.config.videoAutoplay,
        preload: "none",
      }}
      render={{
        iconPrev: () => <ChevronLeft className="yarl__icon" strokeWidth={1.7} aria-hidden="true" />,
        iconNext: () => (
          <ChevronRight className="yarl__icon" strokeWidth={1.7} aria-hidden="true" />
        ),
        iconClose: () => <X className="yarl__icon" strokeWidth={1.7} aria-hidden="true" />,
        iconZoomIn: () => <ZoomIn className="yarl__icon" strokeWidth={1.7} aria-hidden="true" />,
        iconZoomOut: () => <ZoomOut className="yarl__icon" strokeWidth={1.7} aria-hidden="true" />,
        ...(request.slides.length === 1 ? { buttonPrev: () => null, buttonNext: () => null } : {}),
        slide: ({ slide, offset }) =>
          slide.type === "youtube" ? (
            open && offset === 0 ? (
              <YoutubeSlide slide={slide} videoAutoplay={request.config.videoAutoplay} />
            ) : (
              <div />
            )
          ) : undefined,
        thumbnail: ({ slide, rect }) =>
          slide.type === "youtube" ? <YoutubeThumbnail slide={slide} rect={rect} /> : undefined,
      }}
      on={{
        exited: () => {
          disposeViewer();
          restoreFocus();
        },
      }}
    />
  );
}

export function disposeViewer() {
  customStyle?.remove();
  customStyle = undefined;
  host?.querySelectorAll("video").forEach((video) => video.pause());
  root?.unmount();
  host?.close();
  host?.remove();
  root = undefined;
  host = undefined;
}

export function openViewer(request: OpenRequest) {
  disposeViewer();
  let keyboardInput = request.keyboard;
  const restoreFocus = () => {
    if (request.trigger.isConnected) focusElement(request.trigger, keyboardInput);
  };
  host = document.createElement("dialog");
  host.addEventListener(
    "pointerdown",
    () => {
      keyboardInput = false;
    },
    true,
  );
  host.addEventListener(
    "keydown",
    () => {
      keyboardInput = true;
    },
    true,
  );
  host.dataset.popcaseRoot = "";
  host.className = "popcase-dialog";
  host.setAttribute("aria-label", "Lightbox");
  host.addEventListener("cancel", (event) => {
    event.preventDefault();
    disposeViewer();
    restoreFocus();
  });
  host.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !host) return;
    const controls = Array.from(
      host.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], video[controls], iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden" &&
        !element.closest("[inert]"),
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (
      first &&
      last &&
      ((!event.shiftKey && document.activeElement === last) ||
        (event.shiftKey && document.activeElement === first))
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });
  document.body.appendChild(host);
  host.showModal();
  customStyle = mountCustomCss(document);
  root = createRoot(host);
  root.render(<Viewer request={request} restoreFocus={restoreFocus} />);
}
