import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  addToolbarButton,
  createModule,
  isImageSlide,
  useLightboxProps,
  useLightboxState,
  type ComponentProps,
  type Plugin,
  type SlideImage,
} from "yet-another-react-lightbox";
import {
  Aperture,
  CalendarDays,
  Camera,
  CircleDot,
  Focus,
  Info,
  RotateCcw,
  ScanLine,
  Timer,
  X,
} from "lucide-react";
import {
  photoInformationFields,
  type ExifLoadResult,
  type PhotoInformation,
} from "./information.js";

import { focusElement } from "./focus.js";

export type { ExifLoadResult, PhotoInformation, PhotoInformationField } from "./information.js";

export interface ExifOptions {
  /** Invoked only for an expanded image without inline information. */
  load?: (slide: SlideImage, context: { signal: AbortSignal }) => Promise<ExifLoadResult>;
}

declare module "yet-another-react-lightbox" {
  interface LightboxProps {
    exif?: ExifOptions;
  }
  interface SlideImage {
    exif?: PhotoInformation;
  }
  interface ToolbarButtonKeys {
    exif: null;
  }
}

interface ExifContextValue {
  expanded: boolean;
  toggle: (keyboard: boolean) => void;
  panelId: string;
  button: RefObject<HTMLButtonElement | null>;
}
const ExifContext = createContext<ExifContextValue | null>(null);

function ExifButton() {
  const context = useContext(ExifContext)!;
  const { currentSlide } = useLightboxState();
  if (!currentSlide || !isImageSlide(currentSlide)) return null;
  return (
    <button
      ref={context.button}
      type="button"
      className="yarl__button yarl__exif_toggle"
      aria-label="Photo information"
      title="Photo information"
      aria-expanded={context.expanded}
      aria-controls={context.panelId}
      onClick={(event) => context.toggle(event.detail === 0)}
    >
      <Info className="yarl__icon" aria-hidden="true" strokeWidth={1.7} />
    </button>
  );
}

const fieldIcons = {
  camera: Camera,
  lens: CircleDot,
  focalLength: Focus,
  aperture: Aperture,
  exposureTime: Timer,
  iso: ScanLine,
  capturedAt: CalendarDays,
};

function Information({
  result,
  retry,
}: {
  result: ExifLoadResult | { status: "loading" };
  retry: () => void;
}) {
  if (result.status === "ready") {
    return (
      <dl className="yarl__exif_fields">
        {photoInformationFields(result.information).map(({ key, label, value }) => {
          const Icon = fieldIcons[key];
          return (
            <div key={key} className={`yarl__exif_field yarl__exif_field_${key}`}>
              <dt>
                <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                {label}
              </dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
    );
  }
  const content = {
    loading: ["Reading photo information…", "This may take a moment."],
    empty: ["No photo information", "This image has no recorded camera or exposure details."],
    unsupported: [
      "Format not supported",
      "Photo information is available for JPEG, PNG, WebP, and AVIF images.",
    ],
    error: [
      "Photo information unavailable",
      result.status === "error" && result.reason === "limit"
        ? "The image exceeds the reading limit. You can still view it normally."
        : result.status === "error" && result.reason === "timeout"
          ? "Reading took too long. Try again when your connection improves."
          : "The image could not be read. Try again, or continue viewing.",
    ],
  }[result.status];
  return (
    <div className="yarl__exif_state">
      <p className="yarl__exif_state_title">{content[0]}</p>
      <p>{content[1]}</p>
      {result.status === "error" && (
        <button type="button" className="yarl__exif_retry" onClick={retry}>
          <RotateCcw size={16} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

function ExifLayout({ children }: ComponentProps) {
  const { open, exif } = useLightboxProps();
  const { currentSlide } = useLightboxState();
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ slide: SlideImage; result: ExifLoadResult }>();
  const cache = useRef(new Map<string, ExifLoadResult>());
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const focusOnExpand = useRef(false);
  const keyboardInput = useRef(false);
  const panelId = useId();
  const image = currentSlide && isImageSlide(currentSlide) ? currentSlide : undefined;
  const visible = open && expanded && !!image;
  const loader = exif?.load;
  const inline = image?.exif;

  const collapse = () => {
    setExpanded(false);
    if (button.current) focusElement(button.current, keyboardInput.current);
  };

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      cache.current.clear();
      setLoaded(undefined);
    }
  }, [open]);

  useEffect(() => {
    if (visible && focusOnExpand.current) {
      if (panel.current) focusElement(panel.current, keyboardInput.current);
      focusOnExpand.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !image || inline) return;
    const stored = cache.current.get(image.src);
    if (stored) {
      setLoaded({ slide: image, result: stored });
      return;
    }
    if (!loader) {
      setLoaded({ slide: image, result: { status: "empty" } });
      return;
    }
    const controller = new AbortController();
    let active = true;
    void Promise.resolve()
      .then(() => loader(image, { signal: controller.signal }))
      .then((result) => {
        if (!active) return;
        const normalized =
          result.status === "ready" && !photoInformationFields(result.information).length
            ? { status: "empty" as const }
            : result;
        cache.current.set(image.src, normalized);
        setLoaded({ slide: image, result: normalized });
      })
      .catch(() => {
        if (active) setLoaded({ slide: image, result: { status: "error" } });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [visible, image, inline, loader, attempt]);

  let result: ExifLoadResult | { status: "loading" } = { status: "loading" };
  if (inline)
    result = photoInformationFields(inline).length
      ? { status: "ready", information: inline }
      : { status: "empty" };
  else if (loaded && loaded.slide === image) result = loaded.result;

  const context: ExifContextValue = {
    expanded,
    panelId,
    button,
    toggle: (keyboard) => {
      keyboardInput.current = keyboard;
      if (expanded) collapse();
      else {
        focusOnExpand.current = true;
        setExpanded(true);
      }
    },
  };

  return (
    <ExifContext.Provider value={context}>
      <div
        className="yarl__exif_layout"
        data-expanded={visible || undefined}
        onPointerDownCapture={() => {
          keyboardInput.current = false;
        }}
        onKeyDownCapture={() => {
          keyboardInput.current = true;
        }}
      >
        <div className="yarl__exif_viewport">{children as ReactNode}</div>
        {visible && (
          <aside
            ref={panel}
            id={panelId}
            className="yarl__exif_panel"
            tabIndex={-1}
            aria-labelledby={`${panelId}-title`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                collapse();
              }
              if (event.key !== "Tab") event.stopPropagation();
            }}
          >
            <header className="yarl__exif_header">
              <h2 id={`${panelId}-title`}>Photo information</h2>
              <button
                type="button"
                className="yarl__exif_close"
                onClick={collapse}
                aria-label="Hide photo information"
                title="Hide photo information"
              >
                <X size={20} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </header>
            <div className="yarl__exif_content" aria-live="polite" aria-atomic="true">
              <Information
                result={result}
                retry={() => {
                  if (panel.current) focusElement(panel.current, keyboardInput.current);
                  if (image) cache.current.delete(image.src);
                  setLoaded(undefined);
                  setAttempt((value) => value + 1);
                }}
              />
            </div>
          </aside>
        )}
      </div>
    </ExifContext.Provider>
  );
}

/** Adds photographer-oriented information without replacing YARL's image renderer. */
export const Exif: Plugin = ({ augment, addParent, contains }) => {
  augment(({ toolbar, ...props }) => ({
    ...props,
    toolbar: addToolbarButton(toolbar, "exif", <ExifButton />),
  }));
  addParent(contains("thumbnails") ? "thumbnails" : "controller", createModule("exif", ExifLayout));
};

export default Exif;
