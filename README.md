# npm
TypeScript packages and editor plugins

- `packages/markdown` 提供 `@heliannuuthus/markdown`，供博客和 Obsidian 共享 Markdown directive、partial 和术语解析。
- `apps/obsidian` 提供 **Shared Blog Markdown**。Markdown 和 MDX 文件可以保留博客原有的语法。

## 构建 Obsidian 插件

使用 Node.js 24 和 pnpm。在仓库根目录运行：

```sh
pnpm install
pnpm typecheck
pnpm build:obsidian
```

要在预览里显示博客术语的定义，构建时传入博客仓库的 `terminologies/` 绝对路径。术语会随插件打包，可离线使用。

```sh
pnpm build:obsidian --glossary-dir /absolute/path/to/blog/terminologies
```

把 `apps/obsidian/dist/shared-blog-markdown/` 复制到 vault 的 `.obsidian/plugins/`，然后在 Obsidian 的社区插件设置中启用 **Shared Blog Markdown**。

打开 `.md` 笔记后运行命令 **Shared Blog Markdown: Open blog preview**。`.mdx` 文件会直接打开预览。源文件或引用的 partial 保存时，预览会刷新。把 partial 放在同一个 vault 中并保留相对路径。
