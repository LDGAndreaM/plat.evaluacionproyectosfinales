import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, contactLabel, ownerLabel } from "@/lib/legal";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PrivacyPage() {
  const email = LEGAL.contactEmail;
  return (
    <>
      <h1>Aviso de privacidad integral</h1>
      <p>
        {LEGAL.siteName} es una plataforma para evaluar proyectos académicos y organizar clases (grupos, asistencia, actividades y
        calificaciones). En este aviso te explicamos qué datos personales tratamos, para qué y cuáles son tus derechos, conforme a la Ley
        Federal de Protección de Datos Personales en Posesión de los Particulares y su normativa aplicable.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento de tus datos es <strong>{ownerLabel()}</strong>
        {LEGAL.address ? `, con domicilio en ${LEGAL.address}` : ""}. Para cualquier asunto relacionado con tus datos puedes escribir a{" "}
        {email ? <a href={`mailto:${email}`}>{email}</a> : contactLabel()}.
      </p>

      <h2>2. Datos que tratamos</h2>
      <table>
        <thead>
          <tr>
            <th>Quién</th>
            <th>Datos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Docentes</td>
            <td>Nombre, correo, institución, foto y datos de contacto opcionales (teléfono, correo alterno, departamento). Información de sus grupos, actividades, eventos y herramientas.</td>
          </tr>
          <tr>
            <td>Estudiantes</td>
            <td>
              Nombre, apellidos, correo, matrícula y grupo (los puede registrar su docente); foto y datos de contacto opcionales; registros de
              asistencia (fecha y hora); <strong>ubicación aproximada</strong> (latitud, longitud y precisión) solo en el momento de registrar
              asistencia y solo si la compartes; entregas (textos, archivos y enlaces), calificaciones y comentarios; justificantes (motivo y
              comprobante).
            </td>
          </tr>
          <tr>
            <td>Evaluadores (jurado)</td>
            <td>Nombre y, de forma opcional, correo e institución; sus evaluaciones de proyectos.</td>
          </tr>
          <tr>
            <td>Quien resuelve una ficha compartida</td>
            <td>Nombre, grupo (opcional) y respuestas.</td>
          </tr>
          <tr>
            <td>Todos</td>
            <td>Datos técnicos necesarios para mantener la sesión iniciada (ver la Política de cookies).</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Datos personales sensibles</h2>
      <p>
        No solicitamos datos sensibles. Sin embargo, un <strong>justificante</strong> puede contener información de salud (por ejemplo, una
        receta o constancia médica). Por eso, antes de enviarlo te pedimos tu <strong>consentimiento expreso</strong>. Ese documento solo lo ven
        tú y los docentes del grupo, se guarda en almacenamiento privado y se elimina si borras el justificante o tu cuenta.
      </p>
      <p>
        La ubicación no se rastrea: se toma una sola vez al registrar asistencia, únicamente si tú eliges compartirla, para comprobar que estás
        en el aula.
      </p>

      <h2>4. Finalidades</h2>
      <p>Tus datos se usan únicamente para:</p>
      <ul>
        <li>Crear y administrar tu cuenta e identificarte al iniciar sesión.</li>
        <li>Inscribirte en grupos, mostrar tus clases y comunicarte con tu docente (avisos, comentarios y notificaciones).</li>
        <li>Registrar y validar la asistencia, y gestionar justificantes.</li>
        <li>Recibir, revisar y calificar actividades, y calcular calificaciones y reportes académicos.</li>
        <li>Organizar y calificar evaluaciones de proyectos en eventos académicos.</li>
        <li>Mantener la seguridad de la plataforma y prevenir el mal uso.</li>
      </ul>
      <p>
        <strong>No</strong> usamos tus datos para publicidad, no los vendemos y no creamos perfiles comerciales. No hay finalidades secundarias.
      </p>

      <h2>5. Con quién se comparten</h2>
      <ul>
        <li>
          <strong>Dentro de la plataforma:</strong> los docentes (titular y co-docentes) de tus grupos ven tus datos académicos y de contacto;
          tú ves los de tus docentes. Tus compañeros de grupo no ven tus datos. Los organizadores de un evento ven las evaluaciones que se hacen
          en él.
        </li>
        <li>
          <strong>Proveedores que nos ayudan a operar el servicio</strong> (encargados), solo para ese fin: Supabase (base de datos y archivos),
          Vercel (alojamiento de la aplicación) y Google/Firebase (solo si inicias sesión con Google). Estos servicios pueden almacenar datos
          fuera de México.
        </li>
        <li>Autoridades, únicamente cuando una ley lo exija.</li>
      </ul>

      <h2>6. Conservación y eliminación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta exista. Desde <strong>Mi perfil → Eliminar mi cuenta</strong> puedes borrarla en cualquier
        momento: se eliminan tu perfil, foto, datos de contacto, justificantes, notificaciones y las coordenadas de ubicación. Si eres docente,
        también se eliminan tus grupos, eventos y herramientas. Las calificaciones y la asistencia (sin ubicación) pueden permanecer en la lista
        de tu docente como parte del registro académico del curso, sin vínculo con tu cuenta.
      </p>

      <h2>7. Tus derechos (ARCO) y revocación del consentimiento</h2>
      <p>
        Tienes derecho a <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong>, <strong>Cancelarlos</strong> y{" "}
        <strong>Oponerte</strong> a su uso, así como a revocar tu consentimiento. Muchas de estas acciones las puedes hacer tú desde Mi perfil
        (editar datos o eliminar tu cuenta). Para cualquier otra solicitud escribe a {email ? <a href={`mailto:${email}`}>{email}</a> : contactLabel()}{" "}
        indicando tu nombre, el correo de tu cuenta, lo que solicitas y, si corresponde, un documento que acredite tu identidad. Te
        responderemos dentro de los plazos que marca la ley.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        La plataforma está pensada principalmente para estudiantes de nivel medio superior y superior. Si eres menor de edad, úsala con la
        autorización de tu madre, padre o tutor, quienes pueden ejercer tus derechos.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Usamos solo cookies y almacenamiento del navegador necesarios para que la plataforma funcione. Consulta la{" "}
        <Link href="/cookies">Política de cookies</Link>.
      </p>

      <h2>10. Cambios a este aviso</h2>
      <p>
        Si cambiamos este aviso lo publicaremos en esta página y, cuando el cambio sea relevante, te pediremos aceptarlo de nuevo al iniciar
        sesión.
      </p>

      <h2>11. Autoridad</h2>
      <p>
        Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir a la autoridad competente en la
        materia.
      </p>
    </>
  );
}
