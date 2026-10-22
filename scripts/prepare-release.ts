import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function prepareRelease(tag: string | undefined, root: string): Promise<string> {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(tag ?? "");
  if (!match || match[0] !== tag) throw new Error("Release tags must use vMAJOR.MINOR.PATCH, for example v0.1.2.");
  const version = match[1];
  const manifestPath = resolve(root, "package.json");
  const manifest: Record<string, unknown> = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.name !== "emdash-popcase") throw new Error("Expected the emdash-popcase package.");

  manifest.version = version;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = await prepareRelease(process.argv[2], process.cwd());
  console.log(`Prepared emdash-popcase ${version} from release tag ${process.argv[2]}.`);
}
