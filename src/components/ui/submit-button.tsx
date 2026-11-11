"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import type { ComponentProps } from "react";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingText ?? "Guardando…") : children}
    </Button>
  );
}
