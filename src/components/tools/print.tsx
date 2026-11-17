"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Contenido que solo aparece al imprimir (se monta directamente en <body>). */
export function PrintArea({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Montaje en el cliente para usar document.body
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(<div className="print-root">{children}</div>, document.body);
}

export function printNow() {
  document.body.classList.add("printing");
  const done = () => {
    document.body.classList.remove("printing");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
  setTimeout(done, 1000);
}

export function SheetHeader({ title, instructions }: { title: string; instructions?: string }) {
  return (
    <div style={{ marginBottom: "6mm" }}>
      <h1 style={{ fontSize: "20pt", fontWeight: 800, margin: 0 }}>{title}</h1>
      <div style={{ display: "flex", gap: "8mm", marginTop: "4mm", fontSize: "11pt" }}>
        <span style={{ flex: 2 }}>Nombre: ________________________________</span>
        <span style={{ flex: 1 }}>Fecha: ______________</span>
      </div>
      {instructions && <p style={{ fontSize: "11pt", marginTop: "3mm" }}>{instructions}</p>}
    </div>
  );
}
