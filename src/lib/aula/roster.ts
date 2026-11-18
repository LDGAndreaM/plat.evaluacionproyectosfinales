import Papa from "papaparse";

/** Fila ya normalizada para guardar en class_students. */
export interface RosterEntry {
  first_name: string;
  last_name: string;
  email: string;
  student_number: string | null;
  section: string | null;
  extra_id: string | null;
}

export type RowStatus = "ok" | "error" | "duplicate" | "existing";

export interface RosterRow {
  line: number; // línea del archivo (1 = encabezados)
  entry: RosterEntry;
  status: RowStatus;
  problems: string[];
}

export interface RosterParse {
  rows: RosterRow[];
  missingColumns: string[];
  unknownColumns: string[];
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const HEADER_MAP: Record<string, keyof RosterEntry> = {
  nombre: "first_name",
  nombres: "first_name",
  "first name": "first_name",
  apellido: "last_name",
  apellidos: "last_name",
  "apellido s": "last_name",
  "last name": "last_name",
  correo: "email",
  "correo electronico": "email",
  email: "email",
  "e mail": "email",
  mail: "email",
  matricula: "student_number",
  "no de control": "student_number",
  "numero de control": "student_number",
  grupo: "section",
  seccion: "section",
  id: "extra_id",
  "id externo": "extra_id",
};

export function normalizeHeader(h: string) {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const ROSTER_TEMPLATE =
  "Nombre,Apellidos,Correo,Matrícula,Grupo,ID\n" +
  "Ana Sofía,López García,ana.lopez@ejemplo.com,00000123456,7A,\n" +
  "Luis,Ramírez Soto,luis.ramirez@ejemplo.com,00000123457,7A,\n";

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * Lee el CSV de alumnos y valida cada fila.
 * `existingEmails` son los correos que ya están en el grupo (en minúsculas).
 */
export function parseRoster(text: string, existingEmails: Iterable<string> = []): RosterParse {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const mapping = new Map<string, keyof RosterEntry>();
  const unknownColumns: string[] = [];
  for (const h of headers) {
    const key = HEADER_MAP[normalizeHeader(h)];
    if (key && ![...mapping.values()].includes(key)) mapping.set(h, key);
    else if (h) unknownColumns.push(h);
  }
  const found = new Set(mapping.values());
  const missingColumns = [
    ["first_name", "Nombre"],
    ["last_name", "Apellidos"],
    ["email", "Correo"],
  ]
    .filter(([k]) => !found.has(k as keyof RosterEntry))
    .map(([, label]) => label);

  const existing = new Set([...existingEmails].map((e) => e.toLowerCase()));
  const seenEmails = new Map<string, number>();
  const seenNumbers = new Map<string, number>();
  const rows: RosterRow[] = [];

  parsed.data.forEach((raw, i) => {
    const e: RosterEntry = { first_name: "", last_name: "", email: "", student_number: null, section: null, extra_id: null };
    for (const [h, key] of mapping) {
      const v = clean(raw[h]);
      if (key === "first_name" || key === "last_name" || key === "email") e[key] = v;
      else e[key] = v || null;
    }
    e.email = e.email.toLowerCase();
    const line = i + 2;
    const problems: string[] = [];
    let status: RowStatus = "ok";

    if (!e.first_name) problems.push("Falta el nombre");
    if (!e.last_name) problems.push("Faltan los apellidos");
    if (!e.email) problems.push("Falta el correo");
    else if (!EMAIL_RE.test(e.email)) problems.push(`Correo no válido: ${e.email}`);
    if (e.first_name.length > 80) problems.push("El nombre es muy largo (máx. 80)");
    if (e.last_name.length > 120) problems.push("Los apellidos son muy largos (máx. 120)");
    if ((e.student_number?.length ?? 0) > 40) problems.push("La matrícula es muy larga (máx. 40)");
    if ((e.section?.length ?? 0) > 40) problems.push("El grupo es muy largo (máx. 40)");
    if ((e.extra_id?.length ?? 0) > 60) problems.push("El ID es muy largo (máx. 60)");
    if (problems.length) status = "error";

    if (status === "ok") {
      const prevLine = seenEmails.get(e.email);
      const prevNum = e.student_number ? seenNumbers.get(e.student_number) : undefined;
      if (prevLine) {
        status = "duplicate";
        problems.push(`Correo repetido (igual que la línea ${prevLine})`);
      } else if (prevNum) {
        status = "duplicate";
        problems.push(`Matrícula repetida (igual que la línea ${prevNum})`);
      } else if (existing.has(e.email)) {
        status = "existing";
        problems.push("Ya está en el grupo");
      }
    }
    if (e.email && !seenEmails.has(e.email)) seenEmails.set(e.email, line);
    if (e.student_number && !seenNumbers.has(e.student_number)) seenNumbers.set(e.student_number, line);
    rows.push({ line, entry: e, status, problems });
  });

  return { rows, missingColumns, unknownColumns };
}

/** CSV con las filas que no se importarán y el motivo. */
export function errorReport(rows: RosterRow[]): string {
  const bad = rows.filter((r) => r.status !== "ok");
  return Papa.unparse({
    fields: ["Línea", "Nombre", "Apellidos", "Correo", "Matrícula", "Grupo", "ID", "Problema"],
    data: bad.map((r) => [
      r.line,
      r.entry.first_name,
      r.entry.last_name,
      r.entry.email,
      r.entry.student_number ?? "",
      r.entry.section ?? "",
      r.entry.extra_id ?? "",
      r.problems.join("; "),
    ]),
  });
}
