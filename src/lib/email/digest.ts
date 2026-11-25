/** Arma el correo del resumen diario (HTML y texto). Sin dependencias del servidor para poder probarlo. */

export interface DigestNotice {
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
}
export interface DigestDue {
  id: string;
  title: string;
  class: string;
  due_at: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MAX = 12;

export function dueText(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Hermosillo",
  }).format(new Date(iso));
}

export function buildDigest(opts: { name: string; notices: DigestNotice[]; due: DigestDue[]; site: string }) {
  const { notices, due, site } = opts;
  const first = opts.name.trim().split(/\s+/)[0] || "";
  const abs = (link: string | null) => (link ? (/^https?:\/\//.test(link) ? link : site + link) : site + "/inicio");
  const parts: string[] = [];
  if (due.length) parts.push(due.length === 1 ? "1 entrega por vencer" : `${due.length} entregas por vencer`);
  if (notices.length) parts.push(notices.length === 1 ? "1 novedad" : `${notices.length} novedades`);
  const subject = `EvalúaQR: ${parts.join(" y ")}`;

  const shown = notices.slice(0, MAX);
  const extra = notices.length - shown.length;

  const text = [
    `Hola${first ? ` ${first}` : ""}, este es tu resumen de EvalúaQR.`,
    due.length ? `\nPOR VENCER\n${due.map((d) => `- ${d.title} (${d.class}): vence el ${dueText(d.due_at)}\n  ${site}/actividades/${d.id}`).join("\n")}` : "",
    shown.length ? `\nNOVEDADES\n${shown.map((n) => `- ${n.title}${n.body ? ` · ${n.body}` : ""}\n  ${abs(n.link)}`).join("\n")}` : "",
    extra > 0 ? `\nY ${extra} más en ${site}/notificaciones` : "",
    `\nPara dejar de recibir estos correos, desactívalos en Mi perfil: ${site}/perfil`,
  ]
    .filter(Boolean)
    .join("\n");

  const row = (title: string, sub: string, href: string, color: string) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #eee">
      <a href="${esc(href)}" style="color:#1e1b4b;text-decoration:none;font-weight:600;font-size:15px">${esc(title)}</a>
      ${sub ? `<div style="color:${color};font-size:13px;margin-top:2px">${esc(sub)}</div>` : ""}
    </td></tr>`;

  const section = (title: string, rows: string) =>
    `<h2 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#6a11cb;margin:24px 0 4px">${title}</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`;

  const html = `<!doctype html><html lang="es-MX"><body style="margin:0;background:#f7f5fd;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5fd;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;padding:28px">
    <tr><td>
      <img src="${site}/brand/evaluaqr-logo.png" alt="EvalúaQR" width="150" style="display:block;height:auto">
      <p style="font-size:16px;color:#1e1b4b;margin:20px 0 0">Hola${first ? ` ${esc(first)}` : ""}, este es tu resumen de hoy.</p>
      ${due.length ? section("Por vencer", due.map((d) => row(d.title, `${d.class} · vence el ${dueText(d.due_at)}`, `${site}/actividades/${d.id}`, "#b4234a")).join("")) : ""}
      ${shown.length ? section("Novedades", shown.map((n) => row(n.title, n.body ?? "", abs(n.link), "#64748b")).join("")) : ""}
      ${extra > 0 ? `<p style="font-size:14px;color:#475569">Y ${extra} más.</p>` : ""}
      <p style="margin:28px 0 8px"><a href="${site}/inicio" style="display:inline-block;background:#6a11cb;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">Abrir EvalúaQR</a></p>
      <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin-top:24px">Recibes este correo porque tienes activado el resumen diario. Puedes desactivarlo en <a href="${site}/perfil" style="color:#6a11cb">Mi perfil</a>.<br>EvalúaQR es una herramienta independiente; no es oficial de ninguna institución.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  return { subject, html, text };
}
