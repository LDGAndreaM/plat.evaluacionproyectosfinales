# Guía de configuración y uso de EvalúaQR

Guía paso a paso para quien no programa. La plataforma vive en dos servicios gratuitos:

- **Supabase**: la base de datos, las cuentas y los archivos.
- **Vercel**: la página web, en **https://evaluaqr.vercel.app**.

El código está en GitHub (`LDGAndreaM/plat.evaluacionproyectosfinales`). Cada vez que se sube un cambio a GitHub, Vercel publica la nueva versión sola en uno o dos minutos.

---

## 1. Configuración de Supabase (una sola vez)

Entra a **https://supabase.com**, inicia sesión y abre el proyecto **evaluacion-proyectos-finales**.

### 1.1 Dirección de la página

1. En el menú de la izquierda: **Authentication → URL Configuration**.
2. En **Site URL** escribe: `https://evaluaqr.vercel.app` y presiona **Save**.
3. En **Redirect URLs** presiona **Add URL**, escribe `https://evaluaqr.vercel.app/**` (con los dos asteriscos) y guarda.

> Sin esto, los correos de confirmación y de "olvidé mi contraseña" mandan a una dirección equivocada.

### 1.2 Cómo entran los usuarios

En **Authentication → Sign In / Providers**:

- **Allow anonymous sign-ins**: debe estar **activado**. Es lo que permite que el jurado evalúe sin crear cuenta.
- **Confirm email**: recomendamos **desactivarlo**. El plan gratuito de Supabase solo envía unos 2 correos por hora; con la confirmación activa, si varios maestros se registran el mismo día, algunos no recibirán el correo.
  - Si prefieres dejarlo activo, considera configurar un servicio de correo propio en **Authentication → Emails → SMTP Settings**.

### 1.3 Iniciar sesión con Google (con Firebase)

El botón **Continuar con Google** ya está en la página. Firebase muestra la ventana de “Elige tu cuenta de Google” y Supabase sigue guardando las cuentas y los datos. Se configura una sola vez:

**A. En Firebase** (con tu cuenta de Gmail): https://console.firebase.google.com

1. **Crear un proyecto** (o “Agregar proyecto”). Nombre: `EvaluaQR`. Puedes desactivar Google Analytics. Presiona **Crear proyecto**.
2. Menú izquierdo: **Compilación → Authentication → Comenzar**.
3. Pestaña **Método de acceso** → **Google** → activa **Habilitar**.
   - **Nombre público del proyecto**: `EvalúaQR` (es lo que verán los maestros en la ventana de Google).
   - **Correo de asistencia**: tu correo. Presiona **Guardar**.
4. Vuelve a abrir **Google** en esa misma lista y despliega **Configuración del SDK web**. Copia el **ID de cliente web** y el **Secreto de cliente web** (los usarás en Supabase).
5. Pestaña **Configuración → Dominios autorizados → Agregar dominio**: escribe `evaluaqr.vercel.app` y agrégalo.
6. Engranaje ⚙️ (arriba a la izquierda) → **Configuración del proyecto** → sección **Tus apps** → ícono **web `</>`**. Nombre: `EvalúaQR web` (no marques Hosting) → **Registrar app**. Aparece un bloque `firebaseConfig`; copia los valores de `apiKey`, `authDomain`, `projectId` y `appId`.

**B. En Vercel**: proyecto → **Settings → Environment Variables**. Agrega:

| Nombre | Valor (de `firebaseConfig`) |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

Después ve a **Deployments → ⋯ → Redeploy**.

> Estos valores de `firebaseConfig` son públicos por diseño (los ve el navegador); no son contraseñas.

**C. En Supabase**: **Authentication → Sign In / Providers → Google**

1. Activa **Enable Sign in with Google**.
2. En **Client IDs** pega el **ID de cliente web** de Firebase (paso A.4).
3. En **Client Secret** pega el **Secreto de cliente web** (paso A.4).
4. Activa **Skip nonce checks** (necesario porque la ventana de Google la abre Firebase).
5. Presiona **Save**.

