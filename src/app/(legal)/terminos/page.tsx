import type { Metadata } from "next";
import Link from "next/link";
import { INDEPENDENCE_NOTICE, LEGAL, contactLabel, ownerLabel } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  const email = LEGAL.contactEmail;
  return (
    <>
      <h1>Términos y condiciones de uso</h1>
      <p>
        Al crear una cuenta o usar {LEGAL.siteName} aceptas estos términos. Si no estás de acuerdo, no utilices la plataforma. El servicio es
        operado por {ownerLabel()}.
      </p>

      <h2>1. El servicio</h2>
      <p>
        {LEGAL.siteName} ofrece de forma gratuita herramientas para evaluar proyectos con códigos QR, organizar grupos, pasar lista, asignar y
        calificar actividades, generar reportes y crear actividades interactivas. Podemos agregar, cambiar o retirar funciones para mejorar el
        servicio.
      </p>
      <p>
        <strong>Herramienta no oficial.</strong> {INDEPENDENCE_NOTICE} Su uso es voluntario y complementario: no sustituye los sistemas ni
        los procedimientos oficiales de la institución, y lo que se registre aquí no constituye un registro oficial de la institución.
      </p>

      <h2>2. Cuentas</h2>
      <ul>
        <li>Al registrarte eliges si eres docente o estudiante. Debes dar datos verdaderos y mantener segura tu contraseña.</li>
        <li>Tu cuenta es personal: no la compartas ni uses la de otra persona.</li>
        <li>Los evaluadores de eventos pueden participar sin cuenta, escribiendo su nombre.</li>
      </ul>

      <h2>3. Responsabilidades del docente</h2>
      <ul>
        <li>Usar los datos de sus estudiantes solo con fines académicos y conforme a las normas de su institución.</li>
        <li>Registrar únicamente a personas que forman parte de sus grupos y mantener la información correcta.</li>
        <li>Ser responsable del contenido que publica (instrucciones, archivos, avisos, rúbricas y calificaciones).</li>
      </ul>

      <h2>4. Responsabilidades del estudiante</h2>
      <ul>
        <li>Registrar su propia asistencia y no hacerlo por otra persona; no compartir los códigos de asistencia.</li>
        <li>Entregar trabajos propios y respetar las reglas de honestidad académica de su institución.</li>
        <li>Enviar justificantes verdaderos.</li>
      </ul>

      <h2>5. Contenido que subes</h2>
      <p>
        Lo que subes (entregas, archivos, fichas, rúbricas, comentarios) sigue siendo tuyo. Nos das permiso únicamente para guardarlo y
        mostrarlo a las personas que deben verlo dentro de la plataforma. No subas contenido ilegal, ofensivo, que infrinja derechos de autor o
        que contenga datos de otras personas sin su autorización.
      </p>

      <h2>6. Usos no permitidos</h2>
      <ul>
        <li>Intentar acceder a datos de otros usuarios o a partes del sistema sin autorización.</li>
        <li>Falsear la ubicación o automatizar registros de asistencia o evaluaciones.</li>
        <li>Usar la plataforma para enviar publicidad, acosar o dañar a otras personas.</li>
      </ul>
      <p>Podemos suspender o eliminar cuentas que incumplan estos términos.</p>

      <h2>7. Disponibilidad y responsabilidad</h2>
      <p>
        El servicio se ofrece gratuitamente y “tal cual”. Hacemos lo posible por que funcione de forma continua y segura, pero puede haber
        interrupciones o errores. Te recomendamos descargar periódicamente tus reportes. Las decisiones académicas (calificaciones, asistencia)
        son responsabilidad del docente, quien debe registrarlas en los sistemas oficiales de su institución.
      </p>

      <h2>8. Privacidad</h2>
      <p>
        El tratamiento de tus datos personales se rige por el <Link href="/privacidad">Aviso de privacidad</Link> y la{" "}
        <Link href="/cookies">Política de cookies</Link>.
      </p>

      <h2>9. Cancelación</h2>
      <p>Puedes eliminar tu cuenta cuando quieras desde Mi perfil. Al hacerlo se borran tus datos como se describe en el aviso de privacidad.</p>

      <h2>10. Cambios y legislación</h2>
      <p>
        Podemos actualizar estos términos; publicaremos la versión vigente en esta página. Estos términos se rigen por las leyes de los Estados
        Unidos Mexicanos.
      </p>

      <h2>11. Contacto</h2>
      <p>Dudas sobre estos términos: {email ? <a href={`mailto:${email}`}>{email}</a> : contactLabel()}.</p>
    </>
  );
}
