import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { prepareHost } from "./prepare-host.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const packed = await mkdtemp(join(tmpdir(), "emdash-popcase-pack-"));
let target;
let server;

try {
  const [archive] = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", packed], {
    cwd: root, encoding: "utf8",
  }));
  const files = archive.files.map((file) => file.path);
  for (const required of ["LICENSE", "index.js", "index.d.ts", "src/astro/index.ts", "src/client/bootstrap.ts", "src/client/viewer.tsx"]) {
    assert.ok(files.includes(required), `Missing package file: ${required}`);
  }
  assert.ok(files.every((file) => !/^(?:example|test|node_modules|\.git)\//.test(file)));
  target = await prepareHost(join(packed, archive.filename));
  execFileSync("pnpm", ["install", "--no-frozen-lockfile"], { cwd: target, stdio: "inherit" });
  execFileSync("pnpm", ["build"], { cwd: target, stdio: "inherit" });

  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
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
  for (const [query, expected] of [["", 8], ["?case=single", 1], ["?case=excluded", 0]]) {
    const response = await fetch(`${origin}/${query}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal((html.match(/data-popcase=/g) ?? []).length, expected);
    assert.ok(!html.includes("<!--popcase:") && !html.includes("data-popcase-page"));
  }
  console.log("Packed plugin installs, builds, and renders independently.");
} finally {
  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await stopped;
  }
  if (target) await rm(target, { recursive: true, force: true });
  await rm(packed, { recursive: true, force: true });
}
