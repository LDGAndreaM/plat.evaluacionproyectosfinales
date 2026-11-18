"use client";

import { Download, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { downloadBlob, slugify } from "@/lib/qr";
import { exportAttendanceCsv } from "../../attendance-actions";

export function ExportAttendance({ classId }: { classId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await exportAttendanceCsv(classId);
          if (res) downloadBlob(`asistencia-${slugify(res.name)}.csv`, new Blob(["﻿" + res.csv], { type: "text/csv;charset=utf-8" }));
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Descargar (CSV)
    </Button>
  );
}
