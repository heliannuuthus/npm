import { build } from "esbuild";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readGlossary } from "../glossary.ts";

const { values } = parseArgs({ options: { "glossary-dir": { type: "string" } } });
const pluginDir = fileURLToPath(new URL("./", import.meta.url));
const manifest = JSON.parse(await readFile(new URL("manifest.json", import.meta.url), "utf8"));
const output = `dist/${manifest.id}`;
const glossaryDir = values["glossary-dir"];
const terms = glossaryDir ? readGlossary(glossaryDir).map(({ slug, title, definition, aliases }) => ({
  slug, title, definition, aliases
})) : [];

await build({
  absWorkingDir: pluginDir,
  entryPoints: ["main.ts"],
  outfile: `${output}/main.js`,
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2021",
  external: ["obsidian"],
  define: { BLOG_TERMS: JSON.stringify(terms) },
  minify: true,
  logLevel: "info"
});

await Promise.all(["manifest.json", "styles.css"].map((name) =>
  copyFile(new URL(name, import.meta.url), new URL(`dist/${manifest.id}/${name}`, import.meta.url))
));
