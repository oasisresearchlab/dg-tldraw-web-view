export const RECENT_ROOMS_KEY = "dg-canvas-recent-rooms";

const ROOM_ID = /^[a-z0-9][a-z0-9-_]{0,63}$/;

export const slugifyRoomId = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

export const isValidRoomId = (id: string): boolean => ROOM_ID.test(id);

export function rememberRoom(id: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RECENT_ROOMS_KEY) ?? "[]");
    const next = [id, ...prev.filter((r) => r !== id)].slice(0, 12);
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}
