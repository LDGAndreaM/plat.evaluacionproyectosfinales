"use client";

import type { FirebaseApp } from "firebase/app";

/** Configuración pública de Firebase (se usa solo para la ventana de "Iniciar con Google"). */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseConfigured() {
  return !!(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;

export async function getFirebaseApp() {
  if (!firebaseConfigured()) return null;
  if (app) return app;
  const { initializeApp, getApps } = await import("firebase/app");
  app = getApps()[0] ?? initializeApp(config);
  return app;
}
