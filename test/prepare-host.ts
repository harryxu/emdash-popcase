import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function prepareHost(tarball: string | undefined) {
  if (!tarball) throw new Error("Pass the path to the packed emdash-popcase tarball.");
  const target = await mkdtemp(join(tmpdir(), "emdash-popcase-consumer-"));
  await cp(new URL("../example/", import.meta.url), target, {
    recursive: true,
    filter: (source) =>
      !/(?:^|[/\\])(?:node_modules|dist|\.astro|\.emdash|uploads|data\.db(?:-.*)?)(?:[/\\]|$)/.test(
        source,
      ),
  });
  const manifestPath = join(target, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.dependencies["emdash-popcase"] = `file:${resolve(tarball)}`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    join(target, "pnpm-workspace.yaml"),
    "strictDepBuilds: true\nallowBuilds:\n  esbuild: true\n  sharp: true\n  workerd: false\n" +
      'minimumReleaseAge: 1440\nminimumReleaseAgeExclude:\n  - emdash\n  - "@emdash-cms/*"\n' +
      "blockExoticSubdeps: true\n",
  );
  return target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await prepareHost(process.argv[2]));
}
