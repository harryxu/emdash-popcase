import assert from "node:assert/strict";
import { runWithContext } from "emdash/request-context";
import type {
  PageFragmentContribution,
  PluginContext,
  PublicPageContext,
  SettingsAccess,
} from "emdash";
import { createPlugin } from "../dist/index.js";

type TestPage = Pick<PublicPageContext, "kind"> & { content?: { collection: string } };
type HtmlFragment = Extract<PageFragmentContribution, { kind: "html" }>;

export async function contribution(
  page: TestPage,
  context = { editMode: false },
  instance = createPlugin(),
  settings: Pick<SettingsAccess, "get"> = { get: async () => null },
): Promise<HtmlFragment | null> {
  const hook = instance.hooks["page:fragments"];
  assert.ok(hook);
  // The fixture supplies only the host members this hook reads.
  const result = await runWithContext(context, () =>
    hook.handler({ page: page as PublicPageContext }, { settings } as PluginContext),
  );
  if (!result) return null;
  assert.ok(!Array.isArray(result) && result.kind === "html");
  return result;
}
