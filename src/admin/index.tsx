import { Button, Checkbox, Loader, Switch } from "@cloudflare/kumo";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { Check, Save } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode, type SyntheticEvent } from "react";

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

  const savedCollections =
    data?.settings.mode === "selected"
      ? data.settings.collections.filter((slug) =>
          data.collections.some((collection) => collection.slug === slug),
        )
      : [];
  const isDirty = Boolean(
    data &&
    (draft.mode !== data.settings.mode ||
      (draft.mode === "selected" &&
        (draft.collections.length !== savedCollections.length ||
          draft.collections.some((slug) => !savedCollections.includes(slug)))) ||
      thumbnails !== data.thumbnails ||
      videoAutoplay !== data.videoAutoplay ||
      photoInformation !== data.photoInformation),
  );

  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !isDirty) return;
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

  const saveAction = (
    <Button
      type="submit"
      form="popcase-settings"
      variant={isDirty || saving ? "primary" : "secondary"}
      disabled={saving || !isDirty}
      className="min-w-[100px] shrink-0 justify-center"
      aria-busy={saving}
    >
      {saving ? (
        <Loader size="sm" />
      ) : isDirty ? (
        <Save size={16} aria-hidden="true" />
      ) : (
        <Check size={16} aria-hidden="true" />
      )}
      {saving ? "Saving…" : isDirty ? "Save" : "Saved"}
    </Button>
  );

  return (
    <div className="w-full max-w-4xl pb-6 text-kumo-default">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight text-balance">Popcase settings</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-pretty text-kumo-subtle">
            Choose content types and viewer behavior. Changes apply to existing and new content
            after saving.
          </p>
        </div>
        {data && !loading && saveAction}
      </header>
      {loading ? (
        <div
          role="status"
          className="mt-6 flex items-center gap-2 rounded-xl border border-kumo-line bg-kumo-base px-4 py-4 text-sm text-kumo-subtle"
        >
          <Loader size="sm" />
          Loading settings…
        </div>
      ) : !data ? (
        <div className="mt-6 space-y-3 rounded-xl border border-kumo-line bg-kumo-base p-4">
          <p role="alert">Could not load settings. Try again.</p>
          <Button onClick={() => void load()}>Retry</Button>
        </div>
      ) : (
        <form
          id="popcase-settings"
          action={endpoint}
          method="post"
          onSubmit={save}
          className="mt-6 grid gap-8"
          aria-busy={saving}
        >
          <SettingsSection title="Enable Popcase">
            <ToggleRow
              name="enableAll"
              label="Enable all content types"
              description="Enable all includes future content types. Turn it off to select types individually; new types will stay disabled."
              checked={draft.mode === "all"}
              disabled={saving}
              onCheckedChange={(checked) =>
                change(checked ? { mode: "all" } : { mode: "selected", collections: [] })
              }
            />
            <fieldset disabled={saving || draft.mode === "all"} className="px-4 py-4">
              <legend className="sr-only">Content types</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.collections.map(({ slug, label }) => (
                  <div key={slug} className="min-w-0 break-words">
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
              </div>
              {data.collections.length === 0 && (
                <p className="text-sm leading-5 text-kumo-subtle">No content types yet.</p>
              )}
            </fieldset>
          </SettingsSection>
          <SettingsSection title="Image viewer">
            <ToggleRow
              name="thumbnails"
              label="Enable thumbnails"
              description="Show clickable thumbnails at the bottom of the image viewer."
              checked={thumbnails}
              disabled={saving}
              onCheckedChange={(checked) => {
                setThumbnails(checked);
                setSaved(false);
                setError(undefined);
              }}
            />
            <ToggleRow
              name="photoInformation"
              label="Show photo information"
              description="Let readers view the camera, lens, and exposure details recorded in an image. Information is read only when a reader opens the panel."
              checked={photoInformation}
              disabled={saving}
              onCheckedChange={(checked) => {
                setPhotoInformation(checked);
                setSaved(false);
                setError(undefined);
              }}
            />
          </SettingsSection>
          <SettingsSection title="Video playback">
            <ToggleRow
              name="videoAutoplay"
              label="Autoplay videos"
              description="Automatically play linked video files and YouTube videos when opened or selected in the viewer."
              checked={videoAutoplay}
              disabled={saving}
              onCheckedChange={(checked) => {
                setVideoAutoplay(checked);
                setSaved(false);
                setError(undefined);
              }}
            />
          </SettingsSection>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm leading-5">
            <p role="status" className="text-kumo-subtle">
              {saved
                ? "Settings saved."
                : draft.mode === "selected" && draft.collections.length === 0
                  ? isDirty
                    ? "Popcase is disabled for all content types in this selection. Save to apply."
                    : "Popcase is disabled for all content types."
                  : isDirty
                    ? "Selections take effect only after saving."
                    : "All changes are saved."}
            </p>
            {saveAction}
            {error === "save" && (
              <p role="alert" className="w-full text-kumo-danger">
                Could not save settings. Your selections are preserved; please retry.
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="text-lg font-semibold leading-6 text-balance">{title}</h2>
      <div className="mt-3 divide-y divide-kumo-line overflow-hidden rounded-xl border border-kumo-line bg-kumo-base">
        {children}
      </div>
    </section>
  );
}

function ToggleRow({
  name,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="px-4 py-4">
      <Switch
        name={name}
        label={label}
        controlFirst={false}
        className="ms-auto shrink-0"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-describedby={`popcase-${name}-description`}
      />
      <p
        id={`popcase-${name}-description`}
        className="mt-1.5 max-w-2xl text-sm leading-5 text-pretty text-kumo-subtle"
      >
        {description}
      </p>
    </div>
  );
}

export const pages = { "/settings": SettingsPage };
