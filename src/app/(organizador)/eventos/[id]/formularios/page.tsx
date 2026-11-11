import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/card";

export default function Page() {
  return (
    <EmptyState
      icon={<Construction className="size-10" />}
      title="Constructor de formularios"
      description="Esta sección se construye en la Fase 2."
    />
  );
}
