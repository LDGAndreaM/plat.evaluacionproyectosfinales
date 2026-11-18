"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, IconInput } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { joinClassByCode } from "@/app/(organizador)/aula/actions";

/** Unirse a un grupo con el código que da el docente. */
export function JoinForm({ defaultCode, hiddenCode }: { defaultCode?: string; hiddenCode?: boolean }) {
  const [state, action] = useActionState(joinClassByCode, null);
  if (hiddenCode)
    return (
      <form action={action} className="space-y-3">
        <input type="hidden" name="code" value={defaultCode} />
        <SubmitButton size="lg" className="w-full rounded-xl bg-turquoise-700 text-base font-semibold hover:bg-[#006b5d]" pendingText="Uniendo…">
          Unirme a este grupo
        </SubmitButton>
        <FormMessage state={state} />
      </form>
    );
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <IconInput
            icon={<KeyRound className="size-5" />}
            name="code"
            defaultValue={defaultCode}
            required
            maxLength={12}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Código del grupo (ej. K7M2QXA)"
            aria-label="Código del grupo"
            className="h-11 font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          />
        </div>
        <SubmitButton size="lg" className="h-11" pendingText="Uniendo…">
          Unirme
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
