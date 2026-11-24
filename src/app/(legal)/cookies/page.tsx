import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de cookies" };

export default function CookiesPage() {
  return (
    <>
      <h1>Política de cookies</h1>
      <p>
        {LEGAL.siteName} usa <strong>solo cookies y almacenamiento del navegador necesarios</strong> para que la plataforma funcione. No usamos
        cookies de publicidad, de redes sociales ni de analítica, y no te rastreamos entre sitios.
      </p>

      <h2>¿Qué usamos?</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre / tipo</th>
            <th>Para qué</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cookies de sesión (sb-…-auth-token)</td>
            <td>Mantener tu sesión iniciada de forma segura. Son estrictamente necesarias.</td>
            <td>Mientras la sesión esté activa; se renuevan solas.</td>
          </tr>
          <tr>
            <td>Almacenamiento local del navegador</td>
            <td>
              Recordar el avance de una ficha o actividad que aún no envías, el nombre del evaluador en un evento y que ya viste el aviso de
              cookies.
            </td>
            <td>Hasta que lo borres o envíes la actividad.</td>
          </tr>
          <tr>
            <td>Google / Firebase (solo si eliges “Continuar con Google”)</td>
            <td>Mostrar la ventana de inicio de sesión de Google. Google aplica su propia política.</td>
            <td>Según Google.</td>
          </tr>
        </tbody>
      </table>

      <h2>¿Puedo desactivarlas?</h2>
      <p>
        Puedes borrar o bloquear cookies desde la configuración de tu navegador. Si bloqueas las cookies de sesión no podrás iniciar sesión en
        la plataforma.
      </p>

      <h2>Más información</h2>
      <p>
        Consulta el <Link href="/privacidad">Aviso de privacidad</Link> y los <Link href="/terminos">Términos y condiciones</Link>.
      </p>
    </>
  );
}
