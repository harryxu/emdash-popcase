import { Button, Checkbox, Loader } from "@cloudflare/kumo";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { useCallback, useEffect, useState, type SyntheticEvent } from "react";

import type { ContentTypes, SettingsResponse } from "../types.js";

const endpoint = "/_emdash/api/plugins/popcase/settings";

export function SettingsPage() {
  const [data, setData] = useState<Extract<SettingsResponse, { ok: true }>>();
  const [draft, setDraft] = useState<ContentTypes>({ mode: "all" });
  const [thumbnails, setThumbnails] = useState(false);
  const [videoAutoplay, setVideoAutoplay] = useState(true);
  const [photoInformation, setPhotoInformation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"load" | "save">();
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await parseApiResponse<SettingsResponse>(await apiFetch(endpoint, { signal }));
      if (!result.ok) throw new Error("Failed to load Popcase settings.");
      if (signal?.aborted) return;
      const known = new Set(result.collections.map(({ slug }) => slug));
      setData(result);
      setThumbnails(result.thumbnails);
      setVideoAutoplay(result.videoAutoplay);
      setPhotoInformation(result.photoInformation);
      setDraft(
        result.settings.mode === "all"
          ? result.settings
          : {
              mode: "selected",
              collections: result.settings.collections.filter((slug) => known.has(slug)),
            },
      );
    } catch {
      if (!signal?.aborted) setError("load");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const change = (value: ContentTypes) => {
    setDraft(value);
    setSaved(false);
    setError(undefined);
  };

  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(undefined);
    try {
      const result = await parseApiResponse<SettingsResponse>(
        await apiFetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, thumbnails, videoAutoplay, photoInformation }),
        }),
      );
      if (!result.ok) throw new Error("Failed to save Popcase settings.");
      setData(result);
      setDraft(result.settings);
      setThumbnails(result.thumbnails);
      setVideoAutoplay(result.videoAutoplay);
      setPhotoInformation(result.photoInformation);
      setSaved(true);
    } catch {
      setError("save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-kumo-default">Popcase settings</h1>
        <p className="text-sm text-kumo-subtle">
          Choose content types and viewer behavior. Changes apply to existing and new content after
          saving.
        </p>
      </header>
      {loading ? (
        <div role="status">
          <Loader />
          Loading settings…
        </div>
      ) : !data ? (
        <div className="space-y-3">
          <p role="alert">Could not load settings. Try again.</p>
          <Button onClick={() => void load()}>Retry</Button>
        </div>
      ) : (
        <form
          action={endpoint}
          method="post"
          onSubmit={save}
          className="space-y-6"
          aria-busy={saving}
        >
          <fieldset disabled={saving} className="space-y-5">
            <legend className="mb-3 font-medium text-kumo-default">Enable Popcase</legend>
            <Checkbox
              name="enableAll"
              label="Enable all content types"
              checked={draft.mode === "all"}
              disabled={saving}
              onCheckedChange={(checked) =>
                change(checked ? { mode: "all" } : { mode: "selected", collections: [] })
              }
            />
            <p className="text-sm text-kumo-subtle">
              Enable all includes future content types. Uncheck it to select types individually; new
              types will stay disabled.
            </p>
            <fieldset
              disabled={saving || draft.mode === "all"}
              className="space-y-2"
              style={{ marginInlineStart: "1.5rem" }}
            >
              <legend className="mb-3 text-sm font-medium text-kumo-default">Content types</legend>
              {data.collections.map(({ slug, label }) => (
                <div key={slug} className="py-2 break-words">
                  <Checkbox
                    name={slug}
                    label={`${label} (${slug})`}
                    checked={draft.mode === "all" || draft.collections.includes(slug)}
                    disabled={saving || draft.mode === "all"}
                    onCheckedChange={(checked) => {
                      if (draft.mode !== "selected") return;
                      change({
                        mode: "selected",
                        collections: checked
                          ? [...draft.collections, slug]
                          : draft.collections.filter((value) => value !== slug),
                      });
                    }}
                  />
                </div>
              ))}
              {data.collections.length === 0 && (
                <p className="text-sm text-kumo-subtle">No content types yet.</p>
              )}
            </fieldset>
          </fieldset>
          <fieldset disabled={saving} className="space-y-3">
            <legend className="mb-3 font-medium text-kumo-default">Image viewer</legend>
            <Checkbox
              name="thumbnails"
              label="Enable thumbnails"
              checked={thumbnails}
              disabled={saving}
              onCheckedChange={(checked) => {
                setThumbnails(checked === true);
                setSaved(false);
                setError(undefined);
              }}
            />
            <p className="text-sm text-kumo-subtle">
              Show clickable thumbnails at the bottom of the image viewer.
            </p>
          </fieldset>
          <fieldset disabled={saving} className="space-y-3">
            <legend className="mb-3 font-medium text-kumo-default">Photo information</legend>
            <Checkbox
              name="photoInformation"
              label="Show photo information"
              checked={photoInformation}
              disabled={saving}
              onCheckedChange={(checked) => {
                setPhotoInformation(checked === true);
                setSaved(false);
                setError(undefined);
              }}
            />
            <p className="text-sm text-kumo-subtle">
              Let readers view the camera, lens, and exposure details recorded in an image.
              Information is read only when a reader opens the panel.
            </p>
          </fieldset>
          <fieldset disabled={saving} className="space-y-3">
            <legend className="mb-3 font-medium text-kumo-default">Video playback</legend>
            <Checkbox
              name="videoAutoplay"
              label="Autoplay videos"
              checked={videoAutoplay}
              disabled={saving}
              onCheckedChange={(checked) => {
                setVideoAutoplay(checked === true);
                setSaved(false);
                setError(undefined);
              }}
            />
            <p className="text-sm text-kumo-subtle">
              Automatically play linked video files and YouTube videos when opened or selected in
              the viewer.
            </p>
          </fieldset>
          <p role="status" className="text-sm text-kumo-subtle">
            {draft.mode === "selected" && draft.collections.length === 0
              ? "Popcase is disabled for all content types in this selection. Save to apply."
              : "Selections take effect only after saving."}
          </p>
          {error === "save" && (
            <p role="alert">
              Could not save settings. Your selections are preserved; please retry.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            <span role="status" className="text-sm text-kumo-subtle">
              {saved ? "Settings saved." : ""}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

export const pages = { "/settings": SettingsPage };
