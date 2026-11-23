import { describe, expect, it } from "vitest";
import { countStatuses, dateRangeLabel, formatRate, localDate, sessionLabel } from "./attendance";

describe("asistencia", () => {
  it("calcula el porcentaje sin contar los pendientes de revisión", () => {
    const c = countStatuses(["present", "present", "late", "absent", "excused", "review"]);
    expect(c).toMatchObject({ present: 2, late: 1, absent: 1, excused: 1, review: 1, total: 6, rate: 80 });
    expect(formatRate(c.rate)).toBe("80%");
    expect(countStatuses([]).rate).toBeNull();
    expect(formatRate(countStatuses(["present", "absent", "absent"]).rate)).toBe("33.3%");
  });

  it("usa la hora de Sonora", () => {
    // 2026-11-19 02:30 UTC = 18 nov 19:30 en Hermosillo
    expect(localDate("2026-11-19T02:30:00Z")).toBe("2026-11-18");
    expect(sessionLabel("2026-11-19T02:30:00Z")).toContain("19:30");
    expect(dateRangeLabel("2026-11-18", "2026-11-18")).toContain("18");
    expect(dateRangeLabel("2026-11-18", "2026-11-20")).toContain("–");
  });
});

import { formatDate } from "@/lib/utils";
describe("formatDate", () => {
  it("acepta fecha simple y marca de tiempo", () => {
    expect(formatDate("2026-11-18")).toContain("noviembre");
    expect(formatDate("2026-11-19T02:30:00Z")).toContain("18");
    expect(formatDate("basura")).toBe("");
  });
});

import { fromLocalInput, toLocalInput } from "./attendance";
describe("fechas locales", () => {
  it("convierte la hora de Sonora", () => {
    expect(fromLocalInput("2026-11-23T23:59")).toBe("2026-11-24T06:59:00.000Z");
    expect(toLocalInput("2026-11-24T06:59:00.000Z")).toBe("2026-11-23T23:59");
    expect(fromLocalInput("")).toBeNull();
  });
});
