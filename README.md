# npm
TypeScript packages and editor plugins

每个插件在仓库根目录有自己的文件夹。Obsidian 插件源码位于 [`obsidian/`](obsidian/)。

## Markdown 插件清单

各插件的导入路径与目录名一致。例如 `import { remarkTabs } from "@heliannuuthus/npm/remark-tabs"`。博客和 Obsidian 使用的共享编译器在根目录的 `index.ts`。

| 插件 | 导入入口 | 处理内容 |
|---|---|---|
| `remarkAdmonition` | [`remark-admonition`](remark-admonition/) | `:::note`、`:::tip` 等提示块 |
| `remarkCollapse` | [`remark-collapse`](remark-collapse/) | `:::collapse` 折叠块 |
| `remarkHint` | [`remark-hint`](remark-hint/) | `:hint` 行内提示 |
| `remarkTerminology` | [`remark-terminology`](remark-terminology/) | `:term` 与术语查找 |
| `remarkTabs` | [`remark-tabs`](remark-tabs/) | `:::tabs` 和 `:::tab` |
| `remarkSteps` | [`remark-steps`](remark-steps/) | `:::steps` 和 `:::step` |
| `remarkText` | [`remark-text`](remark-text/) | `:text` 和 `:::text` |
| `remarkExternalLink` | [`remark-external-link`](remark-external-link/) | 外链属性和标记 |
| `remarkMermaid` | [`remark-mermaid`](remark-mermaid/) | Mermaid 图表，供博客的 Node 渲染使用 |
| `remarkMarkmap` | [`remark-markmap`](remark-markmap/) | Markmap 思维导图标记 |
| `rehypeProseClasses` | [`rehype-prose-classes`](rehype-prose-classes/) | 文章的 Tailwind 样式类 |

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

把 `obsidian/dist/shared-blog-markdown/` 复制到 vault 的 `.obsidian/plugins/`，然后在 Obsidian 的社区插件设置中启用 **Shared Blog Markdown**。

打开 `.md` 笔记后运行命令 **Shared Blog Markdown: Open blog preview**。`.mdx` 文件会直接打开预览。源文件或引用的 partial 保存时，预览会刷新。把 partial 放在同一个 vault 中并保留相对路径。
