"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RECENT_ROOMS_KEY, slugifyRoomId } from "@/lib/rooms";

const readRecent = () => {
  try {
    return localStorage.getItem(RECENT_ROOMS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const subscribeToStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const synced = Boolean(process.env.NEXT_PUBLIC_SYNC_URL);
  const recentRaw = useSyncExternalStore(subscribeToStorage, readRecent, () => "[]");
  const recent = useMemo<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(recentRaw);
      return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
    } catch {
      return [];
    }
  }, [recentRaw]);

  const open = (raw: string) => {
    const id = slugifyRoomId(raw);
    if (id) router.push(`/c/${id}`);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Discourse Graph Canvas</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--dg-muted)]">
        A shared tldraw canvas for a discourse graph. Search the imported nodes, place them,
        draw arrows and notes around them, and open any node in the sidebar to read it. Everyone
        on the same canvas link sees the same thing{synced ? "" : " once a sync server is configured"}.
      </p>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          open(name);
        }}
      >
        <input
          className="flex-1 rounded-md border border-[var(--dg-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--dg-accent)]"
          placeholder="Canvas name, e.g. lives-overview"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Canvas name"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--dg-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Open canvas
        </button>
      </form>

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--dg-muted)]">Recent</h2>
          <ul className="mt-2 divide-y divide-[var(--dg-line)] rounded-md border border-[var(--dg-line)] bg-white">
            {recent.map((r) => (
              <li key={r}>
                <Link href={`/c/${r}`} className="block px-3 py-2 text-sm hover:bg-[var(--dg-bg)]">
                  {r}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-xs text-[var(--dg-muted)]">
        Sync: {synced ? "connected to a sync worker" : "not configured, canvases are saved in this browser only"}.
      </p>
    </main>
  );
}
