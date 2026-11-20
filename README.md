# npm
TypeScript packages and editor plugins

- `packages/markdown` 提供 `@heliannuuthus/markdown`，供博客和 Obsidian 共享 Markdown directive、partial 和术语解析。
- `apps/obsidian` 提供 **Shared Blog Markdown**。Markdown 和 MDX 文件可以保留博客原有的语法。

## Markdown 插件清单

可以通过 `@heliannuuthus/markdown/<入口>` 单独导入表里的插件。博客和 Obsidian 共用的编译器从 `@heliannuuthus/markdown` 导入。

| 插件 | 导入入口 | 处理内容 |
|---|---|---|
| `remarkAdmonition` | [`remark-admonition`](packages/markdown/src/remark/directives/admonition.ts) | `:::note`、`:::tip` 等提示块 |
| `remarkCollapse` | [`remark-collapse`](packages/markdown/src/remark/directives/collapse.ts) | `:::collapse` 折叠块 |
| `remarkHint` | [`remark-hint`](packages/markdown/src/remark/directives/hint.ts) | `:hint` 行内提示 |
| `remarkTerminology` | [`remark-terminology`](packages/markdown/src/remark/directives/terminology.ts) | `:term` 与术语查找 |
| `remarkTabs` | [`remark-tabs`](packages/markdown/src/remark/directives/tabs.ts) | `:::tabs` 和 `:::tab` |
| `remarkSteps` | [`remark-steps`](packages/markdown/src/remark/directives/steps.ts) | `:::steps` 和 `:::step` |
| `remarkText` | [`remark-text`](packages/markdown/src/remark/directives/text.ts) | `:text` 和 `:::text` |
| `remarkExternalLink` | [`remark-external-link`](packages/markdown/src/remark/directives/external-link.ts) | 外链属性和标记 |
| `remarkMermaid` | [`remark-mermaid`](packages/markdown/src/remark/directives/mermaid.ts) | Mermaid 图表，供博客的 Node 渲染使用 |
| `remarkMarkmap` | [`remark-markmap`](packages/markdown/src/remark/directives/markmap.ts) | Markmap 思维导图标记 |
| `rehypeProseClasses` | [`rehype-prose-classes`](packages/markdown/src/prose-classes.ts) | 文章的 Tailwind 样式类 |

使用 `:::` 或行内 directive 的独立管线需要先注册 `remark-directive`。若后续要生成 HTML，也要配置 directive 节点的 `remark-rehype` handlers。共享编译器已经配置这两步。

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
