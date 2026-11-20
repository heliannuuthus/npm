import { FileView, Notice, Plugin, TFile, getFrontMatterInfo, normalizePath } from "obsidian";
import { cleanMarkdownBody, getMarkdownImports, inlineMarkdownImports } from "@heliannuuthus/markdown/source";
import { renderMarkdown, type MarkdownPreview } from "./render-markdown";

const VIEW_TYPE = "shared-blog-markdown";

class PreviewView extends FileView {
  private revision = 0;
  private dependencies = new Set<string>();
  private render?: MarkdownPreview;

  getViewType() {
    return VIEW_TYPE;
  }

  canAcceptExtension(extension: string) {
    return extension === "md" || extension === "mdx";
  }

  getDisplayText() {
    return this.file ? `${this.file.basename} · Blog Preview` : "Blog Preview";
  }

  async onOpen() {
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (this.file && (file === this.file || this.dependencies.has(file.path))) {
        void this.onLoadFile(this.file);
      }
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (this.file && (file === this.file || this.dependencies.has(oldPath))) {
        void this.onLoadFile(this.file);
      }
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (this.file && this.dependencies.has(file.path)) void this.onLoadFile(this.file);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (this.file && this.dependencies.has(file.path)) void this.onLoadFile(this.file);
    }));
  }

  async onLoadFile(file: TFile) {
    const revision = ++this.revision;
    const dependencies = new Set<string>();
    try {
      const source = await this.readSource(file, new Set(), dependencies);
      if (revision !== this.revision) return;
      const render = await renderMarkdown(this.app, file, cleanMarkdownBody(source));
      if (revision !== this.revision) {
        render.component.unload();
        return;
      }
      this.clearRender();
      this.dependencies = dependencies;
      this.render = render;
      this.addChild(render.component);
      this.contentEl.replaceChildren(render.element);
      render.enhance();
    } catch (error) {
      if (revision !== this.revision) return;
      this.clearRender();
      this.dependencies = dependencies;
      this.contentEl.createEl("p", {
        text: `Unable to preview ${file.name}. ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  async onUnloadFile() {
    this.revision++;
    this.dependencies.clear();
    this.clearRender();
  }

  async onClose() {
    await this.onUnloadFile();
  }

  private clearRender() {
    if (this.render) {
      this.removeChild(this.render.component);
      this.render = undefined;
    }
    this.contentEl.empty();
  }

  private async readSource(file: TFile, ancestors: Set<TFile>, dependencies: Set<string>): Promise<string> {
    if (ancestors.has(file)) throw new Error(`Circular Markdown import at ${file.path}`);
    ancestors.add(file);
    const raw = await this.app.vault.cachedRead(file);
    const content = raw.slice(getFrontMatterInfo(raw).contentStart);
    const imports = new Map<string, string>();
    for (const [, name, relative] of getMarkdownImports(content)) {
      const parts = relative.startsWith("/") ? [] : (file.parent?.path ?? "").split("/").filter(Boolean);
      for (const part of relative.split("/")) {
        if (!part || part === ".") continue;
        if (part !== "..") {
          parts.push(part);
        } else if (!parts.pop()) {
          throw new Error(`Markdown import leaves the vault: ${relative}`);
        }
      }
      const path = normalizePath(parts.join("/"));
      dependencies.add(path);
      const partial = this.app.vault.getFileByPath(path);
      if (partial) imports.set(name, await this.readSource(partial, ancestors, dependencies));
    }
    ancestors.delete(file);
    return inlineMarkdownImports(content, imports);
  }
}

export default class SharedBlogMarkdown extends Plugin {
  onload() {
    const { workspace } = this.app;
    this.registerView(VIEW_TYPE, (leaf) => new PreviewView(leaf));
    this.registerExtensions(["mdx"], VIEW_TYPE);
    this.addCommand({
      id: "open-preview",
      name: "Open blog preview",
      checkCallback: (checking) => {
        const file = workspace.getActiveFile();
        if (!file || (file.extension !== "md" && file.extension !== "mdx")) return false;
        if (!checking) {
          const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf("split");
          void leaf.setViewState({ type: VIEW_TYPE, state: { file: file.path }, active: true })
            .catch((error: unknown) => new Notice(`Unable to open blog preview. ${String(error)}`));
        }
        return true;
      }
    });
  }
}
