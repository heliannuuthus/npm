import type { Element, Properties } from "hast";
import { unified, type Plugin } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import { remarkAdmonition } from "./remark-admonition";
import { remarkCollapse } from "./remark-collapse";
import { remarkHint } from "./remark-hint";
import { remarkTerminology } from "./remark-terminology";
import { remarkTabs } from "./remark-tabs";
import { remarkMarkmap } from "./remark-markmap";
import { remarkExternalLink } from "./remark-external-link";
import { remarkText } from "./remark-text";
import { remarkSteps } from "./remark-steps";

type MarkdownOptions = Parameters<typeof remarkTerminology>[0] & {
  mermaid?: Plugin;
};

interface DirectiveNode {
  type: string;
  data?: { hName?: string; hProperties?: Properties };
  children?: DirectiveNode[];
}

function directiveHandler(state: { all: (node: DirectiveNode) => Element[] }, node: DirectiveNode): Element {
  return {
    type: "element",
    tagName: node.data?.hName || (node.type === "textDirective" ? "span" : "div"),
    properties: node.data?.hProperties ?? {},
    children: state.all(node)
  };
}

export function createMarkdownProcessor({ mermaid, ...terms }: MarkdownOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkAdmonition)
    .use(remarkCollapse)
    .use(remarkHint)
    .use(remarkTerminology, terms)
    .use(remarkTabs);

  if (mermaid) processor.use(mermaid);

  return processor
    .use(remarkMarkmap)
    .use(remarkExternalLink)
    .use(remarkText)
    .use(remarkSteps)
    // @ts-expect-error directive handlers use custom node types not in mdast spec
    .use(remarkRehype, {
      allowDangerousHtml: true,
      handlers: {
        containerDirective: directiveHandler,
        textDirective: directiveHandler,
        leafDirective: directiveHandler
      }
    })
    .use(rehypeSlug);
}
