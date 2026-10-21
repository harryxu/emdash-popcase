import { useState } from "react";
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
import type { OpenRequest } from "./group";

let root: Root | undefined;
let host: HTMLDialogElement | undefined;
let stylesReady: Promise<unknown> | undefined;

export function prepareViewer() {
  const existing = document.querySelectorAll("link[data-popcase-style]");
  const styles = [lightboxStyles, counterStyles, captionStyles, thumbnailStyles, viewerStyles];
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
    stylesReady = Promise.all(links.map((link) => new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Popcase viewer styles timed out.")), 10000);
      link.onload = () => { clearTimeout(timeout); resolve(); };
      link.onerror = () => { clearTimeout(timeout); reject(new Error("Popcase could not load viewer styles.")); };
      document.head.appendChild(link);
    }))).catch((error) => {
      links.forEach((link) => link.remove());
      stylesReady = undefined;
      throw error;
    });
  }
  return stylesReady;
}

function Viewer({ request }: { request: OpenRequest }) {
  const [open, setOpen] = useState(true);
  const labels = request.config.labels;
  const plugins = [
    Video,
    ...(request.config.zoom ? [Zoom] : []),
    ...(request.config.counter ? [Counter] : []),
    ...(request.config.captions ? [Captions] : []),
    ...(request.config.thumbnails ? [Thumbnails] : []),
  ];
  return <Lightbox
    open={open}
    close={() => {
      host?.querySelectorAll("video").forEach((video) => video.pause());
      setOpen(false);
    }}
    slides={request.slides}
    index={request.index}
    plugins={plugins}
    labels={labels}
    className="popcase-viewer"
    portal={{ root: host, container: { role: "presentation", "aria-modal": undefined, "aria-label": undefined } }}
    carousel={{ finite: true, preload: 2 }}
    controller={{ aria: true, closeOnBackdropClick: true }}
    zoom={{ maxZoomPixelRatio: 1 }}
    counter={{ separator: labels.of ?? "of" }}
    captions={{ descriptionMaxLines: 3, showToggle: false }}
    thumbnails={{ position: "bottom", showToggle: false }}
    video={{ controls: true, playsInline: true, autoPlay: true, preload: "none" }}
    render={request.slides.length === 1 ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
    on={{ exited: () => {
      disposeViewer();
      if (request.trigger.isConnected) request.trigger.focus({ preventScroll: true });
    } }}
  />;
}

export function disposeViewer() {
  host?.querySelectorAll("video").forEach((video) => video.pause());
  root?.unmount();
  host?.close();
  host?.remove();
  root = undefined;
  host = undefined;
}

export function openViewer(request: OpenRequest) {
  disposeViewer();
  host = document.createElement("dialog");
  host.dataset.popcaseRoot = "";
  host.className = "popcase-dialog";
  host.setAttribute("aria-label", request.config.labels.Lightbox ?? "Lightbox");
  host.addEventListener("cancel", (event) => {
    event.preventDefault();
    disposeViewer();
    if (request.trigger.isConnected) request.trigger.focus({ preventScroll: true });
  });
  host.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !host) return;
    const controls = Array.from(host.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], video[controls], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden" && !element.closest("[inert]"));
    const first = controls[0];
    const last = controls.at(-1);
    if (first && last && ((!event.shiftKey && document.activeElement === last) ||
        (event.shiftKey && document.activeElement === first))) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });
  document.body.appendChild(host);
  host.showModal();
  root = createRoot(host);
  root.render(<Viewer request={request} />);
}
