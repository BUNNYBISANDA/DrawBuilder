// Tournament-wide announcements (schedule changes, venue notes, etc.) shown
// above every event, on both the edit side and the public watch link —
// unlike events/players, these aren't scoped to one draw, they're scoped to
// the whole tournament (this ?t= link), so each tournament keeps its own list.
export function newNotice(text) {
  const id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return { id, text, createdAt: Date.now() };
}

export function ensureNotices(list) {
  return Array.isArray(list) ? list.filter((n) => n && n.text) : [];
}
