"use client";

import Papa from "papaparse";
import { formatAnswer } from "@/lib/fields/format";
import { isLayout } from "@/lib/fields/types";
import { downloadBlob, slugify } from "@/lib/qr";
import type { RankedProject } from "@/lib/scoring/ranking";
import { rankWithin } from "@/lib/scoring/ranking";
import type { ResultsData } from "@/lib/results";
import { SCORE_METHOD_LABELS, formatDate, semesterLabel, semestersOf } from "@/lib/utils";
import { rankSubset } from "@/lib/scoring/ranking";

function criteriaLabels(rows: RankedProject[]) {
  const labels: string[] = [];
  rows.forEach((r) => r.criteria.forEach((c) => !labels.includes(c.label) && labels.push(c.label)));
  return labels;
}

function helpers(data: ResultsData) {
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name ?? "";
  const evaluator = (id: string) => data.evaluators.find((e) => e.id === id);
  return { catName, evaluator };
}

function fileBase(data: ResultsData) {
  return `resultados-${slugify(data.event.name)}`;
}

export function exportCsv(data: ResultsData, rows: RankedProject[]) {
  const { catName } = helpers(data);
  const crit = criteriaLabels(rows);
  const csv = Papa.unparse({
    fields: ["Lugar", "Empate", "Proyecto", "Stand", "Semestre", "Categoría", "Integrantes", "Evaluaciones", "Puntaje", ...crit],
    data: rows.map((r) => [
      r.rank ?? "",
      r.tied ? "Sí" : "",
      r.project.name,
      r.project.stand ?? "",
      semesterLabel(r.project.semester),
      catName(r.project.category_id),
      r.project.members.join("; "),
      r.count,
      r.score ?? "",
      ...crit.map((c) => r.criteria.find((x) => x.label === c)?.average ?? ""),
    ]),
  });
  downloadBlob(`${fileBase(data)}.csv`, new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
}

export async function exportExcel(data: ResultsData, rows: RankedProject[]) {
  const ExcelJS = (await import("exceljs")).default;
  const { catName, evaluator } = helpers(data);
  const wb = new ExcelJS.Workbook();
  wb.creator = "EvalúaQR";
  const brand = data.event.primary_color.replace("#", "").toUpperCase();

  const styleHeader = (row: import("exceljs").Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brand}` } };
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = 30;
  };
  const addTitle = (ws: import("exceljs").Worksheet, text: string) => {
    ws.addRow([text]).font = { bold: true, size: 14 };
    ws.addRow([
      [formatDate(data.event.event_date), data.event.venue, `Método: ${SCORE_METHOD_LABELS[data.event.score_method]}`]
        .filter(Boolean)
        .join(" · "),
    ]).font = { color: { argb: "FF64748B" } };
    ws.addRow([]);
  };

  // Ranking
  const crit = criteriaLabels(rows);
  const ws = wb.addWorksheet("Ranking");
  addTitle(ws, `Resultados · ${data.event.name}`);
  styleHeader(ws.addRow(["Lugar", "Proyecto", "Stand", "Semestre", "Categoría", "Integrantes", "Evaluaciones", "Puntaje", ...crit]));
  rows.forEach((r) => {
    const row = ws.addRow([
      r.rank ? `${r.rank}°${r.tied ? " (empate)" : ""}` : "—",
      r.project.name,
      r.project.stand ?? "",
      semesterLabel(r.project.semester),
      catName(r.project.category_id),
      r.project.members.join(", "),
      r.count,
      r.score,
      ...crit.map((c) => r.criteria.find((x) => x.label === c)?.average ?? null),
    ]);
    if (r.rank !== null && r.rank <= data.event.podium_size) row.font = { bold: true };
  });
  ws.columns = [
    { width: 12 },
    { width: 42 },
    { width: 8 },
    { width: 13 },
    { width: 16 },
    { width: 40 },
    { width: 13 },
    { width: 10 },
    ...crit.map(() => ({ width: 14 })),
  ];
  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.getColumn(8).numFmt = "0.00";
  crit.forEach((_, i) => (ws.getColumn(9 + i).numFmt = "0.0"));

  // Por semestre
  const semesters = semestersOf(data.projects);
  if (semesters.length > 1) {
    const wsem = wb.addWorksheet("Por semestre");
    addTitle(wsem, "Ranking por semestre");
    for (const sem of semesters) {
      const sub = rankSubset(rows, (r) => r.project.semester === sem);
      wsem.addRow([semesterLabel(sem)]).font = { bold: true, size: 12 };
      styleHeader(wsem.addRow(["Lugar", "Proyecto", "Stand", "Categoría", "Evaluaciones", "Puntaje"]));
      sub.forEach((r) =>
        wsem.addRow([
          r.rank ? `${r.rank}°${r.tied ? " (empate)" : ""}` : "—",
          r.project.name,
          r.project.stand ?? "",
          catName(r.project.category_id),
          r.count,
          r.score,
        ]),
      );
      wsem.addRow([]);
    }
    wsem.columns = [{ width: 12 }, { width: 42 }, { width: 8 }, { width: 16 }, { width: 13 }, { width: 10 }];
    wsem.getColumn(6).numFmt = "0.00";
  }

  // Por categoría
  if (data.categories.length) {
    const wc = wb.addWorksheet("Por categoría");
    addTitle(wc, "Ranking por categoría");
    for (const c of data.categories) {
      const sub = rankWithin(rows, c.id);
      if (!sub.length) continue;
      wc.addRow([c.name]).font = { bold: true, size: 12 };
      styleHeader(wc.addRow(["Lugar", "Proyecto", "Stand", "Evaluaciones", "Puntaje"]));
      sub.forEach((r) =>
        wc.addRow([r.rank ? `${r.rank}°${r.tied ? " (empate)" : ""}` : "—", r.project.name, r.project.stand ?? "", r.count, r.score]),
      );
      wc.addRow([]);
    }
    wc.columns = [{ width: 12 }, { width: 42 }, { width: 8 }, { width: 13 }, { width: 10 }];
    wc.getColumn(5).numFmt = "0.00";
  }

  // Respuestas individuales
  const wr = wb.addWorksheet("Respuestas");
  const multiForm = Object.keys(data.fieldsByForm).length > 1;
  const columns: { formId: string; fieldId: string; label: string }[] = [];
  for (const form of data.forms) {
    for (const f of data.fieldsByForm[form.id] ?? []) {
      if (isLayout(f.type)) continue;
      columns.push({ formId: form.id, fieldId: f.id, label: multiForm ? `${form.title}: ${f.label}` : f.label });
    }
  }
  styleHeader(
    wr.addRow(["Proyecto", "Stand", "Semestre", "Categoría", "Evaluador", "Institución", "Correo", "Enviada", "Calificación", ...columns.map((c) => c.label)]),
  );
  const scoreOf = new Map(rows.flatMap((r) => r.scores.map((s) => [s.submissionId, s.total] as const)));
  const projectOf = new Map(data.projects.map((p) => [p.id, p]));
  const sorted = [...data.submissions].sort((a, b) => {
    const ra = rows.findIndex((r) => r.project.id === a.project_id);
    const rb = rows.findIndex((r) => r.project.id === b.project_id);
    return ra - rb;
  });
  for (const s of sorted) {
    const p = projectOf.get(s.project_id);
    const ev = evaluator(s.evaluator_id);
    const fields = data.fieldsByForm[s.form_id] ?? [];
    wr.addRow([
      p?.name ?? "",
      p?.stand ?? "",
      semesterLabel(p?.semester),
      catName(p?.category_id ?? null),
      ev?.name ?? "",
      ev?.institution ?? "",
      ev?.email ?? "",
      s.submitted_at ? new Date(s.submitted_at) : "",
      scoreOf.get(s.id) ?? null,
      ...columns.map((c) => {
        if (c.formId !== s.form_id) return "";
        const f = fields.find((x) => x.id === c.fieldId);
        return f ? formatAnswer(f, s.answers?.[f.id]) : "";
      }),
    ]);
  }
  wr.columns = [
    { width: 36 },
    { width: 8 },
    { width: 13 },
    { width: 14 },
    { width: 26 },
    { width: 22 },
    { width: 24 },
    { width: 18 },
    { width: 12 },
    ...columns.map(() => ({ width: 24 })),
  ];
  wr.getColumn(8).numFmt = "dd/mm/yyyy hh:mm";
  wr.getColumn(9).numFmt = "0.00";
  wr.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];

  // Evaluadores
  const we = wb.addWorksheet("Evaluadores");
  styleHeader(we.addRow(["Evaluador", "Institución", "Correo", "Evaluaciones enviadas"]));
  data.evaluators.forEach((e) =>
    we.addRow([e.name, e.institution ?? "", e.email ?? "", data.submissions.filter((s) => s.evaluator_id === e.id).length]),
  );
  we.columns = [{ width: 30 }, { width: 28 }, { width: 28 }, { width: 22 }];

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    `${fileBase(data)}.xlsx`,
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
}

export async function exportPdf(data: ResultsData, rows: RankedProject[]) {
  const [{ pdf }, { ResultsReport }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdf")]);
  const { catName } = helpers(data);
  const semesters = semestersOf(data.projects);
  const byCategory = [
    ...data.categories.map((c) => ({ name: `Categoría: ${c.name}`, rows: rankWithin(rows, c.id) })),
    ...(semesters.length > 1
      ? semesters.map((s) => ({ name: semesterLabel(s), rows: rankSubset(rows, (r) => r.project.semester === s) }))
      : []),
  ].filter((c) => c.rows.length);
  const blob = await pdf(
    <ResultsReport
      info={{
        name: data.event.name,
        logo: data.event.logo_url,
        color: data.event.primary_color,
        subtitle: [formatDate(data.event.event_date), data.event.venue].filter(Boolean).join(" · ") || " ",
        methodLabel: SCORE_METHOD_LABELS[data.event.score_method],
        podiumSize: data.event.podium_size,
        totals: `${data.projects.length} proyectos · ${data.submissions.length} evaluaciones · ${
          new Set(data.submissions.map((s) => s.evaluator_id)).size
        } evaluadores`,
      }}
      rows={rows}
      byCategory={byCategory}
      categoryName={(id) => catName(id) || "—"}
      criteria={criteriaLabels(rows)}
    />,
  ).toBlob();
  downloadBlob(`${fileBase(data)}.pdf`, blob);
}
