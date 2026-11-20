import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import {
  type App, type TFile, Component, MarkdownRenderer, Modal,
  finishRenderMath, loadMathJax, loadPrism, renderMath, sanitizeHTMLToDom, setTooltip
} from "obsidian";
import rehypeStringify from "rehype-stringify";
import { createMarkdownProcessor } from "../index";
import type { Term } from "../glossary";

type TermEntry = Pick<Term, "slug" | "title" | "definition" | "aliases">;
declare const BLOG_TERMS: TermEntry[];

const terms = new Map<string, TermEntry>();
for (const term of BLOG_TERMS) {
  terms.set(term.slug, term);
  for (const alias of term.aliases ?? []) terms.set(alias.toLowerCase(), term);
}

export interface MarkdownPreview {
  element: HTMLElement;
  component: Component;
  enhance: () => void;
}

export async function renderMarkdown(app: App, file: TFile, source: string): Promise<MarkdownPreview> {
  const html = await createMarkdownProcessor({
    source: file.path,
    resolveTerm: (slug) => terms.get(slug) ?? terms.get(slug.toLowerCase())
  }).use(rehypeStringify, { allowDangerousHtml: true }).process(source);

  const element = createDiv({ cls: "markdown-rendered shared-blog-preview" });
  element.append(sanitizeHTMLToDom(String(html)));
  const component = new Component();

  resolveLinks(app, element, file.path);
  for (const island of element.querySelectorAll<HTMLElement>("[data-island]")) {
    const kind = island.dataset.island;
    if (kind === "Tabs" || kind === "Steps") renderSwitchable(island, kind === "Tabs");
    if (kind === "Hint" || kind === "TermPreview") renderInlineInfo(app, island);
  }

  return {
    element,
    component,
    enhance() {
      void renderCodeAndMath(app, element, file.path, component).catch((error: unknown) => {
        console.error("Shared Blog Markdown could not enhance code or math", error);
      });
      for (const island of element.querySelectorAll<HTMLElement>('[data-island="Markmap"]')) {
        renderMarkmap(island, component);
      }
    }
  };
}

function renderSwitchable(island: HTMLElement, tabs: boolean) {
  const panels = [...island.querySelectorAll<HTMLElement>(tabs ? ":scope > [data-tab]" : ":scope > [data-step]")];
  if (!panels.length) return;
  const header = tabs ? island.createDiv({ cls: "shared-blog-tabs", prepend: true }) : null;
  const bodies: HTMLElement[] = [];
  const buttons = panels.map((panel, index) => {
    const title = tabs ? panel.dataset.tab || "Tab" : panel.dataset.step || `Step ${index + 1}`;
    if (header) {
      bodies.push(panel);
      return header.createEl("button", { text: title, attr: { type: "button" } });
    }
    const body = panel.createDiv();
    while (panel.firstChild !== body) body.append(panel.firstChild!);
    bodies.push(body);
    return panel.createEl("button", { text: `${index + 1}. ${title}`, attr: { type: "button" }, prepend: true });
  });
  const select = (active: number) => {
    buttons.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === active));
      bodies[index].hidden = index !== active;
    });
  };
  buttons.forEach((button, index) => button.addEventListener("click", () => select(index)));
  select(0);
}

function renderInlineInfo(app: App, island: HTMLElement) {
  const { tip, slug, termTitle, definition } = island.dataset;
  const body = tip || definition;
  if (!body) return;
  const button = createEl("button", { cls: "shared-blog-inline", attr: { type: "button" } });
  button.append(...island.childNodes);
  island.replaceWith(button);
  setTooltip(button, body);
  button.addEventListener("click", () => {
    const modal = new Modal(app);
    modal.setTitle(termTitle || button.textContent || slug || "Details");
    modal.setContent(body);
    modal.open();
  });
}

function resolveLinks(app: App, element: HTMLElement, source: string) {
  const absolute = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;
  for (const image of element.querySelectorAll<HTMLImageElement>("img[src]")) {
    const src = image.getAttribute("src")!;
    if (absolute.test(src)) continue;
    const path = src.split(/[?#]/, 1)[0];
    const file = app.metadataCache.getFirstLinkpathDest(parseEncoded(path), source);
    const asset = file ?? (path.startsWith("/") ? app.vault.getFileByPath(`public${parseEncoded(path)}`) : null);
    if (asset) image.src = app.vault.getResourcePath(asset);
  }
  element.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
    const href = link?.getAttribute("href");
    if (!href || absolute.test(href)) return;
    if (href.startsWith("#")) {
      const id = parseEncoded(href.slice(1));
      const target = [...element.querySelectorAll<HTMLElement>("[id]")].find((node) => node.id === id);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ block: "start" });
        return;
      }
    }
    event.preventDefault();
    void app.workspace.openLinkText(parseEncoded(href), source, event.metaKey || event.ctrlKey);
  });
}

function parseEncoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function renderCodeAndMath(app: App, element: HTMLElement, source: string, component: Component) {
  const math = [...element.querySelectorAll<HTMLElement>("code.language-math")];
  const syntax = [...element.querySelectorAll<HTMLElement>("pre > code[class^=language-]")];
  const diagrams = syntax.filter((code) => code.classList.contains("language-mermaid"));
  const codeBlocks = syntax.filter((code) =>
    !code.classList.contains("language-mermaid") && !code.classList.contains("language-math")
  );
  await Promise.all([
    ...diagrams.map(async (code) => {
      const body = code.textContent ?? "";
      let fence = "```";
      while (body.includes(fence)) fence += "`";
      const diagram = createDiv();
      code.parentElement?.replaceWith(diagram);
      await MarkdownRenderer.render(app, `${fence}mermaid\n${body}\n${fence}`, diagram, source, component);
    }),
    (async () => {
      if (!math.length) return;
      await loadMathJax();
      if (!element.isConnected) return;
      for (const code of math) {
        const display = code.classList.contains("math-display");
        const target = display ? code.parentElement ?? code : code;
        target.replaceWith(renderMath(code.textContent ?? "", display));
      }
      await finishRenderMath();
    })(),
    (async () => {
      if (!codeBlocks.length) return;
      const prism = await loadPrism();
      if (element.isConnected) codeBlocks.forEach((code) => prism.highlightElement(code));
    })()
  ]);
}

function renderMarkmap(island: HTMLElement, component: Component) {
  const source = island.dataset.value;
  if (!source) return;
  const observer = new ResizeObserver(() => {
    if (!island.clientWidth) return;
    observer.disconnect();
    try {
      const { root } = new Transformer().transform(source);
      const sanitized = createDiv();
      const nodes = [root];
      for (const node of nodes) {
        sanitized.replaceChildren(sanitizeHTMLToDom(node.content));
        node.content = sanitized.innerHTML;
        nodes.push(...node.children);
      }
      const svg = island.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
      island.replaceChildren(svg);
      const map = Markmap.create(svg, { autoFit: true }, root);
      component.register(() => map.destroy());
    } catch (error) {
      island.setText(`Unable to render mind map. ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  observer.observe(island);
  component.register(() => observer.disconnect());
}
