const markdownImport = /^\s*import\s+(\w+)\s+from\s+["']([^"']+\.mdx?)["'];?\s*$/gm;

export function getMarkdownImports(content: string) {
  return content.matchAll(markdownImport);
}

export function inlineMarkdownImports(content: string, imports: ReadonlyMap<string, string>) {
  let resolved = content.replace(markdownImport, "");
  for (const [name, body] of imports) {
    resolved = resolved.replace(new RegExp(`<${name}\\s*/>`, "g"), () => body);
  }
  return resolved;
}

export function cleanMarkdownBody(content: string) {
  const cleaned = content
    .replace(/^[\s\S]*?<!--\s*truncate\s*-->/, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  let inCodeBlock = false;
  return cleaned.split("\n").filter((line) => {
    if (line.trimStart().startsWith("```")) inCodeBlock = !inCodeBlock;
    return inCodeBlock || !/^\s*import\s+.*from\s+["']/.test(line);
  }).join("\n");
}
