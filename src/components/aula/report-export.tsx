"use client";

import Papa from "papaparse";
import type { ReportTable } from "@/lib/aula/reports";
import { downloadBlob } from "@/lib/qr";

export type ReportFormat = "xlsx" | "csv" | "pdf";

export async function exportReport(format: ReportFormat, tables: ReportTable[], opts: { fileName: string; heading: string; meta: string }) {
  if (format === "csv") {
    const parts = tables.map((t) => {
      const csv = Papa.unparse({ fields: t.columns.map((c) => c.label.replace(/\n/g, " ")), data: t.rows.map((r) => r.map((v) => v ?? "")) });
      return (tables.length > 1 ? `${t.title}\n` : "") + csv + (t.note ? `\n${t.note}` : "");
    });
    downloadBlob(`${opts.fileName}.csv`, new Blob(["﻿" + `${opts.heading}\n${opts.meta}\n\n` + parts.join("\n\n")], { type: "text/csv;charset=utf-8" }));
    return;
  }

  if (format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "EvalúaQR";
    const used = new Set<string>();
    for (const t of tables) {
      let name = t.title.replace(/[\\/?*[\]:]/g, "").slice(0, 28) || "Hoja";
      while (used.has(name)) name = `${name.slice(0, 26)}_${used.size}`;
      used.add(name);
      const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4, xSplit: 1 }] });
      ws.addRow([opts.heading]).font = { bold: true, size: 14, color: { argb: "FF3A0A71" } };
      ws.addRow([t.subtitle ? `${opts.meta} · ${t.subtitle}` : opts.meta]).font = { color: { argb: "FF64748B" }, size: 9 };
      ws.addRow([]);
      const head = ws.addRow(t.columns.map((c) => c.label.replace(/\n/g, " ")));
      head.eachCell((c) => {
        c.font = { bold: true, color: { argb: "FF3A0A71" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
        c.alignment = { vertical: "middle", wrapText: true };
      });
      t.rows.forEach((r, i) => {
        const row = ws.addRow(r.map((v) => v ?? ""));
        if (t.highlight?.includes(i))
          row.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F4" } }));
        t.columns.forEach((col, ci) => {
          if (col.align) row.getCell(ci + 1).alignment = { horizontal: col.align };
        });
      });
      if (t.note) {
        ws.addRow([]);
        ws.addRow([t.note]).font = { italic: true, color: { argb: "FF64748B" }, size: 9 };
      }
      ws.columns.forEach((col, i) => {
        const longest = Math.max(t.columns[i]?.label.length ?? 8, ...t.rows.map((r) => String(r[i] ?? "").length));
        col.width = Math.min(48, Math.max(i === 0 ? 24 : 9, longest + 2));
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    downloadBlob(`${opts.fileName}.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    return;
  }

  const [{ pdf }, { ReportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdf")]);
  const landscape = tables.some((t) => t.columns.length > 6);
  const blob = await pdf(<ReportPdf heading={opts.heading} meta={opts.meta} tables={tables} landscape={landscape} />).toBlob();
  downloadBlob(`${opts.fileName}.pdf`, blob);
}
