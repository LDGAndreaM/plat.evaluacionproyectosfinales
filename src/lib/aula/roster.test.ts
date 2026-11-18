import { describe, expect, it } from "vitest";
import { errorReport, parseRoster, ROSTER_TEMPLATE } from "./roster";
import { scheduleSummary } from "./types";

describe("parseRoster", () => {
  it("lee la plantilla sin errores", () => {
    const r = parseRoster(ROSTER_TEMPLATE);
    expect(r.missingColumns).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows.every((x) => x.status === "ok")).toBe(true);
    expect(r.rows[0].entry).toMatchObject({ first_name: "Ana Sofía", last_name: "López García", student_number: "00000123456", section: "7A" });
  });

  it("acepta encabezados con variantes y BOM", () => {
    const r = parseRoster("﻿NOMBRE;Apellido(s);E-mail\nAna;Pérez;ANA@X.MX\n");
    expect(r.missingColumns).toEqual([]);
    expect(r.rows[0].entry.email).toBe("ana@x.mx");
  });

  it("detecta columnas faltantes", () => {
    const r = parseRoster("Nombre,Correo\nAna,a@b.co\n");
    expect(r.missingColumns).toEqual(["Apellidos"]);
  });

  it("marca errores, duplicados y existentes", () => {
    const csv = [
      "Nombre,Apellidos,Correo,Matrícula",
      "Ana,Pérez,ana@x.mx,1",
      ",Soto,luis@x.mx,2",
      "Eva,Ruiz,correo-malo,3",
      "Ana B,Pérez,ANA@x.mx,4",
      "Juan,Díaz,juan@x.mx,1",
      "Mar,Gil,mar@x.mx,5",
    ].join("\n");
    const r = parseRoster(csv, ["mar@x.mx"]);
    expect(r.rows.map((x) => x.status)).toEqual(["ok", "error", "error", "duplicate", "duplicate", "existing"]);
    expect(r.rows[3].problems[0]).toContain("línea 2");
    const report = errorReport(r.rows);
    expect(report.split("\n")).toHaveLength(6);
    expect(report).toContain("Falta el nombre");
  });
});

describe("scheduleSummary", () => {
  it("agrupa días con el mismo horario", () => {
    expect(
      scheduleSummary([
        { day: "mie", start: "08:00", end: "10:00" },
        { day: "lun", start: "08:00", end: "10:00" },
        { day: "vie", start: "12:00", end: "13:00" },
      ]),
    ).toBe("Lun, Mié 08:00–10:00 · Vie 12:00–13:00");
  });
});
