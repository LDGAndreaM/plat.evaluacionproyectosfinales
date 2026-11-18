"use client";

import { Clock, History, Loader2, MapPin, Maximize2, Minimize2, Plus, Square, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  ATT_INFO,
  ATT_STATUSES,
  countStatuses,
  formatRate,
  METHOD_LABEL,
  sessionLabel,
  timeLabel,
  type AttRecord,
  type AttSession,
  type AttStatus,
} from "@/lib/aula/attendance";
import { studentName, type ClassStudent } from "@/lib/aula/types";
import { qrDataUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { closeAttendance, deleteSession, extendAttendance, setAttendance } from "../../../attendance-actions";

interface CodeInfo {
  code: string;
  slot_ends_at: string;
  expires_at: string;
  status: string;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function SessionView({
  classId,
  className,
  hasLocation,
  session,
  students,
  initialRecords,
  avatars,
}: {
  classId: string;
  className: string;
  hasLocation: boolean;
  session: AttSession;
  students: ClassStudent[];
  initialRecords: AttRecord[];
  avatars: Record<string, string | null>;
}) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [lastInitial, setLastInitial] = useState(initialRecords);
  if (initialRecords !== lastInitial) {
    setLastInitial(initialRecords);
    setRecords(initialRecords);
  }
  const isOpen = session.status === "open";
  const supabase = useMemo(() => createClient(), []);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("attendance_records").select("*").eq("session_id", session.id);
    if (data) setRecords(data as AttRecord[]);
  }, [supabase, session.id]);

  // Actualizar la lista en vivo mientras está abierto
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [isOpen, reload]);

  const byStudent = new Map(records.map((r) => [r.student_id, r]));
  const counts = countStatuses(records.map((r) => r.status));
  const [historyFor, setHistoryFor] = useState<{ record: AttRecord; name: string } | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-violet-950">{sessionLabel(session.starts_at)}</h2>
          <p className="text-sm text-slate-600">
            {session.topic ? `${session.topic} · ` : ""}Tolerancia {session.late_after_min} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {(["present", "late", "absent", "excused", "review"] as AttStatus[]).map((s) => (
            <span key={s} className={cn("rounded-full px-2.5 py-0.5 font-semibold", ATT_INFO[s].cls)}>
              {ATT_INFO[s].label}: {counts[s]}
            </span>
          ))}
          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-bold text-white">{formatRate(counts.rate)}</span>
        </div>
      </div>

      {isOpen && (
        <LivePanel
          classId={classId}
          className={className}
          session={session}
          registered={records.filter((r) => r.method === "qr" || r.method === "code").length}
          total={students.filter((s) => s.status === "active").length}
          onClosed={() => router.refresh()}
        />
      )}

      <Card className="rounded-2xl">
        <CardHeader
          title={isOpen ? "Registros en vivo" : "Lista de la sesión"}
          description={
            isOpen
              ? "Se actualiza sola. Puedes marcar a alguien manualmente si no pudo registrarse."
              : "Cambia cualquier estado; cada cambio queda en el historial."
          }
        />
        <ul className="divide-y divide-slate-100">
          {students.map((s) => (
            <StudentRow
              key={s.id}
              s={s}
              avatar={s.user_id ? avatars[s.user_id] : null}
              record={byStudent.get(s.id)}
              hasLocation={hasLocation}
              onChange={async (status) => {
                const res = await setAttendance(classId, session.id, s.id, status);
                if (res.ok) await reload();
                return res;
              }}
              onHistory={(record) => setHistoryFor({ record, name: studentName(s) })}
            />
          ))}
        </ul>
      </Card>

      {!isOpen && <DangerActions classId={classId} sessionId={session.id} onReopened={() => router.refresh()} />}

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={`Historial · ${historyFor?.name ?? ""}`}>
        {historyFor && <HistoryList recordId={historyFor.record.id} />}
      </Modal>
    </div>
  );
}

