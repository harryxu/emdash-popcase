import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareRelease } from "../scripts/prepare-release.ts";

const entry = 'import packageMetadata from "../package.json" with { type: "json" };\n';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "popcase-release-"));
  await mkdir(join(root, "src"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "emdash-popcase", version: "0.1.0" }),
  );
  await writeFile(join(root, "src/index.ts"), entry);
  return root;
}

test("release tags update the package version without rewriting plugin source", async () => {
  const root = await fixture();
  try {
    assert.equal(await prepareRelease("v0.1.2", root), "0.1.2");
    assert.equal(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version, "0.1.2");
    assert.equal(await readFile(join(root, "src/index.ts"), "utf8"), entry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid and prerelease tags are rejected before release files change", async () => {
  const root = await fixture();
  try {
    const before = await readFile(join(root, "package.json"), "utf8");
    for (const tag of [
      undefined,
      "0.1.2",
      "v01.1.2",
      "v0.1",
      "v0.1.2-beta.1",
      "v0.1.2+build",
      "v0.1.2\n",
      "v0.1.2; echo bad",
    ]) {
      await assert.rejects(prepareRelease(tag, root), /Release tags must/);
    }
    assert.equal(await readFile(join(root, "package.json"), "utf8"), before);
    assert.equal(await readFile(join(root, "src/index.ts"), "utf8"), entry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release preparation rejects a different package before writing", async () => {
  const root = await fixture();
  try {
    const before = JSON.stringify({ name: "another-package", version: "0.1.0" });
    await writeFile(join(root, "package.json"), before);
    await assert.rejects(prepareRelease("v0.1.2", root), /Expected the emdash-popcase package/);
    assert.equal(await readFile(join(root, "package.json"), "utf8"), before);
    assert.equal(await readFile(join(root, "src/index.ts"), "utf8"), entry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
