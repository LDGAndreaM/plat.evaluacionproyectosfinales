"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { AUTH_BUTTON, RolePicker } from "../forms";
import { chooseRole } from "./actions";

export function RoleForm({ next }: { next?: string }) {
  const [state, action] = useActionState(chooseRole, null);
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <RolePicker value={role} onChange={setRole} />
      <FormMessage state={state} />
      <SubmitButton className={AUTH_BUTTON} size="lg" disabled={!role} pendingText="Guardando…">
        Continuar
      </SubmitButton>
    </form>
  );
}