function LivePanel({
  classId,
  className,
  session,
  registered,
  total,
  onClosed,
}: {
  classId: string;
  className: string;
  session: AttSession;
  registered: number;
  total: number;
  onClosed: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [info, setInfo] = useState<CodeInfo | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [pending, start] = useTransition();
  const panel = useRef<HTMLDivElement>(null);
  const now = useNow(true);

  const fetchCode = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("attendance_code", { sid: session.id });
    if (err) return setError("No se pudo obtener el código.");
    setInfo((data as CodeInfo[])[0]);
  }, [supabase, session.id]);

  useEffect(() => {
    const first = setTimeout(fetchCode, 0);
    const t = setInterval(fetchCode, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [fetchCode]);

  // Pedir el código nuevo justo cuando cambia la ranura de 30 s
  const slotEnds = info ? Date.parse(info.slot_ends_at) : 0;
  useEffect(() => {
    if (!slotEnds) return;
    const t = setTimeout(fetchCode, Math.max(200, slotEnds - Date.now() + 300));
    return () => clearTimeout(t);
  }, [slotEnds, fetchCode]);

  const link = info && origin ? `${origin}/asistencia/registrar?s=${session.id}&c=${info.code}` : "";
  useEffect(() => {
    if (link) qrDataUrl(link, 720).then(setQr);
  }, [link]);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const expiresAt = Date.parse(info?.expires_at ?? session.expires_at);
  const left = Math.max(0, Math.round((expiresAt - now) / 1000));
  const expired = left <= 0;
  const slotLeft = Math.max(0, Math.min(30, (slotEnds - now) / 1000));
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else panel.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={panel}
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-800 via-violet-900 to-violet-950 p-5 text-white sm:p-8",
        full && "flex flex-col items-center justify-center rounded-none",
      )}
    >
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-turquoise/20 blur-2xl" aria-hidden />
      <div className={cn("relative grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]", full && "w-full max-w-6xl")}>
        <div className="mx-auto rounded-3xl bg-white p-3 shadow-2xl">
          {expired ? (
            <div className={cn("grid place-items-center text-center text-slate-500", full ? "size-[min(70vh,560px)]" : "size-64 sm:size-72")}>
              <div>
                <Clock className="mx-auto size-12 text-slate-300" />
                <p className="mt-2 font-semibold">Tiempo terminado</p>
              </div>
            </div>
          ) : qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR de asistencia" className={cn(full ? "size-[min(70vh,560px)]" : "size-64 sm:size-72")} />
          ) : (
            <div className={cn("grid place-items-center", full ? "size-[min(70vh,560px)]" : "size-64 sm:size-72")}>
              <Loader2 className="size-10 animate-spin text-violet-300" />
            </div>
          )}
          {!expired && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div className="h-full bg-turquoise transition-[width] duration-500" style={{ width: `${(slotLeft / 30) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="space-y-4 text-center md:text-left">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-turquoise">Pase de lista · {className}</p>
            <p className={cn("mt-1 text-violet-100", full ? "text-2xl" : "text-base")}>Escanea el QR o escribe el código en EvalúaQR → Asistencia</p>
          </div>
          <p className={cn("font-mono font-extrabold tracking-[0.2em]", full ? "text-8xl" : "text-5xl sm:text-6xl")} aria-live="polite">
            {expired ? "— — —" : info ? `${info.code.slice(0, 3)} ${info.code.slice(3)}` : "··· ···"}
          </p>
          <div className={cn("flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-start", full ? "text-2xl" : "text-lg")}>
            <span className={cn("inline-flex items-center gap-2 font-bold", left < 30 && !expired && "text-sun")}>
              <Clock className="size-5" /> {expired ? "Cerrado para registro" : `Quedan ${mmss}`}
            </span>
            <span className="font-bold">
              {registered} / {total} registrados
            </span>
          </div>
          <p className="text-xs text-violet-200">El código cambia cada 30 segundos para que no se pueda compartir por foto.</p>
          {error && <p className="text-sm text-coral">{error}</p>}
          <div className="no-print flex flex-wrap justify-center gap-2 md:justify-start">
            <Button variant="secondary" size="sm" onClick={toggleFull}>
              {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />} {full ? "Salir de pantalla completa" : "Pantalla completa"}
            </Button>
            {[2, 5].map((m) => (
              <Button
                key={m}
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await extendAttendance(classId, session.id, m);
                    await fetchCode();
                  })
                }
              >
                <Plus className="size-4" /> {expired ? `Reabrir ${m} min` : `${m} min más`}
              </Button>
            ))}
            <Button
              size="sm"
              className="bg-coral text-violet-950 hover:bg-[#ff8aa2]"
              disabled={pending}
              onClick={() => {
                if (!confirm("¿Cerrar el pase de lista? Quien no se haya registrado quedará con Falta (puedes corregirlo después).")) return;
                start(async () => {
                  if (document.fullscreenElement) await document.exitFullscreen();
                  await closeAttendance(classId, session.id);
                  onClosed();
                });
              }}
            >
              <Square className="size-4" /> Cerrar pase de lista
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentRow({
  s,
  avatar,
  record,
  hasLocation,
  onChange,
  onHistory,
}: {
  s: ClassStudent;
  avatar: string | null;
  record?: AttRecord;
  hasLocation: boolean;
  onChange: (status: AttStatus) => Promise<{ ok: boolean; error?: string }>;
  onHistory: (r: AttRecord) => void;
}) {
  const [busy, setBusy] = useState<AttStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function change(st: AttStatus) {
    setError(null);
    setBusy(st);
    const res = await onChange(st);
    setBusy(null);
    if (!res.ok) setError(res.error ?? "No se pudo guardar.");
  }
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-5 py-3", record?.status === "review" && "bg-violet-50/60")}>
      <Avatar url={avatar} name={studentName(s)} className="size-9 text-xs" />
      <div className="min-w-0 flex-1 basis-40">
        <div className="font-medium text-slate-900">
          {s.last_name}
          {s.last_name && ", "}
          {s.first_name}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
          {record ? (
            <>
              <span>
                {METHOD_LABEL[record.method] ?? record.method}
                {record.checked_at ? ` · ${timeLabel(record.checked_at)}` : ""}
              </span>
              {hasLocation && record.lat != null && (
                <span className={cn("inline-flex items-center gap-0.5", record.location_ok === false ? "text-red-600" : "text-emerald-700")}>
                  <MapPin className="size-3" />
                  {record.distance_m != null ? `${Math.round(record.distance_m)} m` : "Con ubicación"}
                  {record.accuracy_m != null ? ` (±${Math.round(record.accuracy_m)} m)` : ""}
                </span>
              )}
              {record.note && <span className="text-slate-600">{record.note}</span>}
            </>
          ) : (
            <span>Sin registro</span>
          )}
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Estado de ${studentName(s)}`}>
        {ATT_STATUSES.map((st) => {
          const active = record?.status === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => !active && change(st)}
              disabled={!!busy}
              title={ATT_INFO[st].label}
              aria-label={ATT_INFO[st].label}
              aria-pressed={active}
              className={cn(
                "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-bold ring-1 transition-colors",
                active ? cn(ATT_INFO[st].cls, "ring-transparent") : "bg-white text-slate-400 ring-slate-200 hover:text-slate-700",
              )}
            >
              {busy === st ? <Loader2 className="size-3.5 animate-spin" /> : ATT_INFO[st].short}
            </button>
          );
        })}
        {record && (
          <button
            type="button"
            onClick={() => onHistory(record)}
            className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Historial de ${studentName(s)}`}
            title="Historial de cambios"
          >
            <History className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}

interface Change {
  id: number;
  old_status: AttStatus | null;
  new_status: AttStatus;
  method: string | null;
  note: string | null;
  changed_at: string;
}

function HistoryList({ recordId }: { recordId: string }) {
  const [items, setItems] = useState<Change[] | null>(null);
  useEffect(() => {
    createClient()
      .from("attendance_changes")
      .select("id, old_status, new_status, method, note, changed_at")
      .eq("record_id", recordId)
      .order("changed_at")
      .then(({ data }) => setItems((data ?? []) as Change[]));
  }, [recordId]);
  if (!items) return <Loader2 className="mx-auto size-6 animate-spin text-slate-400" />;
  return (
    <ol className="space-y-3">
      {items.map((c) => (
        <li key={c.id} className="flex gap-3 text-sm">
          <span className="w-28 shrink-0 text-slate-500">
            {new Intl.DateTimeFormat("es-MX", { timeZone: "America/Hermosillo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
              new Date(c.changed_at),
            )}
          </span>
          <span>
            {c.old_status ? (
              <>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ATT_INFO[c.old_status].cls)}>{ATT_INFO[c.old_status].label}</span> →{" "}
              </>
            ) : null}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ATT_INFO[c.new_status].cls)}>{ATT_INFO[c.new_status].label}</span>
            <span className="ml-2 text-slate-500">
              {c.method ? METHOD_LABEL[c.method] : ""}
              {c.note ? ` · ${c.note}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function DangerActions({ classId, sessionId, onReopened }: { classId: string; sessionId: string; onReopened: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await extendAttendance(classId, sessionId, 5);
            onReopened();
          })
        }
      >
        <Plus className="size-4" /> Reabrir QR 5 min
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:bg-red-50"
        disabled={pending}
        onClick={() => {
          if (confirm("¿Eliminar esta sesión y todos sus registros? No se puede deshacer.")) start(() => deleteSession(classId, sessionId));
        }}
      >
        <Trash2 className="size-4" /> Eliminar sesión
      </Button>
      <span className="sr-only">
        <X />
      </span>
    </div>
  );
}