Listo: abre https://evaluaqr.vercel.app/login y presiona **Continuar con Google**. Si un maestro ya tenía cuenta con el mismo correo, entra a esa misma cuenta con sus eventos y herramientas.

Si aparece un aviso en amarillo al usar el botón, el mismo aviso dice qué paso falta (por ejemplo, “dominio no autorizado” = paso A.5).

### 1.4 Antes de cada evento (importante)

En el plan gratuito, Supabase **pausa el proyecto si no se usa en 7 días**. Unos días antes del evento:

1. Entra a supabase.com y abre el proyecto.
2. Si aparece **Paused**, presiona **Restore project** y espera unos minutos.
3. Abre https://evaluaqr.vercel.app e inicia sesión para confirmar que todo funciona.

---

## 2. Configuración de Vercel (ya está hecha)

En **https://vercel.com** → proyecto → **Settings → Environment Variables** deben existir estas tres variables:

| Nombre | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://iphvcgrkqgxatkpykzev.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_fQr8qP3LmhhiqIhKg8djug_0U7niWrE` |
| `NEXT_PUBLIC_SITE_URL` | `https://evaluaqr.vercel.app` |

Si agregas o cambias alguna, ve a **Deployments**, abre el menú **⋯** de la publicación más reciente y elige **Redeploy** para que se aplique.

> Estas claves son públicas por diseño (las ve el navegador). La seguridad la dan las reglas de la base de datos: cada organizador solo ve sus eventos y cada evaluador solo sus evaluaciones.

---

## 3. Cómo usar la plataforma en un evento

### Semanas antes

1. Entra a **https://evaluaqr.vercel.app** → **Crear cuenta** (o **Iniciar sesión**).
2. **Mis eventos → Nuevo evento**: nombre, fecha, sede, logo, portada y color.
   - Para probar antes, usa **Crear evento de demostración**.
   - Para reutilizar el del semestre pasado: abre ese evento → **Ajustes → Duplicar evento**.
3. **Proyectos**: agrega cada equipo (nombre, integrantes, **semestre**, categoría, stand) o usa **Importar CSV** con la plantilla descargable.
4. **Formularios → Nuevo formulario**: usa la rúbrica precargada, una plantilla, o **Importar desde Excel (CSV)**.
   - Revisa las ponderaciones (deben sumar 100 %).
   - Usa **Vista previa** para contestarlo como si fueras jurado.
   - Presiona **Guardar** y luego **Publicar**.
5. **Ajustes**: PIN opcional, método de cálculo, cuántos lugares premiar y co-organizadores.

### Días antes

6. **Códigos QR → Generar PDF**: elige "1 QR por hoja" (cartel para cada stand) o "6 por hoja" (para recortar). Imprime en tamaño carta.
7. Pega cada QR en su stand. Pon el QR general en la entrada o compártelo por WhatsApp junto con el PIN.

### El día del evento

8. **Resumen → Abrir evaluaciones**.
9. Los evaluadores escanean el QR con la cámara del celular, escriben su nombre (y el PIN si lo pusiste) y evalúan. No necesitan cuenta.
10. Sigue el avance en **Resultados** (se actualiza solo). Si un proyecto tiene pocas evaluaciones, aparece un aviso para mandar a alguien a evaluarlo.

### Al terminar

11. **Resumen → Cerrar evaluaciones** (ya nadie puede cambiar respuestas).
12. En **Resultados** revisa empates y usa **desempatar** si el jurado lo decide.
13. **Resumen → Publicar resultados**.
14. Abre **Pantalla de premiación** (botón en Resultados), presiona **Pantalla completa** y usa **Modo revelar**: con la flecha → o la barra espaciadora se revela del último lugar al primero. Puedes cambiar a una categoría o a un semestre en el selector de arriba.
15. Descarga **Excel** (todas las respuestas), **CSV** o **PDF** (reporte con logo) para tu archivo.

