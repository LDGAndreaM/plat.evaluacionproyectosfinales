import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EventForm } from "@/components/events/event-form";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Nuevo evento" };

export default function NuevoEventoPage() {
  return (
    <div className="space-y-6">
      <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Mis eventos
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo evento</h1>
        <p className="text-sm text-slate-500">
          Empieza en estado <strong>borrador</strong>: nadie podrá evaluar hasta que lo abras.
        </p>
      </div>
      <Card className="p-5 sm:p-6">
        <EventForm action={createEvent} submitLabel="Crear evento" />
      </Card>
    </div>
  );
}
