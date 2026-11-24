"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { GraphData } from "@dg/shared";
import { indexGraph, type GraphIndex } from "@/lib/graph";

interface GraphState {
  index: GraphIndex | null;
  error: string | null;
}

const GraphContext = createContext<GraphState>({ index: null, error: null });

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/graph.json")
      .then(async (r) => {
        if (!r.ok) throw new Error(`graph.json: ${r.status}`);
        return (await r.json()) as GraphData;
      })
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<GraphState>(() => ({ index: data ? indexGraph(data) : null, error }), [data, error]);
  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
}

export const useGraph = () => useContext(GraphContext);
