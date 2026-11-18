import type { WsAnswers, WsElement } from "./types";

export function normalizeAnswer(value: string, caseSensitive = false) {
  let v = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:"'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!caseSensitive) v = v.toLowerCase();
  return v;
}

/** Respuestas aceptadas; "a|b" en una sola línea también cuenta como alternativas. */
export function acceptedAnswers(el: WsElement) {
  return (el.answers ?? [])
    .flatMap((a) => a.split("|"))
    .map((a) => a.trim())
    .filter(Boolean);
}

export interface ElementResult {
  earned: number;
  max: number;
  /** null = no se califica sola (respuesta abierta sin revisar) */
  correct: boolean | null;
}

export interface GradeResult {
  score: number;
  max: number;
  /** Puntos de respuestas abiertas aún sin revisar */
  pendingManual: number;
  byElement: Record<string, ElementResult>;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Califica una ficha. `manual` contiene los puntos que el maestro asignó a respuestas abiertas. */
export function gradeWorksheet(elements: WsElement[], answers: WsAnswers, manual: Record<string, number> = {}): GradeResult {
  const byElement: Record<string, ElementResult> = {};
  const byId = new Map(elements.map((e) => [e.id, e]));

  const set = (id: string, max: number, earned: number, correct: boolean | null) => {
    byElement[id] = { max: round(max), earned: round(earned), correct };
  };

  // Opción única: se califica por grupo
  const groups = new Map<string, WsElement[]>();
  for (const el of elements.filter((e) => e.type === "single")) {
    const g = el.group?.trim() || el.id;
    groups.set(g, [...(groups.get(g) ?? []), el]);
  }
  for (const list of groups.values()) {
    const correctEl = list.find((e) => e.correct) ?? list[0];
    const max = Math.max(0, Number(correctEl.points) || 0);
    const chosen = list.find((e) => answers[e.id] === true);
    const ok = !!chosen && !!chosen.correct;
    set(correctEl.id, max, ok ? max : 0, ok);
  }

  // Unir: pares con la misma clave
  const joinKeys = new Map<string, WsElement[]>();
  for (const el of elements.filter((e) => e.type === "join")) {
    const k = (el.key ?? "").trim().toLowerCase();
    if (k) joinKeys.set(k, [...(joinKeys.get(k) ?? []), el]);
  }
  for (const list of joinKeys.values()) {
    if (list.length !== 2) continue;
    const [a, b] = list;
    const max = Math.max(0, Number(a.points) || 0);
    const ok = answers[a.id] === b.id || answers[b.id] === a.id;
    set(a.id, max, ok ? max : 0, ok);
  }

  for (const el of elements) {
    const pts = Math.max(0, Number(el.points) || 0);
    const v = answers[el.id];
    switch (el.type) {
      case "textfield":
      case "speak": {
        const accepted = acceptedAnswers(el).map((a) => normalizeAnswer(a, el.caseSensitive));
        if (!accepted.length) break;
        const ok = typeof v === "string" && accepted.includes(normalizeAnswer(v, el.caseSensitive));
        set(el.id, pts, ok ? pts : 0, ok);
        break;
      }
      case "checkbox": {
        const ok = (v === true) === (el.checked !== false);
        set(el.id, pts, ok ? pts : 0, ok);
        break;
      }
      case "select": {
        const ok = typeof v === "number" && v === (el.correctIndex ?? 0);
        set(el.id, pts, ok ? pts : 0, ok);
        break;
      }
      case "wordsearch": {
        const total = el.result?.placements.length ?? 0;
        if (!total) break;
        const found = Array.isArray(v) ? new Set(v as number[]).size : 0;
        set(el.id, pts, (pts * Math.min(found, total)) / total, found >= total);
        break;
      }
      case "drop": {
        const accepts = (el.accepts ?? []).map((a) => a.trim().toLowerCase()).filter(Boolean);
        if (!accepts.length) break;
        const dragged = typeof v === "string" ? byId.get(v) : undefined;
        const ok = !!dragged && accepts.includes((dragged.key ?? "").trim().toLowerCase());
        set(el.id, pts, ok ? pts : 0, ok);
        break;
      }
      case "open": {
        const m = manual[el.id];
        if (typeof m === "number") set(el.id, pts, Math.min(pts, Math.max(0, m)), m >= pts);
        else set(el.id, pts, 0, null);
        break;
      }
    }
  }

  const values = Object.values(byElement);
  return {
    score: round(values.reduce((a, r) => a + r.earned, 0)),
    max: round(values.reduce((a, r) => a + r.max, 0)),
    pendingManual: round(values.filter((r) => r.correct === null).reduce((a, r) => a + r.max, 0)),
    byElement,
  };
}
