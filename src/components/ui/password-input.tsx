"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./form";

/** Campo de contraseña con botón para mostrarla u ocultarla (y un ícono opcional al inicio). */
export function PasswordInput({ icon, className, ...props }: Omit<ComponentProps<"input">, "type"> & { icon?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">
          {icon}
        </span>
      )}
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", icon ? "pl-11" : null, className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
