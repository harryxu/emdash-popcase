import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  selectRelease,
  pushReleaseTag,
  verifyRelease,
  publicationState,
  type ReleaseState,
} from "../scripts/release.ts";

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function fixture(run: (root: string, remote: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "popcase-workflow-"));
  const remote = join(directory, "remote.git");
  const root = join(directory, "checkout");
  try {
    await mkdir(root);
    git(directory, "init", "--bare", "--initial-branch=main", remote);
    git(root, "init", "--initial-branch=main");
    git(root, "config", "user.name", "Release test");
    git(root, "config", "user.email", "release@example.test");
    await manifest(root, "0.1.5");
    git(root, "add", "package.json");
    git(root, "commit", "-m", "Initial version");
    git(root, "remote", "add", "origin", remote);
    git(root, "push", "origin", "main");
    await run(root, remote);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function manifest(root: string, version: string) {
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name: "emdash-popcase", version, type: "module" }, null, 2)}\n`,
  );
}

const missing: typeof fetch = async () => new Response(null, { status: 404 });
const noLookup: typeof fetch = async () => {
  throw new Error("Existing tags must not prepare a new release.");
};
const state: ReleaseState = {
  version: "0.1.6",
  tag: "v0.1.6",
  branch: "main",
  baseSha: "unused",
  existingTag: true,
};

test("new releases commit the version and atomically push the branch and tag", async () => {
  await fixture(async (root, remote) => {
    const selected = await selectRelease(root, "0.1.6", "main", missing);
    assert.equal(selected.existingTag, false);
    await pushReleaseTag(root, selected);
    assert.equal(
      git(remote, "rev-parse", "refs/heads/main"),
      git(remote, "rev-parse", "refs/tags/v0.1.6"),
    );
    assert.equal(JSON.parse(git(remote, "show", "v0.1.6:package.json")).version, "0.1.6");
    assert.equal(git(root, "status", "--porcelain"), "");
    const retry = await selectRelease(root, "0.1.6", "main", noLookup);
    assert.equal(retry.existingTag, true);
    await pushReleaseTag(root, retry);
  });
});

test("existing annotated tags release their original commit without changing the default branch", async () => {
  await fixture(async (root, remote) => {
    git(root, "tag", "-a", "v0.1.5", "-m", "Version 0.1.5");
    git(root, "push", "origin", "refs/tags/v0.1.5");
    const tagObject = git(remote, "rev-parse", "refs/tags/v0.1.5");
    await manifest(root, "0.1.7");
    git(root, "commit", "-am", "Later development");
    git(root, "push", "origin", "main");
    const branchSha = git(remote, "rev-parse", "refs/heads/main");
    const selected = await selectRelease(root, "0.1.5", "main", noLookup);
    assert.equal(selected.existingTag, true);
    assert.equal(git(root, "rev-parse", "HEAD"), git(remote, "rev-parse", "v0.1.5^{commit}"));
    await pushReleaseTag(root, selected);
    assert.equal(git(remote, "rev-parse", "refs/heads/main"), branchSha);
    assert.equal(git(remote, "rev-parse", "refs/tags/v0.1.5"), tagObject);
  });
});

test("existing tags with a different package version fail without rewriting source", async () => {
  await fixture(async (root, remote) => {
    git(root, "tag", "v0.1.6");
    git(root, "push", "origin", "refs/tags/v0.1.6");
    const before = await readFile(join(root, "package.json"), "utf8");
    await assert.rejects(selectRelease(root, "0.1.6", "main", noLookup), /refusing to rewrite/);
    assert.equal(await readFile(join(root, "package.json"), "utf8"), before);
    assert.equal(git(root, "rev-parse", "HEAD"), git(remote, "rev-parse", "refs/tags/v0.1.6"));
  });
});

test("a default branch update during verification prevents pushing a release", async () => {
  await fixture(async (root, remote) => {
    const selected = await selectRelease(root, "0.1.6", "main", missing);
    git(remote, "config", "user.name", "Concurrent developer");
    git(remote, "config", "user.email", "developer@example.test");
    const commit = git(
      remote,
      "commit-tree",
      "HEAD^{tree}",
      "-p",
      "HEAD",
      "-m",
      "Concurrent change",
    );
    git(remote, "update-ref", "refs/heads/main", commit);
    await assert.rejects(pushReleaseTag(root, selected), /default branch changed/);
    assert.equal(git(remote, "tag", "--list", "v0.1.6"), "");
    assert.equal(git(remote, "rev-parse", "refs/heads/main"), commit);
  });
});

test("a rejected branch push cannot leave a new tag behind", async () => {
  await fixture(async (root, remote) => {
    const selected = await selectRelease(root, "0.1.6", "main", missing);
    await writeFile(join(remote, "hooks/pre-receive"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await assert.rejects(pushReleaseTag(root, selected));
    assert.equal(git(remote, "tag", "--list", "v0.1.6"), "");
    assert.equal(git(remote, "rev-parse", "refs/heads/main"), selected.baseSha);
  });
});

test("new versions must exceed the current package, stable tags and npm latest", async () => {
  await fixture(async (root) => {
    for (const version of [
      "0.1.5",
      "0.1.4",
      "v0.1.6",
      "0.01.6",
      "0.1.6-beta.1",
      "0.1.6\n",
      "0.1.6; echo bad",
    ]) {
      await assert.rejects(selectRelease(root, version, "main", missing));
    }
    const latest: typeof fetch = async () =>
      Response.json({ name: "emdash-popcase", version: "0.2.0" });
    await assert.rejects(selectRelease(root, "0.1.6", "main", latest), /newer than/);
    git(root, "tag", "v0.3.0");
    await assert.rejects(selectRelease(root, "0.2.1", "main", missing), /newer than/);
    assert.equal(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version, "0.1.5");
  });
});

test("runtime metadata must match the tagged manifest", async () => {
  await fixture(async (root) => {
    await mkdir(join(root, "dist"));
    await writeFile(
      join(root, "dist/index.js"),
      'export const popcase = () => ({ version: "0.1.5" }); export const createPlugin = popcase;\n',
    );
    await verifyRelease(root, { ...state, version: "0.1.5" });
  });
  await fixture(async (root) => {
    await mkdir(join(root, "dist"));
    await writeFile(
      join(root, "dist/index.js"),
      'export const popcase = () => ({ version: "0.1.0" }); export const createPlugin = () => ({ version: "0.1.5" });\n',
    );
    await assert.rejects(
      verifyRelease(root, { ...state, version: "0.1.5" }),
      /metadata does not match/,
    );
  });
});

test("publication status supports npm and Release retries and missing assets", async () => {
  for (const asset of [true, false]) {
    const request: typeof fetch = async (url) =>
      String(url).includes("registry.npmjs.org")
        ? Response.json({ name: "emdash-popcase", version: "0.1.6" })
        : Response.json({
            prerelease: false,
            draft: !asset,
            assets: asset ? [{ name: "emdash-popcase-0.1.6.tgz" }] : [],
          });
    assert.deepEqual(await publicationState(state, "example/repo", "token", request), {
      npm_published: true,
      release_exists: true,
      release_draft: !asset,
      asset_exists: asset,
    });
  }
  assert.deepEqual(await publicationState(state, "example/repo", "token", missing), {
    npm_published: false,
    release_exists: false,
    release_draft: false,
    asset_exists: false,
  });
});

test("registry and GitHub lookup failures never count as missing publications", async () => {
  for (const code of [401, 403, 429, 500]) {
    const failure: typeof fetch = async () => new Response(null, { status: code });
    await assert.rejects(
      publicationState(state, "example/repo", "token", failure),
      /lookup failed/,
    );
    const githubFailure: typeof fetch = async (url) =>
      String(url).includes("registry.npmjs.org")
        ? new Response(null, { status: 404 })
        : new Response(null, { status: code });
    await assert.rejects(
      publicationState(state, "example/repo", "token", githubFailure),
      /lookup failed/,
    );
  }
});
