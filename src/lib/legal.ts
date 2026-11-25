/**
 * Datos legales de EvalúaQR.
 * ⚠️ PENDIENTE: completar el domicilio (ciudad y estado).
 * Si cambias el contenido del aviso de privacidad, sube PRIVACY_VERSION para que todos lo acepten de nuevo.
 */
export const LEGAL = {
  /** Persona o institución responsable de los datos personales. */
  owner: "Mtra. Andrea Martínez Casas",
  /** Correo para dudas y derechos ARCO. */
  contactEmail: "andrea.martinez218685@potros.itson.edu.mx",
  /** Domicilio (ciudad y estado basta para empezar). */
  address: "",
  siteName: "EvalúaQR",
};

/** Aclaración de independencia: la herramienta no es oficial de ninguna institución. */
export const INDEPENDENCE_NOTICE =
  "EvalúaQR es una herramienta independiente creada por un docente para facilitar su trabajo y mejorar los procesos de evaluación y calificación de los trabajos. No es una herramienta oficial: no está autorizada, administrada ni respaldada por el Instituto Tecnológico de Sonora (ITSON) ni por ninguna otra institución educativa.";
export const INDEPENDENCE_SHORT = "Herramienta independiente creada por un docente. No es oficial ni está autorizada o administrada por ITSON.";

export const PRIVACY_VERSION = "2026-11-25";
export const LEGAL_UPDATED = "25 de noviembre de 2026";

export function ownerLabel() {
  return LEGAL.owner || "el responsable de EvalúaQR";
}

export function contactLabel() {
  return LEGAL.contactEmail || "el correo de contacto que se publique en esta página";
}
