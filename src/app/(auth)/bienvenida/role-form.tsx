"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { PrivacyConsent } from "@/components/brand/privacy-consent";
import { AUTH_BUTTON, RolePicker } from "../forms";
import { chooseRole } from "./actions";

export function RoleForm({ next, needsRole = true }: { next?: string; needsRole?: boolean }) {
  const [state, action] = useActionState(chooseRole, null);
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [accepted, setAccepted] = useState(false);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      {needsRole && <RolePicker value={role} onChange={setRole} />}
      <PrivacyConsent checked={accepted} onChange={setAccepted} />
      <FormMessage state={state} />
      <SubmitButton className={AUTH_BUTTON} size="lg" disabled={(needsRole && !role) || !accepted} pendingText="Guardando…">
        Continuar
      </SubmitButton>
    </form>
  );
}
