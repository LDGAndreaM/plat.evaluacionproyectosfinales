"use client";

import { Sparkles } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createDemoEvent } from "./actions";

export function DemoButton({ variant = "secondary" }: { variant?: "secondary" | "primary" }) {
  const [state, action] = useActionState(createDemoEvent, null);
  return (
    <form action={action} className="space-y-2">
      <SubmitButton variant={variant} pendingText="Creando…">
        <Sparkles className="size-4" /> Crear evento de demostración
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
