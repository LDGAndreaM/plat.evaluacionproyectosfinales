"use client";

import { AlertTriangle, Download, ExternalLink, FileText, Loader2, Printer, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { downloadBlob, eventUrl, projectUrl, qrDataUrl, qrSvg, slugify } from "@/lib/qr";
import { useOrigin } from "@/lib/use-origin";

export interface QrProject {
  id: string;
  name: string;
  code: string;
  stand: string | null;
  category: string | null;
  categoryId: string | null;
  hasForm: boolean;
}

interface QrEvent {
  name: string;
  short_code: string;
  primary_color: string;
  logo_url: string | null;
  access_pin: string | null;
  status: string;
}

function QrImage({ text, size = 160, label }: { text: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (text) qrDataUrl(text, size * 2).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
  }, [text, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={size} height={size} alt={`Código QR: ${label}`} className="rounded-lg" />
  ) : (
    <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-slate-100" />
  );
}

function QrDownloads({ text, filename }: { text: string; filename: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          const url = await qrDataUrl(text, 1024);
          const blob = await (await fetch(url)).blob();
          downloadBlob(`${filename}.png`, blob);
        }}
      >
        <Download className="size-4" /> PNG
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => downloadBlob(`${filename}.svg`, new Blob([await qrSvg(text)], { type: "image/svg+xml" }))}
      >
        <Download className="size-4" /> SVG
      </Button>
      <CopyButton value={text} label="Enlace" />
    </div>
  );
}

