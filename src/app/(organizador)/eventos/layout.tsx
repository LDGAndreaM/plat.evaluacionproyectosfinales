import { requireTeacher } from "@/lib/auth";

/** Sección solo para docentes. */
export default async function TeacherOnlyLayout({ children }: { children: React.ReactNode }) {
  await requireTeacher();
  return children;
}
