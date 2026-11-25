import { describe, expect, it } from "vitest";
import { buildDigest } from "./digest";

const site = "https://evaluaqr.vercel.app";

describe("buildDigest", () => {
  it("arma asunto, enlaces absolutos y escapa HTML", () => {
    const d = buildDigest({
      name: "Ana López",
      site,
      notices: [{ kind: "grade", title: "Calificaron <Cartel>", body: "9.5", link: "/actividades/abc" }],
      due: [{ id: "x1", title: "Ensayo", class: "Diseño 7A", due_at: "2026-11-26T06:59:00Z" }],
    });
    expect(d.subject).toBe("EvalúaQR: 1 entrega por vencer y 1 novedad");
    expect(d.html).toContain("Hola Ana");
    expect(d.html).toContain("Calificaron &lt;Cartel&gt;");
    expect(d.html).toContain(`${site}/actividades/abc`);
    expect(d.html).toContain(`${site}/actividades/x1`);
    expect(d.text).toContain("vence el miércoles, 25 de noviembre");
    expect(d.text).toContain(`${site}/perfil`);
  });

  it("limita la lista de novedades", () => {
    const notices = Array.from({ length: 15 }, (_, i) => ({ kind: "submission", title: `Entrega ${i}`, body: null, link: null }));
    const d = buildDigest({ name: "", site, notices, due: [] });
    expect(d.subject).toBe("EvalúaQR: 15 novedades");
    expect(d.text).toContain("Y 3 más");
    expect(d.html).not.toContain("Entrega 14");
  });
});
