import { marked } from "marked";
import DOMPurify from "dompurify";
import type { GraphIndex } from "./graph";

marked.setOptions({ gfm: true, breaks: false });

/** Obsidian callouts (`> [!info] Title`) become a bold first line inside the blockquote. */
const convertCallouts = (md: string) =>
  md.replace(/^> \[!(\w+)\]([+-]?)\s*(.*)$/gm, (_m, kind: string, _fold, title: string) => `> **${title || kind}**`);

export function renderMarkdown(md: string, index: GraphIndex | null): string {
  const html = marked.parse(convertCallouts(md), { async: false }) as string;
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["target", "rel"] });
  if (!index) return clean;
  // Tag links that point at nodes in the store so the sidebar can intercept them.
  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html");
  for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = (a.getAttribute("href") ?? "").replace(/\/+$/, "");
    const node = index.nodesByUrl.get(href);
    if (node) {
      a.setAttribute("data-node-id", node.id);
      a.setAttribute("title", `${node.type}: ${node.title}`);
    } else if (/^https?:\/\//.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  }
  return doc.body.firstElementChild?.innerHTML ?? clean;
}
