"use client";

import { Fragment, useMemo, type MouseEvent } from "react";
import type { Editor } from "tldraw";
import type { GraphNode } from "@dg/shared";
import { linkedNodes } from "@/lib/graph";
import { renderMarkdown } from "@/lib/markdown";
import { addNodeShapeNextTo } from "@/lib/canvas";
import { useGraph } from "./GraphProvider";
import { useCanvasUi } from "./CanvasUiContext";

/** Sits beside the canvas as a flex sibling; the editor instance arrives from Tldraw's onMount. */
export function NodeSidebar({ editor }: { editor: Editor | null }) {
  const { index } = useGraph();
  const { openNodeId, openNode, closeNode } = useCanvasUi();
  const node = openNodeId && index ? index.nodesById.get(openNodeId) : undefined;

  const html = useMemo(() => (node ? renderMarkdown(node.content, index) : ""), [node, index]);
  const groups = useMemo(() => (node && index ? linkedNodes(index, node.id) : []), [node, index]);

  if (!openNodeId) return null;
  if (!index) return <Panel onClose={closeNode}>Loading graph…</Panel>;
  if (!node)
    return (
      <Panel onClose={closeNode}>
        <p className="text-sm text-[var(--dg-muted)]">
          Node <code>{openNodeId}</code> is not in the imported node store.
        </p>
      </Panel>
    );

  const type = index.typesById.get(node.type);
  const onContentClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a[data-node-id]") as HTMLAnchorElement | null;
    if (a) {
      e.preventDefault();
      openNode(a.dataset.nodeId!);
    }
  };
  const place = (n: GraphNode) => editor && addNodeShapeNextTo(editor, index, n, node.id);

  return (
    <Panel onClose={closeNode}>
      <div className="flex items-center gap-2">
        <TypePill label={type?.label ?? node.type} color={type?.color ?? "#374151"} />
        <span className="text-xs text-[var(--dg-muted)]">{node.id}</span>
        {node.status && <span className="text-xs text-[var(--dg-muted)]">· {node.status}</span>}
      </div>
      <h2 className="mt-2 text-base font-semibold leading-snug">{node.title}</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => place(node)}
          className="rounded-md border border-[var(--dg-line)] bg-white px-2.5 py-1 text-xs font-medium hover:bg-[var(--dg-bg)]"
        >
          Show on canvas
        </button>
        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[var(--dg-line)] bg-white px-2.5 py-1 text-xs font-medium hover:bg-[var(--dg-bg)]"
          >
            Open source page ↗
          </a>
        )}
      </div>

      <div className="dg-prose mt-4" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />

      {groups.length > 0 && (
        <section className="mt-6 border-t border-[var(--dg-line)] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--dg-muted)]">Linked nodes</h3>
          {groups.map((g) => (
            <div key={g.label} className="mt-3">
              <div className="text-xs font-medium text-[var(--dg-muted)]">{g.label}</div>
              <ul className="mt-1 space-y-1">
                {g.nodes.map((n) => {
                  const t = index.typesById.get(n.type);
                  return (
                    <li key={n.id} className="flex items-start gap-2 rounded-md border border-[var(--dg-line)] bg-white px-2 py-1.5">
                      <TypePill label={t?.prefix ?? n.type} color={t?.color ?? "#374151"} small />
                      <button
                        type="button"
                        onClick={() => openNode(n.id)}
                        className="flex-1 text-left text-xs leading-snug hover:underline"
                        title="Open in sidebar"
                      >
                        {n.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => place(n)}
                        className="shrink-0 rounded border border-[var(--dg-line)] px-1.5 text-xs text-[var(--dg-muted)] hover:bg-[var(--dg-bg)]"
                        title="Place on canvas next to this node"
                      >
                        + canvas
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      <Meta node={node} />
    </Panel>
  );
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <aside className="flex w-[min(420px,100vw)] shrink-0 flex-col border-l border-[var(--dg-line)] bg-[var(--dg-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--dg-line)] px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--dg-muted)]">Node</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-sm text-[var(--dg-muted)] hover:bg-white"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </aside>
  );
}

function TypePill({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded font-semibold uppercase tracking-wide text-white ${small ? "px-1 py-px text-[10px]" : "px-1.5 py-0.5 text-[11px]"}`}
      style={{ background: color }}
    >
      {label}
    </span>
  );
}

function Meta({ node }: { node: GraphNode }) {
  const extras = Object.entries(node.extras).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length));
  const hasAny = node.created || node.modified || node.creator || node.tags.length || extras.length;
  if (!hasAny) return null;
  return (
    <section className="mt-6 border-t border-[var(--dg-line)] pt-4 text-xs text-[var(--dg-muted)]">
      <h3 className="font-semibold uppercase tracking-wide">Metadata</h3>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {node.creator && (<><dt>Creator</dt><dd>{node.creator}</dd></>)}
        {node.created && (<><dt>Created</dt><dd>{node.created.slice(0, 10)}</dd></>)}
        {node.modified && (<><dt>Modified</dt><dd>{node.modified.slice(0, 10)}</dd></>)}
        {extras.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="truncate">{k}</dt>
            <dd className="break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
          </Fragment>
        ))}
      </dl>
      {node.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.tags.map((t) => (
            <span key={t} className="rounded bg-white px-1.5 py-0.5 text-[11px]">{t}</span>
          ))}
        </div>
      )}
    </section>
  );
}

