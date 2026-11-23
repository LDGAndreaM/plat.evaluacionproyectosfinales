import { requireTeacher } from "@/lib/auth";

export default async function TeacherOnlyLayout({ children }: { children: React.ReactNode }) {
  await requireTeacher();
  return children;
}
