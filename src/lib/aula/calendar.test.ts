import { describe, expect, it } from "vitest";
import { activityItems, groupByDate, monthGrid, monthLabel, scheduleItems, shiftMonth, toIcs } from "./calendar";
import type { Activity } from "./activities";

describe("calendario", () => {
  it("cuadrícula del mes empieza en lunes", () => {
    const g = monthGrid("2026-11"); // 1 nov 2026 es domingo
    expect(g[0].date).toBe("2026-10-26");
    expect(g[6]).toEqual({ date: "2026-11-01", inMonth: true });
    expect(g.length % 7).toBe(0);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthLabel("2026-11")).toBe("Noviembre de 2026");
  });
  it("días de clase recurrentes", () => {
    const items = scheduleItems(
      { id: "c", name: "Diseño", color: "#000", schedule: [{ day: "lun", start: "08:00", end: "10:00" }, { day: "mie", start: "08:00", end: "10:00" }] },
      "2026-11-16",
      "2026-11-22",
    );
    expect(items.map((i) => i.date)).toEqual(["2026-11-16", "2026-11-18"]);
  });
  it("actividades: el estudiante no ve borradores ni programadas", () => {
    const classes = new Map([["c", { name: "Diseño", color: "#000" }]]);
    const base = { class_id: "c", title: "T", publish_at: null } as Partial<Activity>;
    const acts = [
      { ...base, id: "1", status: "published", due_at: "2026-11-19T06:59:00Z" },
      { ...base, id: "2", status: "draft", due_at: "2026-11-20T06:59:00Z" },
      { ...base, id: "3", status: "published", due_at: "2026-11-30T06:59:00Z", publish_at: "2026-11-25T15:00:00Z" },
    ] as Activity[];
    const now = Date.parse("2026-11-18T00:00:00Z");
    const st = activityItems(acts, classes, "student", now);
    expect(st.map((i) => i.date)).toEqual(["2026-11-18"]); // 23:59 en Sonora
    const te = activityItems(acts, classes, "teacher", now);
    expect(te.filter((i) => i.kind === "publish")).toHaveLength(1);
    expect(groupByDate(te).get("2026-11-29")?.[0].kind).toBe("due");
  });
  it("genera .ics", () => {
    const ics = toIcs([{ date: "2026-11-18", title: "Tarea, 1", kind: "due", at: "2026-11-19T06:59:00Z", href: "/actividades/1" }], "Mi calendario", "https://x.app");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261119T065900Z");
    expect(ics).toContain("SUMMARY:Entrega: Tarea\\, 1");
    expect(ics).toContain("URL:https://x.app/actividades/1");
  });
});
