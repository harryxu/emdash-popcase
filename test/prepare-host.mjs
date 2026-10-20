import { cp, mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const tarball = process.argv[2];
if (!tarball) throw new Error("Pass the absolute path to the packed Popcase tarball.");
const target = await mkdtemp(join(tmpdir(), "popcase-consumer-"));
for (const name of ["src", "seed", "public", "astro.config.mjs", "tsconfig.json", "emdash-env.d.ts", "package.json"]) {
  await cp(join(root, name), join(target, name), { recursive: true }).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

await cp(join(root, "node_modules"), join(target, "node_modules"), {
  recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE,
});
await rm(join(target, "node_modules/popcase"));
async function linkDependencies(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "popcase") continue;
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.name.startsWith("@")) await linkDependencies(from, to);
    else {
      const path = relative(join(root, "node_modules"), await realpath(from));
      if (path.startsWith("..")) throw new Error(`Dependency ${entry.name} is outside the host module graph.`);
      await symlink(join(target, "node_modules", path), to).catch((error) => {
      if (error.code !== "EEXIST") throw error;
      });
    }
  }
}
await linkDependencies(join(root, "plugins/popcase/node_modules"), join(target, "node_modules"));
await mkdir(join(target, "node_modules/popcase"));
execFileSync("tar", ["-xzf", tarball, "-C", join(target, "node_modules/popcase"), "--strip-components=1"]);
execFileSync("python3", ["-c", "import sqlite3,sys; src=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); dst=sqlite3.connect(sys.argv[2]); src.backup(dst); dst.close(); src.close()", join(root, "data.db"), join(target, "data.db")]);
await symlink(join(root, "uploads"), join(target, "uploads"));
await cp(new URL("./fixtures/verification.astro", import.meta.url), join(target, "src/pages/popcase-check.astro"));
await mkdir(join(target, "public/__popcase-images"), { recursive: true });
for (const [name, width, height, color] of [["diagram", 2400, 1600, "#243e4f"], ["detail", 3000, 2000, "#45523b"], ["preview", 480, 320, "#6b4d3e"]]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${color}"/><g stroke="#f5e8c8" stroke-width="3" fill="none"><circle cx="600" cy="370" r="240"/><circle cx="600" cy="370" r="160"/><path d="M180 370h840M600 90v560M360 130l480 480M840 130L360 610"/></g><g fill="#f5e8c8"><circle cx="600" cy="130" r="10"/><circle cx="840" cy="370" r="10"/><circle cx="600" cy="610" r="10"/><circle cx="360" cy="370" r="10"/></g><text x="600" y="730" fill="#f5e8c8" text-anchor="middle" font-family="monospace" font-size="30">POPCASE / ${name.toUpperCase()} / ${width} × ${height}</text></svg>`;
  await writeFile(join(target, `public/__popcase-images/${name}.svg`), svg);
}
console.log(target);
