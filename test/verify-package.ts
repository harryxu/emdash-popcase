import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { prepareHost } from "./prepare-host.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const packed = await mkdtemp(join(tmpdir(), "emdash-popcase-pack-"));
let target: string | undefined;
let server: ChildProcess | undefined;

try {
  const [archive]: { filename: string; files: { path: string }[] }[] = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", packed], {
    cwd: root, encoding: "utf8",
  }));
  const files = archive.files.map((file) => file.path);
  for (const required of ["LICENSE", "dist/index.js", "dist/index.d.ts", "dist/middleware.js", "dist/middleware.d.ts", "src/astro/index.ts", "src/client/bootstrap.ts", "src/client/viewer.tsx", "src/admin/index.tsx", "src/settings.ts"]) {
    assert.ok(files.includes(required), `Missing package file: ${required}`);
  }
  assert.ok(files.every((file) => !/^(?:example|test|node_modules|\.git)\//.test(file)));
  assert.ok(!files.some((file) => /^src\/.*\.[cm]?js$/.test(file)), "Source files must remain TypeScript.");
  target = await prepareHost(join(packed, archive.filename));
  execFileSync("pnpm", ["install", "--no-frozen-lockfile"], { cwd: target, stdio: "inherit" });
  await copyFile(new URL("./package-types.ts", import.meta.url), join(target, "popcase-types.ts"));
  await writeFile(join(target, "tsconfig.package.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext",
      strict: true, noEmit: true, skipLibCheck: true, types: [],
    },
    files: ["popcase-types.ts"],
  }));
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.package.json"], {
    cwd: target, stdio: "inherit",
  });
  execFileSync("pnpm", ["build"], { cwd: target, stdio: "inherit" });

  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  server = spawn(process.execPath, ["dist/server/entry.mjs"], {
    cwd: target, env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) }, stdio: "inherit",
  });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Consumer server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await setTimeout(200);
  }
  assert.ok(ready, "Consumer server did not become ready.");
  for (const [query, expected] of [["", 8], ["?case=single", 1], ["?case=new-type", 8], ["?case=excluded", 0], ["?case=video-text", 1], ["?case=video", 3], ["?case=youtube-text", 1], ["?case=youtube", 5]]) {
    const response = await fetch(`${origin}/${query}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-popcase=/g) ?? []).length, expected);
    assert.ok(!html.includes("<!--popcase:") && !html.includes("data-popcase-page"));
    if (query === "?case=video-text") {
      assert.ok(html.includes("Open video: Watch the demo"));
      assert.ok(/<script[^>]+src=/.test(html), "Text-only content must load the viewer bootstrap.");
    }
    if (query === "?case=video") assert.match(html, /<figure\b[^>]*class="emdash-video"/);
    if (String(query).includes("youtube")) {
      assert.ok(html.includes("Open video:"));
      assert.ok(/<script[^>]+src=/.test(html), "YouTube-only content must load the viewer bootstrap.");
      assert.ok(!/<iframe\b/.test(html), "YouTube players must not load before interaction.");
    }
  }
  console.log("Packed plugin installs, builds, and renders independently.");
} finally {
  if (server && server.exitCode === null) {
    const running = server;
    const stopped = new Promise<void>((resolve) => running.once("exit", () => resolve()));
    running.kill();
    await stopped;
  }
  if (target) await rm(target, { recursive: true, force: true });
  await rm(packed, { recursive: true, force: true });
}
