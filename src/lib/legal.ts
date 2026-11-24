/**
 * Datos legales de EvalúaQR.
 * ⚠️ PENDIENTE: completa el nombre del responsable, el correo de contacto y el domicilio.
 * Si cambias el contenido del aviso de privacidad, sube PRIVACY_VERSION para que todos lo acepten de nuevo.
 */
export const LEGAL = {
  /** Persona o institución responsable de los datos personales. */
  owner: "",
  /** Correo para dudas y derechos ARCO. */
  contactEmail: "",
  /** Domicilio (ciudad y estado basta para empezar). */
  address: "",
  siteName: "EvalúaQR",
};

export const PRIVACY_VERSION = "2026-11-25";
export const LEGAL_UPDATED = "25 de noviembre de 2026";

export function ownerLabel() {
  return LEGAL.owner || "el responsable de EvalúaQR";
}

export function contactLabel() {
  return LEGAL.contactEmail || "el correo de contacto que se publique en esta página";
}
