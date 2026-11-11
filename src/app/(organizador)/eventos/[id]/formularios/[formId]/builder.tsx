"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Settings2,
  Smartphone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FieldInput } from "@/components/form-fields/field-input";
import { FormRunner, LayoutBlock } from "@/components/form-fields/form-runner";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { FIELD_GROUPS, FIELD_TYPES, cloneField, createField, fieldTypeInfo } from "@/lib/fields/registry";
import type { FieldType } from "@/lib/fields/types";
import { isLayout } from "@/lib/fields/types";
import { round2, scoredFields, totalWeight } from "@/lib/scoring";
import type { Answers, Category, FormField, FormRow } from "@/lib/types";
import { cn, readableTextColor } from "@/lib/utils";
import { saveForm, setFormPublished } from "../actions";
import { FieldSettings } from "./field-settings";

interface BuilderProps {
  eventId: string;
  form: FormRow;
  initialFields: FormField[];
  categories: (Category & { otherForm: string | null })[];
  assignedCategoryIds: string[];
  submissionCount: number;
  brandColor: string;
  canEdit: boolean;
}

type Snapshot = { title: string; description: string; isDefault: boolean; categoryIds: string[]; fields: FormField[] };

/* ---------- Paleta ---------- */

function PaletteItem({ type, onAdd }: { type: FieldType; onAdd: (t: FieldType) => void }) {
  const info = fieldTypeInfo(type);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${type}`, data: { type } });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onAdd(type)}
      title={info.description}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-sm text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <Plus className="size-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{info.label}</span>
    </button>
  );
}

function Palette({ onAdd }: { onAdd: (t: FieldType) => void }) {
  return (
    <div className="space-y-4">
      {FIELD_GROUPS.map((g) => (
        <div key={g}>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</div>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {FIELD_TYPES.filter((t) => t.group === g).map((t) => (
              <PaletteItem key={t.type} type={t.type} onAdd={onAdd} />
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Haz clic o arrastra un campo al formulario.</p>
    </div>
  );
}

/* ---------- Tarjeta de campo ---------- */

function FieldCard({
  field,
  index,
  total,
  selected,
  insertBefore,
  canEdit,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onOpenSettings,
}: {
  field: FormField;
  index: number;
  total: number;
  selected: boolean;
  insertBefore: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled: !canEdit,
  });
  const info = fieldTypeInfo(field.type);
  const layout = isLayout(field.type);

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative">
      {insertBefore && <div className="absolute -top-2 left-0 right-0 h-1 rounded-full bg-violet-600" aria-hidden />}
      <div
        onClick={onSelect}
        className={cn(
          "group rounded-xl border bg-white transition-shadow",
          selected ? "border-violet-600 ring-2 ring-violet-100" : "border-slate-200 hover:border-slate-300",
          isDragging && "opacity-50 shadow-lg",
        )}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">
          {canEdit && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
              aria-label={`Arrastrar para mover: ${field.label || info.label}`}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <span className="text-xs font-medium text-slate-500">{info.label}</span>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {field.required && <Badge tone="red">Obligatoria</Badge>}
            {field.scored && !layout && <Badge tone="violet">Puntúa · {round2(Number(field.weight))}%</Badge>}
            {field.logic && (
              <Badge tone="blue">
                <GitBranch className="size-3" /> Condicional
              </Badge>
            )}
          </div>
        </div>
        <div className="pointer-events-none px-4 py-3">
          {field.type === "page_break" ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
              Salto de página
              <div className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
            </div>
          ) : layout ? (
            <LayoutBlock field={field} />
          ) : (
            <>
              <div className="font-medium text-slate-900">
                {field.label || <span className="text-slate-400">Pregunta sin título</span>}
                {field.required && <span className="text-red-600"> *</span>}
              </div>
              {field.help && <p className="mt-0.5 text-sm text-slate-500">{field.help}</p>}
              <div className="mt-3 origin-top-left scale-[0.92] opacity-90">
                <FieldInput field={field} value={undefined} onChange={() => {}} disabled />
              </div>
            </>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 border-t border-slate-100 px-2 py-1">
            <button type="button" onClick={(e) => (e.stopPropagation(), onMove(-1))} disabled={index === 0} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Subir">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" onClick={(e) => (e.stopPropagation(), onMove(1))} disabled={index === total - 1} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Bajar">
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), onOpenSettings())}
              className="ml-1 inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Settings2 className="size-4" /> Editar
            </button>
            <div className="ml-auto flex">
              <button type="button" onClick={(e) => (e.stopPropagation(), onDuplicate())} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Duplicar">
                <Copy className="size-4" />
              </button>
              <button type="button" onClick={(e) => (e.stopPropagation(), onDelete())} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CanvasEnd({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid h-16 place-items-center rounded-xl border-2 border-dashed text-sm transition-colors",
        isOver ? "border-violet-500 bg-violet-50 text-violet-700" : active ? "border-slate-300 text-slate-500" : "border-transparent text-transparent",
      )}
    >
      Suelta aquí para agregar al final
    </div>
  );
}

/* ---------- Constructor ---------- */

export function FormBuilder({
  eventId,
  form,
  initialFields,
  categories,
  assignedCategoryIds,
  submissionCount,
  brandColor,
  canEdit,
}: BuilderProps) {
  const router = useRouter();
  const initial: Snapshot = useMemo(
    () => ({
      title: form.title,
      description: form.description ?? "",
      isDefault: form.is_default,
      categoryIds: assignedCategoryIds,
      fields: initialFields,
    }),
    [form, initialFields, assignedCategoryIds],
  );
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileSettings, setMobileSettings] = useState(false);
  const [mobilePalette, setMobilePalette] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Answers>({});
  const [published, setPublished] = useState(form.is_published);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const current: Snapshot = { title, description, isDefault, categoryIds, fields };
  const dirty = JSON.stringify(current) !== saved;
  const selected = fields.find((f) => f.id === selectedId) ?? null;
  const weightSum = totalWeight(fields);
  const scoredCount = scoredFields(fields).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* Avisar al salir con cambios sin guardar */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const save = useCallback(
    (then?: () => Promise<void>) => {
      const snapshot: Snapshot = { title, description, isDefault, categoryIds, fields };
      setStatus(null);
      startSaving(async () => {
        const res = await saveForm(eventId, form.id, snapshot);
        if (res && res.ok) {
          setSaved(JSON.stringify(snapshot));
          setStatus({ ok: true, text: "Guardado" });
          if (then) await then();
          router.refresh();
        } else if (res) setStatus({ ok: false, text: res.error });
      });
    },
    [title, description, isDefault, categoryIds, fields, eventId, form.id, router],
  );

  /* Ctrl/Cmd + S */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit) save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, canEdit]);

  function insertField(type: FieldType, index?: number) {
    const f = createField(type, form.id);
    setFields((prev) => {
      const at = index ?? (selectedId ? prev.findIndex((x) => x.id === selectedId) + 1 : prev.length);
      const copy = [...prev];
      copy.splice(at < 0 ? prev.length : at, 0, f);
      return copy;
    });
    setSelectedId(f.id);
    setMobilePalette(false);
    setTimeout(() => document.getElementById(`card-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    const f = fields.find((x) => x.id === id);
    const dependents = fields.filter((x) => x.logic?.fieldId === id);
    let msg = `¿Eliminar “${f?.label || fieldTypeInfo(f!.type).label}”?`;
    if (dependents.length) msg += ` ${dependents.length} pregunta(s) que dependen de ella dejarán de ser condicionales.`;
    if (submissionCount && !isLayout(f!.type)) msg += " Las respuestas ya recibidas a esta pregunta dejarán de mostrarse.";
    if (!window.confirm(msg)) return;
    setFields((prev) => prev.filter((x) => x.id !== id).map((x) => (x.logic?.fieldId === id ? { ...x, logic: null } : x)));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicate(id: string) {
    const i = fields.findIndex((x) => x.id === id);
    if (i < 0) return;
    const copy = cloneField(fields[i]);
    setFields([...fields.slice(0, i + 1), copy, ...fields.slice(i + 1)]);
    setSelectedId(copy.id);
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      return arrayMove(prev, i, j);
    });
  }

  function distributeWeights() {
    const scored = scoredFields(fields);
    if (!scored.length) return;
    const each = Math.floor((100 / scored.length) * 100) / 100;
    const last = round2(100 - each * (scored.length - 1));
    const ids = scored.map((f) => f.id);
    setFields((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, weight: f.id === ids[ids.length - 1] ? last : each } : f)));
  }

  function normalizeWeights() {
    if (weightSum <= 0) return distributeWeights();
    const scored = scoredFields(fields);
    const ids = scored.map((f) => f.id);
    let acc = 0;
    const next = new Map<string, number>();
    scored.forEach((f, i) => {
      const w = i === scored.length - 1 ? round2(100 - acc) : round2((Number(f.weight) / weightSum) * 100);
      acc += w;
      next.set(f.id, w);
    });
    setFields((prev) => prev.map((f) => (ids.includes(f.id) ? { ...f, weight: next.get(f.id)! } : f)));
  }

  /* Drag & drop */
  function onDragStart(e: DragStartEvent) {
    setActiveDrag(String(e.active.id));
  }
  function onDragOver(e: DragOverEvent) {
    setOverId(e.over ? String(e.over.id) : null);
  }
  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    setActiveDrag(null);
    setOverId(null);
    if (activeId.startsWith("palette:")) {
      if (!over) return;
      const type = activeId.slice("palette:".length) as FieldType;
      const idx = over === "canvas-end" ? fields.length : fields.findIndex((f) => f.id === over);
      insertField(type, idx < 0 ? fields.length : idx);
      return;
    }
    if (over && over !== activeId && over !== "canvas-end") {
      setFields((prev) => arrayMove(prev, prev.findIndex((f) => f.id === activeId), prev.findIndex((f) => f.id === over)));
    } else if (over === "canvas-end") {
      setFields((prev) => arrayMove(prev, prev.findIndex((f) => f.id === activeId), prev.length - 1));
    }
  }

  const draggingPalette = activeDrag?.startsWith("palette:") ?? false;
  const brandStyle = { "--brand": brandColor, "--brand-contrast": readableTextColor(brandColor) } as React.CSSProperties;

  async function togglePublish() {
    const target = !published;
    const run = async () => {
      const res = await setFormPublished(eventId, form.id, target);
      if (res && !res.ok) setStatus({ ok: false, text: res.error });
      else {
        setPublished(target);
        setStatus({ ok: true, text: target ? "Formulario publicado" : "Formulario despublicado" });
        router.refresh();
      }
    };
    if (dirty) save(run);
    else startSaving(run);
  }

  const settingsPanel = (
    <>
      {selected ? (
        <FieldSettings field={selected} fields={fields} onChange={(patch) => updateField(selected.id, patch)} />
      ) : (
        <FormSettings
          isDefault={isDefault}
          setIsDefault={setIsDefault}
          categories={categories}
          categoryIds={categoryIds}
          setCategoryIds={setCategoryIds}
        />
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <Link href={`/eventos/${eventId}/formularios`} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Formularios
        </Link>
        <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
        <span className="hidden max-w-60 truncate text-sm font-medium text-slate-900 sm:inline">{title}</span>
        {published ? <Badge tone="green">Publicado</Badge> : <Badge>Borrador</Badge>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {status && (
            <span className={cn("inline-flex items-center gap-1 text-sm", status.ok ? "text-emerald-700" : "text-red-700")}>
              {status.ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              {status.text}
            </span>
          )}
          {dirty && !saving && <span className="text-sm text-amber-700">Cambios sin guardar</span>}
          <Button variant="secondary" size="sm" onClick={() => { setPreviewAnswers({}); setPreview(true); }}>
            <Smartphone className="size-4" /> Vista previa
          </Button>
          {canEdit && (
            <>
              <Button variant="secondary" size="sm" onClick={togglePublish} disabled={saving}>
                {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {published ? "Despublicar" : "Publicar"}
              </Button>
              <Button size="sm" onClick={() => save()} disabled={saving || !dirty}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      {submissionCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Este formulario ya tiene {submissionCount} evaluaciones. Si eliminas preguntas o cambias opciones y puntos, el ranking se
          recalculará con la nueva configuración.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_320px]">
          {/* Paleta */}
          {canEdit && (
            <aside className="hidden lg:block">
              <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pb-4">
                <Palette onAdd={(t) => insertField(t)} />
              </div>
            </aside>
          )}

          {/* Lienzo */}
          <section className={cn("min-w-0 space-y-3", !canEdit && "lg:col-span-2")} aria-label="Formulario">
            <div
              className={cn("rounded-xl border bg-white p-4", !selectedId ? "border-violet-600 ring-2 ring-violet-100" : "border-slate-200")}
              onClick={() => setSelectedId(null)}
            >
              <div className="-mx-4 -mt-4 mb-3 h-2 rounded-t-xl" style={{ background: brandColor }} />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-md border-0 bg-transparent px-1 text-xl font-semibold text-slate-900 focus:bg-slate-50 focus:outline-none"
                aria-label="Título del formulario"
                maxLength={200}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                placeholder="Descripción o instrucciones para el evaluador (opcional)"
                rows={2}
                className="mt-1 w-full resize-none rounded-md border-0 bg-transparent px-1 text-sm text-slate-600 focus:bg-slate-50 focus:outline-none"
                aria-label="Descripción del formulario"
              />
            </div>

            {scoredCount > 0 && (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  weightSum === 100 ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900",
                )}
              >
                {weightSum === 100 ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                <span>
                  {scoredCount} criterios puntúan · suma de ponderaciones: <strong>{weightSum}%</strong>
                  {weightSum !== 100 && " (se ajustará proporcionalmente al calcular)"}
                </span>
                {canEdit && weightSum !== 100 && (
                  <span className="ml-auto flex gap-2">
                    <Button size="sm" variant="secondary" onClick={normalizeWeights}>
                      Ajustar a 100%
                    </Button>
                    <Button size="sm" variant="ghost" onClick={distributeWeights}>
                      Repartir igual
                    </Button>
                  </span>
                )}
              </div>
            )}

            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((f, i) => (
                  <div key={f.id} id={`card-${f.id}`} className="scroll-mt-32">
                    <FieldCard
                      field={f}
                      index={i}
                      total={fields.length}
                      selected={selectedId === f.id}
                      insertBefore={draggingPalette && overId === f.id}
                      canEdit={canEdit}
                      onSelect={() => setSelectedId(f.id)}
                      onMove={(d) => moveField(f.id, d)}
                      onDuplicate={() => duplicate(f.id)}
                      onDelete={() => removeField(f.id)}
                      onOpenSettings={() => {
                        setSelectedId(f.id);
                        setMobileSettings(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            {fields.length === 0 && !draggingPalette && (
              <div className="rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                El formulario está vacío. Arrastra o haz clic en un tipo de campo para agregarlo.
              </div>
            )}
            {canEdit && <CanvasEnd active={!!activeDrag} />}
            {canEdit && (
              <div className="flex gap-2 lg:hidden">
                <Button className="flex-1" onClick={() => setMobilePalette(true)}>
                  <Plus className="size-4" /> Agregar campo
                </Button>
                <Button variant="secondary" onClick={() => { setSelectedId(null); setMobileSettings(true); }}>
                  <Settings2 className="size-4" /> Ajustes
                </Button>
              </div>
            )}
          </section>

          {/* Panel de propiedades */}
          <aside className={cn("hidden lg:block", !canEdit && "pointer-events-none opacity-70")}>
            <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
              {selected && (
                <button type="button" onClick={() => setSelectedId(null)} className="mb-3 text-xs text-slate-500 hover:underline">
                  ← Ajustes del formulario
                </button>
              )}
              {settingsPanel}
            </div>
          </aside>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="rounded-lg border border-violet-400 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-lg">
              {activeDrag.startsWith("palette:")
                ? fieldTypeInfo(activeDrag.slice(8) as FieldType).label
                : fields.find((f) => f.id === activeDrag)?.label || "Campo"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modales para pantallas pequeñas */}
      <Modal open={mobilePalette} onClose={() => setMobilePalette(false)} title="Agregar campo">
        <Palette onAdd={(t) => insertField(t)} />
      </Modal>
      <Modal open={mobileSettings} onClose={() => setMobileSettings(false)} title={selected ? "Editar campo" : "Ajustes del formulario"}>
        <div className={cn(!canEdit && "pointer-events-none opacity-70")}>{settingsPanel}</div>
      </Modal>

      {/* Vista previa móvil */}
      <Modal open={preview} onClose={() => setPreview(false)} title="Vista previa en celular" size="lg">
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm text-slate-500">
            Así lo verá el evaluador. Puedes responder para probar la lógica y el puntaje; nada se guarda.
          </p>
          <div className="w-full max-w-[390px] overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-slate-50 shadow-xl" style={brandStyle}>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="px-4 py-5" style={{ background: brandColor, color: readableTextColor(brandColor) }}>
                <div className="text-xs uppercase tracking-wide opacity-80">Proyecto de ejemplo · Stand A1</div>
                <div className="text-lg font-semibold leading-tight">{title}</div>
                {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
              </div>
              <div className="px-4 pt-4">
                <FormRunner
                  fields={fields}
                  answers={previewAnswers}
                  onAnswer={(id, v) => setPreviewAnswers((a) => ({ ...a, [id]: v }))}
                  onSubmit={() => {
                    window.alert("¡Vista previa completa! El formulario es válido.");
                  }}
                  showScore
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FormSettings({
  isDefault,
  setIsDefault,
  categories,
  categoryIds,
  setCategoryIds,
}: {
  isDefault: boolean;
  setIsDefault: (v: boolean) => void;
  categories: (Category & { otherForm: string | null })[];
  categoryIds: string[];
  setCategoryIds: (v: string[]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ajustes del formulario</div>
      <p className="text-sm text-slate-500">Selecciona un campo del formulario para editar sus propiedades.</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="mt-0.5 size-4 rounded" />
        <span>
          <span className="font-medium text-slate-800">Formulario general</span>
          <span className="block text-xs text-slate-500">Se usa para los proyectos cuya categoría no tiene un formulario propio.</span>
        </span>
      </label>
      <Field label="Categorías que usan este formulario">
        {categories.length === 0 ? (
          <p className="text-sm text-slate-500">El evento no tiene categorías.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded"
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) => setCategoryIds(e.target.checked ? [...categoryIds, c.id] : categoryIds.filter((x) => x !== c.id))}
                />
                <span>
                  {c.name}
                  {c.otherForm && !categoryIds.includes(c.id) && (
                    <span className="block text-xs text-amber-700">Ahora usa “{c.otherForm}”. Si la marcas, se cambia a este.</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </Field>
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <strong>Atajos:</strong> Ctrl + S para guardar. Arrastra con el ícono ⋮⋮ para reordenar.
      </div>
    </div>
  );
}
