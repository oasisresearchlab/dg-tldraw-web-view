"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface CanvasUi {
  openNodeId: string | null;
  openNode: (id: string) => void;
  closeNode: () => void;
}

const Ctx = createContext<CanvasUi>({ openNodeId: null, openNode: () => {}, closeNode: () => {} });

/**
 * ShapeUtil instances are classes, not components, so they can't read React context.
 * The provider registers the current opener here and the util calls it on double-click.
 */
let registeredOpener: ((id: string) => void) | null = null;
export const openNodeFromShapeUtil = (id: string) => registeredOpener?.(id);

export function CanvasUiProvider({ children }: { children: React.ReactNode }) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const openNode = useCallback((id: string) => setOpenNodeId(id), []);
  const closeNode = useCallback(() => setOpenNodeId(null), []);

  useEffect(() => {
    registeredOpener = openNode;
    return () => {
      if (registeredOpener === openNode) registeredOpener = null;
    };
  }, [openNode]);

  const value = useMemo(() => ({ openNodeId, openNode, closeNode }), [openNodeId, openNode, closeNode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCanvasUi = () => useContext(Ctx);
