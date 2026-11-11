import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/card";

export default function Page() {
  return (
    <EmptyState
      icon={<Construction className="size-10" />}
      title="Códigos QR y acceso de evaluadores"
      description="Esta sección se construye en la Fase 3."
    />
  );
}
