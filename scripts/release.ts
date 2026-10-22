import { execFileSync } from "node:child_process";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { prepareRelease } from "./prepare-release.ts";

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const registry = "https://registry.npmjs.org/emdash-popcase";

interface PackageMetadata { name: string; version: string }
interface GitHubRelease { prerelease: boolean; draft: boolean; assets: { name: string }[] }

export interface ReleaseState {
  version: string;
  tag: string;
  branch: string;
  baseSha: string;
  existingTag: boolean;
}

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function assertVersion(version: string): void {
  if (!stableVersion.test(version) || version.trim() !== version) throw new Error("Version must use MAJOR.MINOR.PATCH without a v prefix.");
}

function isNewer(version: string, previous: string): boolean {
  assertVersion(previous);
  const left = version.split(".").map(BigInt);
  const right = previous.split(".").map(BigInt);
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

async function getJson<T>(url: string, request: typeof fetch, token?: string): Promise<T | null> {
  const response = await request(url, {
    headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } : {},
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Release lookup failed: ${response.status} ${url}`);
  return response.json();
}

async function assertManifest(root: string, version: string): Promise<void> {
  const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (manifest.name !== "emdash-popcase" || manifest.version !== version) {
    throw new Error(`Expected emdash-popcase ${version} in the tagged package.json; refusing to rewrite an existing tag.`);
  }
}

export async function selectRelease(root: string, version: string, branch: string, request: typeof fetch = fetch): Promise<ReleaseState> {
  assertVersion(version);
  git(root, "check-ref-format", `refs/heads/${branch}`);
  if (git(root, "status", "--porcelain")) throw new Error("Release checkout must be clean.");
  const tag = `v${version}`;
  git(root, "fetch", "--tags", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`);
  const remoteTag = git(root, "ls-remote", "--refs", "origin", `refs/tags/${tag}`);
  if (remoteTag) {
    git(root, "fetch", "origin", `refs/tags/${tag}:refs/tags/${tag}`);
    git(root, "checkout", "--detach", `refs/tags/${tag}`);
    await assertManifest(root, version);
    return { version, tag, branch, baseSha: git(root, "rev-parse", "HEAD"), existingTag: true };
  }

  git(root, "checkout", "--detach", `refs/remotes/origin/${branch}`);
  const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (manifest.name !== "emdash-popcase") throw new Error("Expected the emdash-popcase package.");
  const previousVersions = [manifest.version, ...git(root, "tag", "--list", "v*").split("\n")
    .map((value) => value.slice(1)).filter((value) => stableVersion.test(value))];
  const latest = await getJson<PackageMetadata>(`${registry}/latest`, request);
  if (latest) previousVersions.push(latest.version);
  if (previousVersions.some((previous) => !isNewer(version, previous))) {
    throw new Error("A new release must be newer than the package, existing stable tags, and npm latest version.");
  }
  if (await getJson(`${registry}/${version}`, request)) throw new Error(`npm ${version} already exists without a matching Git tag.`);
  const baseSha = git(root, "rev-parse", "HEAD");
  await prepareRelease(tag, root);
  return { version, tag, branch, baseSha, existingTag: false };
}

export async function verifyRelease(root: string, state: ReleaseState): Promise<void> {
  await assertManifest(root, state.version);
  const { popcase, createPlugin } = await import(pathToFileURL(resolve(root, "dist/index.js")).href);
  if (popcase().version !== state.version || createPlugin().version !== state.version) {
    throw new Error("Built plugin metadata does not match the release version.");
  }
}

export async function pushReleaseTag(root: string, state: ReleaseState): Promise<void> {
  await assertManifest(root, state.version);
  if (state.existingTag) {
    if (git(root, "status", "--porcelain")) throw new Error("Verification changed the tagged source.");
    const remoteTag = git(root, "ls-remote", "--refs", "origin", `refs/tags/${state.tag}`).split(/\s/)[0];
    if (remoteTag !== git(root, "rev-parse", `refs/tags/${state.tag}`) || git(root, "rev-parse", "HEAD") !== state.baseSha) {
      throw new Error("The release tag changed during verification.");
    }
    return;
  }
  if (git(root, "status", "--porcelain") !== "M package.json") {
    throw new Error("Only package.json may change when preparing a release.");
  }
  const remoteSha = git(root, "ls-remote", "--refs", "origin", `refs/heads/${state.branch}`).split(/\s/)[0];
  if (remoteSha !== state.baseSha || git(root, "rev-parse", "HEAD") !== state.baseSha) {
    throw new Error("The default branch changed during verification. Start a new release run.");
  }
  git(root, "add", "package.json");
  git(root, "-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "commit", "-m", `chore: release ${state.tag}`);
  git(root, "tag", state.tag);
  git(root, "push", "--atomic", "origin", `HEAD:refs/heads/${state.branch}`, `refs/tags/${state.tag}`);
}

export async function publicationState(state: ReleaseState, repository: string, token: string, request: typeof fetch = fetch) {
  const published = await getJson<PackageMetadata>(`${registry}/${state.version}`, request);
  if (published && (published.name !== "emdash-popcase" || published.version !== state.version)) {
    throw new Error("Unexpected npm package metadata.");
  }
  const release = await getJson<GitHubRelease>(`https://api.github.com/repos/${repository}/releases/tags/${state.tag}`, request, token);
  if (release?.prerelease) throw new Error("The existing GitHub Release is a prerelease.");
  return {
    npm_published: Boolean(published),
    release_exists: Boolean(release),
    release_draft: Boolean(release?.draft),
    asset_exists: Boolean(release?.assets?.some((asset: { name: string }) => asset.name === `emdash-popcase-${state.version}.tgz`)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, statePath, version, branch] = process.argv.slice(2);
  if (!statePath) throw new Error("A release state file is required.");
  const root = process.cwd();
  if (command === "select") {
    const state = await selectRelease(root, version, branch);
    await writeFile(statePath, JSON.stringify(state));
    console.log(`${state.existingTag ? "Using existing tag" : "Preparing new tag"} ${state.tag}.`);
  } else {
    const state: ReleaseState = JSON.parse(await readFile(statePath, "utf8"));
    if (command === "verify") await verifyRelease(root, state);
    else if (command === "push-tag") await pushReleaseTag(root, state);
    else if (command === "status") {
      if (!process.env.GITHUB_REPOSITORY || !process.env.GH_TOKEN || !process.env.GITHUB_OUTPUT) {
        throw new Error("GitHub repository, token, and output file are required.");
      }
      const status = await publicationState(state, process.env.GITHUB_REPOSITORY, process.env.GH_TOKEN);
      await appendFile(process.env.GITHUB_OUTPUT, Object.entries(status).map(([key, value]) => `${key}=${value}\n`).join(""));
    } else throw new Error(`Unknown release command: ${command}`);
  }
}
