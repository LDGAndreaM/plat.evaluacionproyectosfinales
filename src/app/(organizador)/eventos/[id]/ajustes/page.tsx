import { getEvent } from "@/lib/data";
import { Card, CardHeader } from "@/components/ui/card";
import { EventForm } from "@/components/events/event-form";
import { updateEvent } from "../../actions";
import { CollaboratorsForm, DeleteForm, DuplicateForm, EvaluationSettingsForm } from "./settings-forms";

export default async function AjustesPage({ params }: PageProps<"/eventos/[id]/ajustes">) {
  const { id } = await params;
  const { supabase, event, role, canEdit } = await getEvent(id);

  const { data: collabs } = await supabase.from("event_collaborators").select("user_id, role").eq("event_id", id);
  const ids = (collabs ?? []).map((c) => c.user_id);
  const { data: people } = ids.length
    ? await supabase.from("organizers").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string; email: string | null }[] };
  const collaborators = (collabs ?? []).map((c) => {
    const p = people?.find((x) => x.id === c.user_id);
    return { user_id: c.user_id, role: c.role, name: p?.full_name ?? "", email: p?.email ?? "" };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Datos del evento" description="Nombre, fecha, sede e identidad visual." />
        <div className="p-5">
          <EventForm action={updateEvent.bind(null, id)} event={event} submitLabel="Guardar cambios" disabled={!canEdit} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Evaluación y resultados" description="Acceso de evaluadores y forma de calcular el ranking." />
        <div className="p-5">
          <EvaluationSettingsForm event={event} disabled={!canEdit} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Co-organizadores" description="Comparte la administración del evento con otros maestros." />
        <div className="p-5">
          <CollaboratorsForm eventId={id} collaborators={collaborators} isOwner={role === "owner"} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Duplicar evento" description="Reutiliza este evento y sus formularios el próximo semestre." />
        <div className="p-5">
          <DuplicateForm event={event} />
        </div>
      </Card>
      {role === "owner" && (
        <Card className="border-red-200">
          <CardHeader title="Eliminar evento" />
          <div className="p-5">
            <DeleteForm event={event} />
          </div>
        </Card>
      )}
    </div>
  );
}
