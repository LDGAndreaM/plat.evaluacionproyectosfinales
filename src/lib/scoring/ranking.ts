// Ranking de proyectos a partir de las evaluaciones enviadas.

import type { Answers, FormField, ScoreMethod } from "@/lib/types";
import { isVisible } from "@/lib/fields/logic";
import { aggregate, round2, scoreField, scoreSubmission, scoredFields } from "./index";

export interface RankingProject {
  id: string;
  name: string;
  stand: string | null;
  category_id: string | null;
  members: string[];
  semester?: string | null;
  image_url?: string | null;
  manual_tiebreak: number | null;
}

export interface RankingSubmission {
  id: string;
  project_id: string;
  form_id: string;
  evaluator_id: string;
  answers: Answers;
}

export interface CriterionResult {
  fieldId: string;
  label: string;
  weight: number;
  /** Promedio 0–100 de los evaluadores. */
  average: number | null;
}

export interface RankedProject {
  project: RankingProject;
  rank: number | null;
  score: number | null;
  /** Calificación 0–100 de cada evaluación. */
  scores: { submissionId: string; evaluatorId: string; total: number }[];
  count: number;
  criteria: CriterionResult[];
  tied: boolean;
}

/** Calcula el ranking. `fieldsByForm` contiene los campos de cada formulario. */
export function computeRanking({
  projects,
  submissions,
  fieldsByForm,
  method,
}: {
  projects: RankingProject[];
  submissions: RankingSubmission[];
  fieldsByForm: Record<string, FormField[]>;
  method: ScoreMethod;
}): RankedProject[] {
  const rows = projects.map((project) => {
    const subs = submissions.filter((s) => s.project_id === project.id);
    const scores = subs.map((s) => ({
      submissionId: s.id,
      evaluatorId: s.evaluator_id,
      total: scoreSubmission(fieldsByForm[s.form_id] ?? [], s.answers ?? {}).total,
    }));

    // Desglose por criterio (por etiqueta, para agrupar aunque haya varios formularios)
    const byLabel = new Map<string, { fieldId: string; label: string; weight: number; values: number[] }>();
    for (const s of subs) {
      const fields = fieldsByForm[s.form_id] ?? [];
      for (const f of scoredFields(fields)) {
        const key = `${f.label}`;
        if (!byLabel.has(key)) byLabel.set(key, { fieldId: f.id, label: f.label, weight: Number(f.weight) || 0, values: [] });
        if (!isVisible(f, fields, s.answers ?? {})) continue;
        const { normalized } = scoreField(f, s.answers?.[f.id]);
        if (normalized !== null) byLabel.get(key)!.values.push(normalized * 100);
      }
    }
    const criteria: CriterionResult[] = [...byLabel.values()].map((c) => ({
      fieldId: c.fieldId,
      label: c.label,
      weight: c.weight,
      average: c.values.length ? round2(c.values.reduce((a, b) => a + b, 0) / c.values.length) : null,
    }));

    return {
      project,
      rank: null as number | null,
      score: aggregate(
        scores.map((s) => s.total),
        method,
      ),
      scores,
      count: subs.length,
      criteria,
      tied: false,
    };
  });

  const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
  rows.sort((a, b) => {
    if (a.score === null && b.score === null) return collator.compare(a.project.stand ?? a.project.name, b.project.stand ?? b.project.name);
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (b.score !== a.score) return b.score - a.score;
    const ta = a.project.manual_tiebreak ?? Number.MAX_SAFE_INTEGER;
    const tb = b.project.manual_tiebreak ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return collator.compare(a.project.name, b.project.name);
  });

  return assignRanks(rows);
}

/** Asigna posiciones a filas ya ordenadas: los empates reales comparten lugar (1, 2, 2, 4). */
function assignRanks(sorted: RankedProject[]): RankedProject[] {
  const out = sorted.map((r) => ({ ...r, rank: null as number | null, tied: false }));
  const same = (a: RankedProject, b: RankedProject) =>
    a.score === b.score && (a.project.manual_tiebreak ?? null) === (b.project.manual_tiebreak ?? null);
  out.forEach((r, i) => {
    if (r.score === null) return;
    const prev = out[i - 1];
    if (prev && prev.score !== null && same(prev, r)) {
      r.rank = prev.rank;
      r.tied = prev.tied = true;
    } else r.rank = i + 1;
  });
  return out;
}

/** Ranking dentro de una categoría (posiciones recalculadas). */
export function rankWithin(rows: RankedProject[], categoryId: string | null) {
  return assignRanks(rows.filter((r) => r.project.category_id === categoryId));
}

/** Ranking de un subconjunto (por ejemplo, un semestre), con posiciones recalculadas. */
export function rankSubset(rows: RankedProject[], keep: (r: RankedProject) => boolean) {
  return assignRanks(rows.filter(keep));
}

export function formatScore(score: number | null) {
  return score === null ? "—" : score.toFixed(1);
}
