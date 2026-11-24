import { ClipboardList, FileCheck2, Megaphone, MessageSquareText, QrCode, Star, UserPlus, UserX, type LucideIcon } from "lucide-react";

export interface Notice {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  visible_at: string;
  read_at: string | null;
}

export interface Reminder {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export const NOTICE_ICONS: Record<string, { icon: LucideIcon; cls: string }> = {
  activity: { icon: ClipboardList, cls: "bg-violet-100 text-violet-700" },
  submission: { icon: ClipboardList, cls: "bg-sky-100 text-sky-800" },
  grade: { icon: Star, cls: "bg-[#fff8e6] text-[#9a6400]" },
  excuse: { icon: FileCheck2, cls: "bg-sky-100 text-sky-800" },
  attendance: { icon: QrCode, cls: "bg-turquoise-50 text-turquoise-700" },
  absence: { icon: UserX, cls: "bg-red-100 text-red-700" },
  joined: { icon: UserPlus, cls: "bg-emerald-100 text-emerald-800" },
  announcement: { icon: Megaphone, cls: "bg-[#fff8e6] text-[#9a6400]" },
  comment: { icon: MessageSquareText, cls: "bg-lavender text-violet-700" },
};

export function timeAgo(iso: string, now: number) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "America/Hermosillo" }).format(new Date(iso));
}

