export interface Announcement {
  id: string;
  class_id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
}

/** Fijados primero, luego del más reciente al más antiguo. */
export function sortAnnouncements<T extends Pick<Announcement, "pinned" | "created_at">>(list: T[]) {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));
}
