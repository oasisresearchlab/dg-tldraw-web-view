"use client";

import dynamic from "next/dynamic";

// tldraw touches window/document at import time, so it must only load in the browser.
const Canvas = dynamic(() => import("./Canvas"), {
  ssr: false,
  loading: () => <div className="p-6 text-sm text-[var(--dg-muted)]">Loading canvas…</div>,
});

export default function CanvasPage({ roomId }: { roomId: string }) {
  return <Canvas roomId={roomId} />;
}
