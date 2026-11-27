"use client";

import { useEffect, useMemo, useState } from "react";
import { Tldraw, defaultBindingUtils, defaultShapeUtils, type Editor as TldrawEditor, type TLComponents, type TLStoreWithStatus } from "tldraw";
import { useSync } from "@tldraw/sync";
import "tldraw/tldraw.css";
import { DiscourseNodeShapeUtil } from "./DiscourseNodeShapeUtil";
import { NodePalette } from "./NodePalette";
import { NodeSidebar } from "./NodeSidebar";
import { GraphProvider } from "./GraphProvider";
import { CanvasUiProvider } from "./CanvasUiContext";
import { makeAssetStore } from "@/lib/assets";
import { rememberRoom } from "@/lib/rooms";

const customShapeUtils = [DiscourseNodeShapeUtil];
const components: TLComponents = {
  TopPanel: NodePalette,
};

const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL?.replace(/\/+$/, "") || null;
/**
 * tldraw requires a license key on any host other than localhost; without one it hides the editor
 * after a few seconds. The free "with watermark" key from tldraw.dev is enough. Undefined keeps
 * local development working.
 */
const TLDRAW_LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY || undefined;

export default function Canvas({ roomId }: { roomId: string }) {
  useEffect(() => rememberRoom(roomId), [roomId]);
  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  return (
    <GraphProvider>
      <CanvasUiProvider>
        <div className="fixed inset-0 flex">
          <div className="relative min-w-0 flex-1">
            {SYNC_URL ? (
              <SyncedCanvas roomId={roomId} syncUrl={SYNC_URL} onMount={setEditor} />
            ) : (
              <LocalCanvas roomId={roomId} onMount={setEditor} />
            )}
          </div>
          <NodeSidebar editor={editor} />
        </div>
      </CanvasUiProvider>
    </GraphProvider>
  );
}

type MountProps = { onMount: (editor: TldrawEditor) => void };

/** Real-time room on the Cloudflare sync worker. */
function SyncedCanvas({ roomId, syncUrl, onMount }: { roomId: string; syncUrl: string } & MountProps) {
  const assets = useMemo(() => makeAssetStore(syncUrl), [syncUrl]);
  const shapeUtils = useMemo(() => [...defaultShapeUtils, ...customShapeUtils], []);
  const bindingUtils = useMemo(() => [...defaultBindingUtils], []);
  const store = useSync({
    uri: `${syncUrl}/api/connect/${roomId}`,
    assets,
    shapeUtils,
    bindingUtils,
  });
  return <Editor store={store} onMount={onMount} />;
}

/** Fallback when no sync worker is configured: IndexedDB persistence, this browser only. */
function LocalCanvas({ roomId, onMount }: { roomId: string } & MountProps) {
  return <Editor persistenceKey={`dg-canvas-${roomId}`} onMount={onMount} />;
}

function Editor({ onMount, ...props }: { store?: TLStoreWithStatus; persistenceKey?: string } & MountProps) {
  return (
    <Tldraw
      {...props}
      licenseKey={TLDRAW_LICENSE_KEY}
      shapeUtils={customShapeUtils}
      components={components}
      options={{ maxPages: 1 }}
      onMount={(editor) => {
        editor.user.updateUserPreferences({ colorScheme: "light" });
        onMount(editor);
      }}
    />
  );
}
