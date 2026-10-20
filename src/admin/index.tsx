import { Button, Checkbox, Loader } from "@cloudflare/kumo";
import { useLingui } from "@lingui/react";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { useCallback, useEffect, useState, type SyntheticEvent } from "react";

import type { ContentTypes, SettingsResponse } from "../types.js";

const endpoint = "/_emdash/api/plugins/popcase/settings";

export function SettingsPage() {
  const { i18n } = useLingui();
  const zh = i18n.locale.toLowerCase().startsWith("zh");
  const text = (en: string, cn: string) => zh ? cn : en;
  const [data, setData] = useState<Extract<SettingsResponse, { ok: true }>>();
  const [draft, setDraft] = useState<ContentTypes>({ mode: "all" });
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
      setDraft(result.settings.mode === "all" ? result.settings : {
        mode: "selected", collections: result.settings.collections.filter((slug) => known.has(slug)),
      });
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
      const result = await parseApiResponse<SettingsResponse>(await apiFetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      }));
      if (!result.ok) throw new Error("Failed to save Popcase settings.");
      setData(result);
      setDraft(result.settings);
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
        <h1 className="text-2xl font-semibold text-kumo-default">{text("Popcase settings", "Popcase 设置")}</h1>
        <p className="text-sm text-kumo-subtle">{text(
          "Choose which content types use Popcase. Changes apply to existing and new content after saving.",
          "选择启用 Popcase 的内容类型。保存后，对已有和新增内容统一生效。",
        )}</p>
      </header>
      {loading ? <div role="status"><Loader />{text("Loading settings…", "正在加载设置…")}</div> : !data ? (
        <div className="space-y-3">
          <p role="alert">{text("Could not load settings. Try again.", "无法加载设置，请重试。")}</p>
          <Button onClick={() => void load()}>{text("Retry", "重试")}</Button>
        </div>
      ) : (
        <form action={endpoint} method="post" onSubmit={save} className="space-y-6" aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-5">
            <legend className="mb-3 font-medium text-kumo-default">{text("Enable Popcase", "启用 Popcase")}</legend>
            <Checkbox name="enableAll" label={text("Enable all content types", "全部启用")}
              checked={draft.mode === "all"} disabled={saving}
              onCheckedChange={(checked) => change(checked ? { mode: "all" } : { mode: "selected", collections: [] })} />
            <p className="text-sm text-kumo-subtle">{text(
              "Enable all includes future content types. Uncheck it to select types individually; new types will stay disabled.",
              "全部启用包含未来新增的内容类型。取消后请逐项勾选，新增类型默认不启用。",
            )}</p>
            <fieldset disabled={saving || draft.mode === "all"} className="space-y-2">
              <legend className="mb-3 text-sm font-medium text-kumo-default">{text("Content types", "内容类型")}</legend>
              {data.collections.map(({ slug, label }) => (
                <div key={slug} className="py-2 break-words">
                  <Checkbox name={slug} label={`${label} (${slug})`}
                    checked={draft.mode === "all" || draft.collections.includes(slug)}
                    disabled={saving || draft.mode === "all"}
                    onCheckedChange={(checked) => {
                      if (draft.mode !== "selected") return;
                      change({ mode: "selected", collections: checked
                        ? [...draft.collections, slug] : draft.collections.filter((value) => value !== slug) });
                    }} />
                </div>
              ))}
              {data.collections.length === 0 && <p className="text-sm text-kumo-subtle">{text("No content types yet.", "站点暂无内容类型。")}</p>}
            </fieldset>
          </fieldset>
          <p role="status" className="text-sm text-kumo-subtle">
            {draft.mode === "selected" && draft.collections.length === 0
              ? text("Popcase is disabled for all content types in this selection. Save to apply.", "当前所有内容类型均未启用 Popcase。保存后生效。")
              : text("Selections take effect only after saving.", "勾选操作仅在保存后生效。")}
          </p>
          {error === "save" && <p role="alert">{text("Could not save settings. Your selections are preserved; please retry.", "保存失败，已保留当前选择，请重试。")}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? text("Saving…", "正在保存…") : text("Save settings", "保存设置")}
            </Button>
            <span role="status" className="text-sm text-kumo-subtle">{saved ? text("Settings saved.", "设置已保存。") : ""}</span>
          </div>
        </form>
      )}
    </div>
  );
}

export const pages = { "/settings": SettingsPage };
