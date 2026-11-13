import { describe, expect, it } from "vitest";
import { fieldsToCsv, parseFormCsv, templateCsv } from "./csv";
import { scoreSubmission } from "@/lib/scoring";

describe("CSV de formularios", () => {
  it("la plantilla se importa sin errores y suma 100 %", () => {
    const { fields, issues } = parseFormCsv(templateCsv(), "f");
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(fields).toHaveLength(14);
    const scored = fields.filter((f) => f.scored);
    expect(scored.map((f) => f.label)).toEqual(["Creatividad", "Concepto", "Ejecución técnica", "Presentación", "Viabilidad"]);
    expect(scored.reduce((a, f) => a + f.weight, 0)).toBe(100);
    const matrix = fields.find((f) => f.type === "matrix")!;
    expect(matrix.config.rows?.map((r) => r.label)).toEqual(["Orden", "Señalética", "Materiales de apoyo"]);
    expect(fields.find((f) => f.type === "page_break")).toBeTruthy();
  });

  it("acepta punto y coma, acentos y nombres alternativos", () => {
    const csv =
      "Tipo;Pregunta;Obligatoria;Puntúa;Ponderación;Opciones\n" +
      "Escala Likert;Creatividad;Sí;sí;60 %;Malo|Bueno|Excelente\n" +
      "Sí / No;¿Entregó?;x;si;40;\n" +
      "Párrafo;Comentarios;no;no;;\n";
    const { fields, issues } = parseFormCsv(csv, "f");
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(fields.map((f) => f.type)).toEqual(["likert", "yes_no", "long_text"]);
    expect(fields[0].weight).toBe(60);
    expect(fields[0].required).toBe(true);
    expect(fields[0].config.options?.map((o) => o.points)).toEqual([1, 2, 3]);
    const ans = { [fields[0].id]: fields[0].config.options![2].id, [fields[1].id]: true };
    expect(scoreSubmission(fields, ans).total).toBe(100);
  });

  it("reparte ponderaciones si no se indican", () => {
    const csv = "tipo,pregunta,puntua\nlikert,A,si\nlikert,B,si\nlikert,C,si\n";
    const { fields } = parseFormCsv(csv, "f");
    expect(fields.map((f) => f.weight)).toEqual([33.33, 33.33, 33.34]);
  });

  it("reporta errores por fila", () => {
    const csv =
      "tipo,pregunta,opciones,puntos\n" +
      "inventado,Algo,,\n" +
      "opcion_multiple,Sin opciones,Una,\n" +
      "likert,Puntos mal,A|B|C,1|2\n" +
      "texto_corto,Bien,,\n";
    const { fields, issues } = parseFormCsv(csv, "f");
    expect(fields).toHaveLength(1);
    expect(issues.map((i) => i.row)).toEqual([2, 3, 4]);
  });

  it("sin columnas obligatorias da un error claro", () => {
    const { issues } = parseFormCsv("nombre,valor\na,b\n", "f");
    expect(issues[0].message).toMatch(/tipo/);
  });

  it("exportar e importar conserva el formulario", () => {
    const original = parseFormCsv(templateCsv(), "f").fields;
    const again = parseFormCsv(fieldsToCsv(original), "f").fields;
    const strip = (fs: typeof original) =>
      fs.map((f) => ({
        type: f.type,
        label: f.label,
        help: f.help,
        required: f.required,
        scored: f.scored,
        weight: f.weight,
        options: f.config.options?.map((o) => [o.label, o.points]),
        columns: f.config.columns?.map((o) => [o.label, o.points]),
        rows: f.config.rows?.map((r) => r.label),
        min: f.config.min,
        max: f.config.max,
      }));
    expect(strip(again)).toEqual(strip(original));
  });
});