export function QrManager({
  event,
  projects,
  categories,
  publishedForms,
}: {
  event: QrEvent;
  projects: QrProject[];
  categories: { id: string; name: string }[];
  publishedForms: number;
}) {
  const origin = useOrigin();
  const [query, setQuery] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const general = eventUrl(origin, event.short_code);
  const eventSlug = slugify(event.name);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.stand ?? "").toLowerCase().includes(q));
  }, [projects, query]);

  const withoutForm = projects.filter((p) => !p.hasForm);

  return (
    <div className="space-y-6">
      {(event.status !== "open" || publishedForms === 0 || withoutForm.length > 0) && (
        <div className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {event.status === "draft" && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" /> El evento está en borrador: los QR funcionarán cuando lo abras en la
              pestaña Resumen.
            </p>
          )}
          {(event.status === "closed" || event.status === "published") && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" /> El evento está cerrado: los QR ya no aceptan evaluaciones.
            </p>
          )}
          {publishedForms === 0 && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" /> No hay formularios publicados. Publica uno en la pestaña Formularios.
            </p>
          )}
          {publishedForms > 0 && withoutForm.length > 0 && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" /> {withoutForm.length} proyecto(s) no tienen formulario asignado (su
              categoría no tiene formulario y no hay uno general publicado).
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="QR general del evento"
            description="El evaluador escanea y elige el proyecto de una lista con buscador. Útil para la entrada o para enviarlo por WhatsApp."
          />
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-start">
            <QrImage text={general} size={168} label={event.name} />
            <div className="min-w-0 flex-1 space-y-3">
              <code className="block break-all rounded-lg bg-slate-100 px-3 py-2 text-sm">{general}</code>
              <p className="text-sm text-slate-600">
                Código del evento: <strong className="font-mono">{event.short_code}</strong>
                {event.access_pin && (
                  <>
                    {" "}
                    · PIN: <strong className="font-mono">{event.access_pin}</strong>
                  </>
                )}
              </p>
              <QrDownloads text={general} filename={`qr-${eventSlug}`} />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Hoja imprimible (PDF)"
            description="Todos los QR con nombre del proyecto y stand, en tamaño carta. Recorta y pega cada uno en su stand."
          />
          <div className="space-y-3 p-5">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>
                <strong>6 por hoja</strong>: ahorra papel; cada QR mide unos 5 cm.
              </li>
              <li>
                <strong>1 por hoja</strong>: un cartel grande para cada stand, con logo y color del evento.
              </li>
            </ul>
            <Button onClick={() => setPrintOpen(true)} disabled={!projects.length}>
              <Printer className="size-4" /> Generar PDF
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`QR por proyecto (${projects.length})`}
          description="Al escanearlo, el evaluador cae directo en el formulario de ese proyecto."
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar proyecto o stand…"
                className="h-9 w-60 pl-9"
                aria-label="Buscar proyecto"
              />
            </div>
          }
        />
        {projects.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Aún no hay proyectos" description="Agrega proyectos en la pestaña Proyectos para generar sus QR." />
          </div>
        ) : (
          <ul className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const url = projectUrl(origin, event.short_code, p.code);
              return (
                <li key={p.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                  <QrImage text={url} size={112} label={p.name} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    {p.stand && <span className="text-xs font-semibold uppercase text-slate-500">Stand {p.stand}</span>}
                    <span className="line-clamp-2 font-medium text-slate-900">{p.name}</span>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {p.category && <Badge tone="violet">{p.category}</Badge>}
                      {!p.hasForm && <Badge tone="amber">Sin formulario</Badge>}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                      <QrDownloads text={url} filename={`qr-${slugify(p.stand ? `stand-${p.stand}-${p.name}` : p.name)}`} />
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100"
                        aria-label={`Abrir formulario de ${p.name}`}
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={printOpen} onClose={() => setPrintOpen(false)} title="Generar hoja imprimible">
        {printOpen && (
          <PrintOptions
            event={event}
            origin={origin}
            projects={projects}
            categories={categories}
            onDone={() => setPrintOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}

function PrintOptions({
  event,
  origin,
  projects,
  categories,
  onDone,
}: {
  event: QrEvent;
  origin: string;
  projects: QrProject[];
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [layout, setLayout] = useState<"grid" | "single">("grid");
  const [includeGeneral, setIncludeGeneral] = useState(true);
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = projects.filter((p) => category === "all" || p.categoryId === category);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const [{ pdf }, { QrSheet }] = await Promise.all([import("@react-pdf/renderer"), import("./qr-pdf")]);
      const generalUrl = eventUrl(origin, event.short_code);
      const items = await Promise.all(
        selected.map(async (p) => {
          const url = projectUrl(origin, event.short_code, p.code);
          return { name: p.name, stand: p.stand, category: p.category, url, qr: await qrDataUrl(url, 600) };
        }),
      );
      const blob = await pdf(
        <QrSheet
          event={{
            name: event.name,
            color: event.primary_color,
            logo: event.logo_url,
            generalUrl,
            generalQr: await qrDataUrl(generalUrl, 800),
            pin: event.access_pin,
          }}
          projects={items}
          layout={layout}
          includeGeneral={includeGeneral}
        />,
      ).toBlob();
      downloadBlob(`codigos-qr-${slugify(event.name)}.pdf`, blob);
      onDone();
    } catch (e) {
      setError((e as Error).message || "No se pudo generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-800">Formato</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={layout === "grid"} onChange={() => setLayout("grid")} className="size-4" />6 QR por hoja
          (para recortar)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={layout === "single"} onChange={() => setLayout("single")} className="size-4" />1 QR por hoja
          (cartel para el stand)
        </label>
      </fieldset>
      {categories.length > 0 && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-800">Proyectos</span>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Todos ({projects.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({projects.filter((p) => p.categoryId === c.id).length})
              </option>
            ))}
          </Select>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includeGeneral} onChange={(e) => setIncludeGeneral(e.target.checked)} className="size-4" />
        Incluir al inicio una hoja con el QR general del evento{event.access_pin ? " (muestra el PIN)" : ""}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={generate} disabled={busy || !selected.length}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          {busy ? "Generando…" : `Descargar PDF (${selected.length})`}
        </Button>
      </div>
    </div>
  );
}
