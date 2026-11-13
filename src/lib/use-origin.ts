"use client";

import { useSyncExternalStore } from "react";

/** Dirección pública de la app (la del navegador; en el servidor usa NEXT_PUBLIC_SITE_URL). */
export function useOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, ""),
  );
}