La dirección de la premiación es `https://evaluaqr.vercel.app/premiacion/CÓDIGO` (el código del evento aparece en Resumen).

---

## 4. Herramientas para maestros

En el menú superior, **Herramientas**. Son gratuitas y todo lo que guardes queda en tu cuenta (sección **Mis creaciones**), donde puedes abrir, duplicar o eliminar.

- **Mapa conceptual** y **Diagrama de flujo**: agrega figuras desde la izquierda (o con doble clic en el lienzo), escribe su texto con doble clic y conéctalas arrastrando desde los puntos de una figura hasta otra. Selecciona una conexión para escribir las palabras de enlace (mapa) o *Sí / No* (flujo). **Ordenar** acomoda todo automáticamente en vertical u horizontal. Cambia colores y formas en el panel derecho, deshaz con Ctrl+Z y descarga el resultado como **PNG** o **Imprímelo**.
- **Tablero de trivia**: juego de preguntas por categorías y puntos para competir por equipos. En **Editar tablero** eliges cuántas categorías y filas (y cuántos puntos vale cada fila), escribes cada pregunta con su respuesta (puede llevar imagen), nombras a los equipos y eliges el tiempo para responder. También puedes **Importar CSV** con las columnas *categoria, puntos, pregunta, respuesta*. En **Jugar** (ideal en pantalla completa) toca una casilla, presiona **Mostrar respuesta** y suma o resta los puntos al equipo que respondió; **Resultados** muestra el ranking y **Reiniciar** empieza otra partida.
- **Ruleta**: escribe las opciones (una por línea) y presiona **Girar** o la barra espaciadora. Con **Agregar ruleta** puedes tener hasta 4 ruletas en la misma pantalla (por ejemplo, *Temas* y *Alumnos*): cada una tiene su nombre, lista, colores y botón, y **Girar todas** las gira juntas y muestra los resultados juntos. Activa *Quitar al ganador después de cada giro* para no repetir; el ganador se quita al cerrar el resultado o al volver a girar. **Pantalla completa** para proyectarla.
- **Sopa de letras**: escribe las palabras (una por línea); la sopa se genera sola. Elige tamaño, diagonales y palabras al revés. **Nueva distribución** acomoda las palabras de otra forma.
- **Crucigrama**: escribe cada palabra con su pista, o usa **Pegar lista** (por ejemplo, dos columnas copiadas de Excel). Si alguna palabra no se cruza, prueba **Nueva distribución** o agrega palabras que compartan letras.

- **Ficha interactiva** (como las “worksheets” en línea): escribe el nombre, instrucciones y tema, y sube tu **PDF** (o imágenes). Cada página se convierte en imagen y encima colocas, arrastrando desde la izquierda:
  - **Que se califican solos**: Texto (respuesta corta), Opción única, Casillas, Lista, Sopa de letras, Hablar (el alumno responde en voz alta, en Chrome/Edge), Arrastrar + Soltar y Unir.
  - **Que calificas tú**: Respuesta abierta.
  - **De apoyo**: Audio MP3, Escuchar (lee un texto en voz alta), Texto simple, Enlace, PowerPoint/Google Slides y YouTube.
  - Selecciona un elemento para escribir su respuesta correcta y sus **puntos** (para que una pregunta valga más). Arrastra la esquina para cambiar el tamaño.
  - **Probar como alumno** te deja contestarla y calificarla sin guardar nada.
  - Con **Compartir**, tus alumnos la contestan desde el celular escribiendo su nombre y grupo (sin cuenta), ven su calificación al terminar y la ficha te llega en la pestaña **Respuestas**, donde calificas las respuestas abiertas, dejas un comentario y descargas todo en Excel.

Para todas:

