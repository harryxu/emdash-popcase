import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = dirname(require.resolve("exifreader/package.json"));
const target = fileURLToPath(new URL("../dist/vendor/exifreader/", import.meta.url));
const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));

// Ship the unchanged ES modules, without the dependency's custom-build lifecycle.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(join(source, "src"), target, { recursive: true });
await cp(join(source, "exif-reader.d.ts"), join(target, "exif-reader.d.ts"));
await cp(join(source, "LICENSE"), join(target, "LICENSE"));
await writeFile(
  join(target, "NOTICE"),
  `ExifReader ${manifest.version}\nCopyright (C) 2011-2026 Mattias Wallander\n` +
    "https://github.com/mattiasw/ExifReader\n" +
    "Unmodified ES module source and declarations, distributed under MPL-2.0.\n" +
    "See LICENSE in this directory.\n",
);
