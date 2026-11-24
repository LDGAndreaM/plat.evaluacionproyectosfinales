"use client";

import { Archive, ArchiveRestore, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  deleteClass,
  regenerateJoinCode,
  setClassArchived,
  setJoinEnabled,
} from "../../actions";

export function JoinSettings({
  id,
  code,
  enabled,
}: {
  id: string;
  code: string;
  enabled: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Card className="rounded-2xl">
      <CardHeader
        title="Inscripciones"
        description="Cómo entran los estudiantes al grupo."
      />
      <div className="space-y-4 p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-violet-600"
            checked={enabled}
            disabled={pending}
            onChange={(e) => start(() => setJoinEnabled(id, e.target.checked))}
          />
          <span>
            <span className="font-medium text-slate-900">
              Aceptar estudiantes con el código o enlace
            </span>
            <span className="block text-sm text-slate-500">
              Desactívalo cuando ya estén todos para que nadie más se una.
            </span>
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
          <span className="font-mono text-xl font-extrabold tracking-[0.2em] text-violet-800">
            {code}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  "¿Generar un código nuevo? El enlace y el código actuales dejarán de funcionar.",
                )
              )
                start(() => regenerateJoinCode(id));
            }}
          >
            <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />{" "}
            Generar código nuevo
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function DangerZone({
  id,
  name,
  archived,
  studentCount,
  isOwner = true,
}: {
  id: string;
  name: string;
  archived: boolean;
  studentCount: number;
  isOwner?: boolean;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  return (
    <Card className="rounded-2xl">
      <CardHeader title="Archivar o eliminar" />
      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm text-slate-600">
            {archived
              ? "El grupo está archivado: tus estudiantes lo ven como periodo anterior y no se pueden unir más."
              : "Al terminar el periodo, archiva el grupo. Se conserva toda su información y puedes reactivarlo."}
          </p>
          <Button
            variant="secondary"
            className="mt-2"
            disabled={pending}
            onClick={() => start(() => setClassArchived(id, !archived))}
          >
            {archived ? (
              <ArchiveRestore className="size-4" />
            ) : (
              <Archive className="size-4" />
            )}
            {archived ? "Reactivar grupo" : "Archivar grupo"}
          </Button>
        </div>
        {isOwner && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              Eliminar borra el grupo y su lista de estudiantes. No se puede
              deshacer.
            </p>
            <Button
              variant="danger"
              className="mt-2"
              onClick={() => setOpen(true)}
            >
              <Trash2 className="size-4" /> Eliminar grupo
            </Button>
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Eliminar grupo">
        <div className="space-y-4">
          <p className="text-slate-700">
            Se eliminará <strong>{name}</strong> con sus {studentCount}{" "}
            estudiante{studentCount === 1 ? "" : "s"}. Las cuentas de los
            estudiantes no se borran. Escribe <strong>ELIMINAR</strong> para
            confirmar.
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Escribe ELIMINAR"
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={typed.trim().toUpperCase() !== "ELIMINAR" || pending}
              onClick={() => start(() => deleteClass(id))}
            >
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