- **Guardar** guarda en tu cuenta (aparece “Sin guardar” cuando hay cambios).
- **Imprimir** (sopa y crucigrama) genera una hoja tamaño carta con espacio para nombre y fecha, y opcionalmente una hoja de respuestas. En la ventana de impresión puedes elegir “Guardar como PDF”.
- **Compartir** activa un enlace (y QR) para que tus estudiantes resuelvan la sopa o el crucigrama, o giren la ruleta, desde su celular sin crear cuenta. Desactívalo cuando quieras.

---

## 4b. Aula: grupos y estudiantes

**Cuentas.** Al registrarse, cada persona elige **Soy docente** o **Soy estudiante**. Los docentes ven Aula, Evaluación de proyectos y Herramientas; los estudiantes solo ven sus grupos. (Si alguien entra con Google por primera vez, se le pregunta una sola vez.)

**Crear un grupo.** Menú → *Aula · Mis grupos* → **Crear nuevo grupo**: nombre, materia, periodo, semestre, color, descripción y días/horario.

**Agregar estudiantes (3 formas):**
1. **Importar CSV:** pestaña *Estudiantes* → **Importar CSV** → *Descargar plantilla*. Llénala en Excel (Nombre, Apellidos, Correo; opcional Matrícula, Grupo, ID), guárdala como **CSV UTF-8** y súbela. Verás una vista previa: las filas con errores (correo inválido, nombre vacío) o duplicadas no se importan y puedes descargar el **reporte de errores**.
2. **Agregar uno por uno** con el botón *Agregar*.
3. **Enlace o código:** en *Resumen* aparece el código del grupo (ej. `7J8ZS6E`), el enlace y un QR que puedes **proyectar en clase**.

Los estudiantes importados o agregados aparecen como **Invitado**. Cuando crean su cuenta (o inician sesión) **con ese mismo correo**, entran al grupo solos y pasan a **Activo**. Si alguien usa otro correo, puede entrar con el código.

**Configuración del grupo:** editar datos, cerrar inscripciones, generar un código nuevo, archivar al terminar el periodo (se conserva todo) o eliminar.

> Próximas etapas: asistencia con QR y ubicación, justificantes, tareas, calificaciones, reportes y notificaciones.

## 5. Preguntas frecuentes

**Un evaluador cambió de celular o borró su navegador.** Al volver a escanear se le pide su nombre otra vez y aparece como evaluador nuevo. Sus evaluaciones anteriores se conservan con su nombre original.

**Varios jurados comparten un celular o tablet.** Después de terminar, cada uno presiona **"¿No eres tú?"** para que el siguiente escriba su nombre.

**Me equivoqué en una pregunta y ya hay evaluaciones.** Puedes corregirla en el constructor; el ranking se recalcula con la nueva configuración. Evita borrar preguntas que ya tienen respuestas.

**Quiero que otro maestro me ayude.** Pídele que cree su cuenta y agrégalo en **Ajustes → Co-organizadores** con permiso de edición o solo lectura.

**No llega el correo de confirmación.** Revisa spam. Si sigue sin llegar, desactiva **Confirm email** (paso 1.2) y pide a la persona que inicie sesión directamente.

---

## 6. Instalarla desde cero en otro proyecto de Supabase (opcional)

Solo si algún día quieres una copia independiente (por ejemplo, para otra escuela):

1. Crea un proyecto nuevo en supabase.com.
2. Abre **SQL Editor** y ejecuta, **en orden**, el contenido de cada archivo de la carpeta `supabase/migrations/` del repositorio (`0001_…`, `0002_…`, … hasta el último). Copia, pega y presiona **Run** en cada uno.
3. Haz los pasos de la sección 1 con la nueva dirección.
4. En **Project Settings → API Keys** copia la **Project URL** y la **Publishable key**, y ponlas en las variables de Vercel (sección 2) de un proyecto nuevo de Vercel conectado al mismo repositorio de GitHub.
