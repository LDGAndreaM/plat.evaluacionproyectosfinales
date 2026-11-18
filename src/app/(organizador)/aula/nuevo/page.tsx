import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ClassForm } from "@/components/aula/class-form";
import { requireTeacher } from "@/lib/auth";
import { createClass } from "../actions";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default async function NewClassPage() {
  await requireTeacher();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/aula" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Mis grupos
      </Link>
      <h1 className="text-3xl font-extrabold text-violet-950">Nuevo grupo</h1>
      <Card className="rounded-2xl p-5 sm:p-6">
        <ClassForm action={createClass} submitLabel="Crear grupo" />
      </Card>
    </div>
  );
}
