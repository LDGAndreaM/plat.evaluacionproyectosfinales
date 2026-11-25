"use client";

import { Archive, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderReport } from "@/components/aula/report-export";
import { buildReport, REPORTS, type ReportData } from "@/lib/aula/reports";
import { studentName } from "@/lib/aula/types";
import { downloadBlob, slugify } from "@/lib/qr";
import { backupManifest } from "../../backup-actions";

const safe = (s: string) => s.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** Descarga un ZIP con todos los reportes y archivos del grupo. Se arma en el navegador. */
export function BackupCard({ data, meta }: { data: ReportData; meta: string }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const root = zip.folder(safe(`Respaldo ${data.cls.name}${data.cls.period ? ` ${data.cls.period}` : ""}`))!;

      setStep("Generando reportes…");
      for (const r of REPORTS) {
        if (r.key === "individual") continue;
        const tables = buildReport(r.key, data);
        root.file(`Reportes/${r.title}.xlsx`, await renderReport("xlsx", tables, { heading: `${r.title} · ${data.cls.name}`, meta }));
      }
      root.file(
        "Reportes/Calificación final.pdf",
        await renderReport("pdf", buildReport("final_grades", data), { heading: `Calificación final · ${data.cls.name}`, meta }),
      );
      for (let i = 0; i < data.students.length; i++) {
        const s = data.students[i];
        setStep(`Reportes individuales ${i + 1} de ${data.students.length}…`);
        const name = `${s.last_name}${s.last_name ? ", " : ""}${s.first_name}`;
        root.file(
          `Reportes individuales/${safe(name)}.pdf`,
          await renderReport("pdf", buildReport("individual", data, s.id), { heading: `${studentName(s)} · ${data.cls.name}`, meta }),
        );
      }

      setStep("Buscando archivos…");
      const res = await backupManifest(data.cls.id);
      if (!res.ok) throw new Error(res.error);
      res.texts.forEach((t) => root.file(t.zip, t.text));
      let failed = 0;
      let done = 0;
      const queue = [...res.files];
      const worker = async () => {
        for (let f = queue.shift(); f; f = queue.shift()) {
          try {
            if (!f.url) throw new Error();
            const r = await fetch(f.url);
            if (!r.ok) throw new Error();
            root.file(f.zip, await r.blob());
          } catch {
            failed++;
          }
          done++;
          setStep(`Descargando archivos ${done} de ${res.files.length}…`);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);

      root.file(
        "LEEME.txt",
        [
          `Respaldo del grupo ${data.cls.name}`,
          meta,
          "",
          "Reportes/                 Reportes del grupo en Excel y calificación final en PDF.",
          "Reportes individuales/    Un PDF por estudiante.",
          "Entregas/                 Archivos y respuestas por actividad y estudiante.",
          "Justificantes/            Comprobantes enviados por los estudiantes (pueden contener datos de salud: guárdalos en un lugar seguro).",
          "Material de actividades/  Archivos que adjuntaste a las actividades.",
          failed ? `\nNo se pudieron descargar ${failed} archivo(s).` : "",
        ].join("\n"),
      );

      setStep("Comprimiendo…");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadBlob(`respaldo-${slugify(data.cls.name)}.zip`, blob);
      setResult({
        ok: true,
        text: `Respaldo descargado: ${res.files.length - failed} archivos y ${REPORTS.length - 1 + data.students.length + 1} reportes.${failed ? ` ${failed} archivo(s) no se pudieron descargar.` : ""}`,
      });
    } catch {
      setResult({ ok: false, text: "No se pudo generar el respaldo. Inténtalo de nuevo." });
    }
    setStep("");
    setBusy(false);
  }

  return (
    <Card className="flex flex-col gap-4 rounded-2xl border-violet-200 bg-gradient-to-r from-violet-50 to-white p-5 sm:flex-row sm:items-center">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
        <Archive className="size-6" />
      </span>
      <div className="flex-1">
        <h3 className="font-bold text-slate-900">Respaldo completo del grupo</h3>
        <p className="text-sm text-slate-600">
          Un archivo ZIP con todos los reportes, un PDF por estudiante, las entregas, los justificantes y el material de las actividades. Descárgalo
          al cerrar el periodo.
        </p>
        {busy && step && <p className="mt-1 text-sm font-medium text-violet-700">{step}</p>}
        {result && <p className={`mt-1 text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>{result.text}</p>}
      </div>
      <Button onClick={run} disabled={busy || !data.students.length} className="shrink-0">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />} Descargar respaldo
      </Button>
    </Card>
  );
}
