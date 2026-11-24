"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "tldraw";
import { searchNodes } from "@/lib/graph";
import { addNodeShape, nodeShapesOnPage } from "@/lib/canvas";
import { useGraph } from "./GraphProvider";
import { useCanvasUi } from "./CanvasUiContext";

/** Search-and-place palette, mounted in tldraw's TopPanel slot. */
export function NodePalette() {
  const editor = useEditor();
  const { index, error } = useGraph();
  const { openNode } = useCanvasUi();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (index ? searchNodes(index, query, typeFilter) : []), [index, query, typeFilter]);
  const onCanvas = useMemo(() => (open ? nodeShapesOnPage(editor) : new Map()), [editor, open, results]); // eslint-disable-line react-hooks/exhaustive-deps

  // "/" focuses the search box when the canvas has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const place = (i: number) => {
    const n = results[i];
    if (!n || !index) return;
    const existing = onCanvas.get(n.id);
    if (existing) {
      editor.select(existing.id);
      editor.zoomToSelection({ animation: { duration: 250 } });
    } else {
      addNodeShape(editor, index, n);
    }
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div
      className="pointer-events-auto relative mt-1 w-[min(560px,calc(100vw-280px))] text-[13px]"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 rounded-lg border border-[var(--dg-line)] bg-white px-2 shadow-sm">
        <span className="text-[var(--dg-muted)]">⌕</span>
        <input
          ref={inputRef}
          value={query}
          placeholder={index ? `Search ${index.data.nodes.length} nodes to place them  ( / )` : error ? `Graph failed to load: ${error}` : "Loading graph…"}
          disabled={!index}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); place(active); }
            else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
          }}
          className="h-9 flex-1 bg-transparent outline-none placeholder:text-[var(--dg-muted)]"
          aria-label="Search nodes"
        />
      </div>

      {open && index && (
        <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-lg border border-[var(--dg-line)] bg-white shadow-xl">
          <div className="flex flex-wrap gap-1 border-b border-[var(--dg-line)] px-2 py-1.5">
            <Chip label="All" color="#6b7280" selected={typeFilter === null} onClick={() => { setTypeFilter(null); setActive(0); }} />
            {index.data.nodeTypes.map((t) => (
              <Chip key={t.id} label={t.label} color={t.color} selected={typeFilter === t.id} onClick={() => { setTypeFilter(typeFilter === t.id ? null : t.id); setActive(0); }} />
            ))}
          </div>
          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {results.length === 0 && <li className="px-3 py-2 text-[var(--dg-muted)]">No matching nodes.</li>}
            {results.map((n, i) => {
              const t = index.typesById.get(n.type);
              const placed = onCanvas.has(n.id);
              return (
                <li
                  key={n.id}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-start gap-2 px-3 py-1.5 ${i === active ? "bg-[var(--dg-bg)]" : ""}`}
                >
                  <span className="mt-0.5 inline-block shrink-0 rounded px-1 py-px text-[10px] font-semibold uppercase text-white" style={{ background: t?.color ?? "#374151" }}>
                    {t?.prefix ?? n.type}
                  </span>
                  <button type="button" className="flex-1 text-left leading-snug" onMouseDown={(e) => e.preventDefault()} onClick={() => place(i)} title={placed ? "Already on canvas: zoom to it" : "Place on canvas"}>
                    {n.title}
                    {placed && <span className="ml-1 text-[11px] text-[var(--dg-muted)]">· on canvas</span>}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { openNode(n.id); setOpen(false); }}
                    className="shrink-0 rounded border border-[var(--dg-line)] px-1.5 text-[11px] text-[var(--dg-muted)] hover:bg-[var(--dg-bg)]"
                    title="Open in sidebar"
                  >
                    read
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({ label, color, selected, onClick }: { label: string; color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-full border px-2 py-px text-[11px] font-medium"
      style={selected ? { background: color, borderColor: color, color: "#fff" } : { borderColor: color, color }}
    >
      {label}
    </button>
  );
}
