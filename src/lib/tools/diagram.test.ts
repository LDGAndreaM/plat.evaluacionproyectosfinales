import { describe, expect, it } from "vitest";
import { autoLayout, defaultDiagram } from "./diagram";

describe("diagramas", () => {
  it("plantillas iniciales conectadas", () => {
    for (const k of ["conceptmap", "flowchart"] as const) {
      const d = defaultDiagram(k);
      const ids = new Set(d.nodes.map((n) => n.id));
      expect(d.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(true);
    }
  });

  it("acomodo automático vertical: cada hijo queda debajo de su padre", async () => {
    const d = await autoLayout(defaultDiagram("conceptmap"), "TB");
    const [main, a, b] = d.nodes;
    expect(a.y).toBeGreaterThan(main.y + main.h);
    expect(b.y).toBe(a.y);
    expect(a.x).not.toBe(b.x);
  });

  it("acomodo horizontal: los hijos quedan a la derecha", async () => {
    const d = await autoLayout(defaultDiagram("conceptmap"), "LR");
    expect(d.nodes[1].x).toBeGreaterThan(d.nodes[0].x + d.nodes[0].w);
  });
});
