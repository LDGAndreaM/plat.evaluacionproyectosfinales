/** Contenido de la sección Ayuda (pasos con capturas en /public/ayuda). */
export interface HelpTopic {
  id: string;
  title: string;
  intro?: string;
  steps: string[];
  image?: string;
  /** Captura de celular (se muestra más angosta). */
  mobile?: boolean;
  tip?: string;
}

export interface HelpGroup {
  id: string;
  title: string;
  topics: HelpTopic[];
}

export const TEACHER_HELP: HelpGroup[] = [
  {
    id: "empezar",
    title: "Para empezar",
    topics: [
      {
        id: "inicio",
        title: "Tu panel de inicio",
        intro: "Al entrar ves el resumen de tus grupos, accesos rápidos, próximas fechas y la asistencia del periodo.",
        steps: [
          "Usa el menú de la izquierda (en celular, el botón ☰) para moverte entre Aula, Evaluación de proyectos, Herramientas, Reportes y Calendario.",
          "La campana de arriba muestra tus notificaciones: nuevas entregas, justificantes y estudiantes que se unen.",
          "Toca tu foto para abrir Mi perfil.",
        ],
        image: "docente-inicio",
      },
      {
        id: "crear-grupo",
        title: "Crear un grupo",
        steps: [
          "Ve a Aula · Mis grupos → Crear nuevo grupo.",
          "Escribe nombre, materia, periodo y semestre. Elige un color.",
          "Agrega los días y el horario de clase (se usan en el calendario).",
          "Presiona Crear grupo.",
        ],
        image: "grupo-nuevo",
      },
      {
        id: "invitar",
        title: "Invitar a tus estudiantes",
        intro: "Tienes tres formas: código, enlace o QR, e importar tu lista.",
        steps: [
          "En la pestaña Resumen copia el código del grupo o el enlace de invitación y compártelos.",
          "Toca el QR para verlo en grande y proyectarlo en clase.",
          "Si los agregaste con su correo, entran al grupo solos cuando crean su cuenta con ese mismo correo.",
        ],
        image: "grupo-resumen",
      },
      {
        id: "importar",
        title: "Importar la lista en CSV",
        steps: [
          "Pestaña Estudiantes → Importar CSV → Descargar plantilla.",
          "Llénala en Excel (Nombre, Apellidos, Correo; opcional Matrícula, Grupo, ID) y guárdala como CSV UTF-8.",
          "Súbela: verás una vista previa con errores y duplicados marcados.",
          "Descarga el reporte de errores si lo necesitas y presiona Importar.",
        ],
        image: "importar-csv",
      },
    ],
  },
  {
    id: "asistencia",
    title: "Asistencia",
    topics: [
      {
        id: "asistencia-ajustes",
        title: "Ajustes de asistencia (una sola vez)",
        steps: [
          "Asistencia → Ajustes: define la tolerancia en minutos (después de ese tiempo es Retardo).",
          "Opcional: estando en el salón toca Usar mi ubicación actual y elige el radio (80–150 m).",
          "Si activas Exigir ubicación, quien se registre sin ubicación o fuera del radio queda Pendiente de revisión.",
        ],
        image: "asistencia-ajustes",
      },
      {
        id: "pasar-lista",
        title: "Pasar lista con QR",
        steps: [
          "Asistencia → elige 2, 5, 10 o 15 minutos → Mostrar QR de asistencia.",
          "Proyecta en Pantalla completa. El QR y el código de 6 dígitos cambian cada 30 segundos.",
          "Ves en vivo quién se registra. Puedes dar más minutos.",
          "Al terminar, Cerrar pase de lista: quien no se registró queda con Falta.",
        ],
        image: "asistencia-qr",
        tip: "Una foto del QR enviada por WhatsApp deja de servir en segundos.",
      },
      {
        id: "corregir-asistencia",
        title: "Corregir la asistencia",
        steps: [
          "Abre una sesión desde el historial.",
          "Toca P (Presente), R (Retardo), F (Falta), J (Justificada) o ? (Revisión) junto a cada estudiante.",
          "El ícono de reloj muestra el historial de cambios.",
        ],
        image: "asistencia-sesion",
      },
      {
        id: "justificantes",
        title: "Revisar justificantes",
        steps: [
          "Asistencia → Justificantes: ves el motivo y el archivo del estudiante.",
          "Aprobar convierte sus faltas de esas fechas en Falta justificada.",
          "Pedir más información o Rechazar requieren un comentario para el estudiante.",
        ],
        image: "justificantes-docente",
      },
    ],
  },
  {
    id: "actividades",
    title: "Actividades y calificaciones",
    topics: [
      {
        id: "actividad-nueva",
        title: "Crear una actividad",
        steps: [
          "Actividades y tareas → Nueva actividad.",
          "Elige Tarea, Investigación o Interactiva (asigna una de tus herramientas; las fichas se califican solas).",
          "Escribe instrucciones, agrega archivos o enlaces de apoyo.",
          "Define fecha límite, entregas tardías y su descuento, intentos, calificación máxima y rúbrica.",
          "Publica ahora, programa una fecha o guárdala como borrador.",
        ],
        image: "actividad-nueva",
        tip: "Para trabajo en equipo marca En equipos y, al guardar, usa Formar al azar.",
      },
      {
        id: "calificar",
        title: "Calificar y comentar entregas",
        steps: [
          "Abre la actividad y toca a un estudiante o equipo.",
          "Revisa su texto, enlace o archivos. Llena la rúbrica o la calificación.",
          "Usa Comentarios para conversar sobre la entrega.",
          "Guardar calificación, o Devolver para corregir (le da un intento más).",
        ],
        image: "calificar",
      },
      {
        id: "seguimiento",
        title: "Seguimiento de entregas",
        steps: ["Actividades y tareas → Seguimiento: una tabla con cada estudiante y actividad.", "Los colores indican Pendiente, Entregado, Tarde, No entregado, Devuelto o la calificación."],
        image: "actividades-seguimiento",
      },
      {
        id: "calificaciones",
        title: "Calificación final con ponderaciones",
        steps: [
          "Calificaciones → Ponderaciones y escala: elige escala 0–10 o 0–100 y la calificación aprobatoria.",
          "Define rubros con su porcentaje (suman 100): promedio de actividades, % de asistencia o captura manual (examen, participación…).",
          "En la tabla captura los rubros manuales (escribe y presiona Enter).",
          "Puedes ocultar la calificación a los estudiantes hasta que quieras publicarla.",
        ],
        image: "calificaciones-docente",
      },
      {
        id: "reportes",
        title: "Reportes en Excel, CSV y PDF",
        steps: [
          "Pestaña Reportes (o menú Reportes y resultados).",
          "Elige entre 9 reportes: lista, asistencia, justificantes, entregas, calificaciones, en riesgo e individual.",
          "Descarga en el formato que necesites.",
        ],
        image: "reportes",
      },
    ],
  },
  {
    id: "grupo",
    title: "Tu grupo",
    topics: [
      {
        id: "avisos",
        title: "Avisos del grupo",
        steps: ["Pestaña Avisos: escribe un título y el detalle.", "Marca Fijar arriba para que se vea primero.", "Tus estudiantes reciben una notificación y lo ven en su grupo."],
        image: "avisos",
      },
      {
        id: "configuracion",
        title: "Co-docentes, duplicar y archivar",
        steps: [
          "Configuración → Docentes del grupo: agrega un co-docente con su correo (debe tener cuenta de docente).",
          "Duplicar para otro periodo copia horario, ajustes, ponderaciones y actividades (como borrador), sin alumnos.",
          "Al terminar el periodo, Archiva el grupo: se conserva todo.",
        ],
        image: "configuracion",
      },
    ],
  },
  {
    id: "mas",
    title: "Eventos, herramientas y más",
    topics: [
      {
        id: "eventos",
        title: "Evaluación de proyectos con QR",
        steps: [
          "Evaluación de proyectos → Nuevo evento.",
          "Agrega proyectos (o impórtalos en CSV), arma tu rúbrica en Formularios y publica.",
          "Imprime los QR de cada proyecto. El jurado evalúa desde su celular sin crear cuenta.",
          "En Resultados ves el ranking en vivo, el podio y descargas Excel o PDF.",
        ],
        image: "evento-resultados",
      },
      {
        id: "herramientas",
        title: "Herramientas para tu clase",
        steps: [
          "Herramientas de actividades: fichas interactivas, trivia, mapas conceptuales, diagramas, ruleta, sopa de letras y crucigrama.",
          "Todo se guarda en tu cuenta. Puedes imprimirlo, compartirlo con un enlace o asignarlo como actividad.",
        ],
        image: "herramientas",
      },
      {
        id: "calendario",
        title: "Calendario y notificaciones",
        steps: [
          "Calendario académico: entregas, clases, pases de lista y eventos del mes.",
          "Agregar a mi calendario descarga un archivo .ics para Google Calendar o el celular.",
        ],
        image: "calendario",
      },
      {
        id: "perfil",
        title: "Mi perfil",
        steps: ["Sube tu foto y tus datos de contacto.", "Solo los ven tus estudiantes; otros docentes no."],
        image: "perfil",
      },
    ],
  },
];

export const STUDENT_HELP: HelpGroup[] = [
  {
    id: "empezar",
    title: "Para empezar",
    topics: [
      {
        id: "registro",
        title: "Crear tu cuenta",
        steps: [
          "Entra a Crear cuenta y elige Soy estudiante.",
          "Usa el mismo correo con el que te invitó tu docente: así entras a tu grupo automáticamente.",
          "También puedes registrarte con Google.",
        ],
        image: "est-registro",
        mobile: true,
      },
      {
        id: "unirse",
        title: "Unirte a un grupo",
        steps: ["Abre el enlace de invitación o escanea el QR que proyecta tu docente.", "O en Mis grupos escribe el código del grupo y toca Unirme."],
        image: "est-unirse",
        mobile: true,
      },
      {
        id: "inicio",
        title: "Tu inicio",
        steps: ["Ves tus grupos, tu asistencia, tareas pendientes, promedio y próximas fechas.", "Cuando hay pase de lista abierto aparece un aviso turquesa."],
        image: "est-inicio",
        mobile: true,
      },
    ],
  },
  {
    id: "clase",
    title: "En clase",
    topics: [
      {
        id: "asistencia",
        title: "Registrar tu asistencia",
        steps: [
          "Escanea el QR con la cámara de tu celular (o escribe el código de 6 dígitos en Asistencia).",
          "Elige Registrar con mi ubicación o sin ubicación. La ubicación se toma solo una vez.",
          "Verás si quedaste Presente, con Retardo o Pendiente de revisión.",
        ],
        image: "est-asistencia",
        mobile: true,
      },
      {
        id: "justificantes",
        title: "Enviar un justificante",
        steps: ["Junto a una falta toca Justificar, o ve a Justificantes.", "Escribe el motivo y adjunta tu comprobante (PDF, JPG o PNG).", "Tu docente lo aprueba o te pide más información."],
        image: "est-justificantes",
        mobile: true,
      },
    ],
  },
  {
    id: "tareas",
    title: "Actividades y calificaciones",
    topics: [
      {
        id: "actividades",
        title: "Ver tus actividades",
        steps: ["Menú Actividades: pestañas Pendientes, Entregadas y Calificadas.", "En rojo, lo que vence hoy."],
        image: "est-actividades",
        mobile: true,
      },
      {
        id: "entregar",
        title: "Entregar y ver tu calificación",
        steps: [
          "Abre la actividad, lee las instrucciones y los recursos.",
          "Escribe tu respuesta, adjunta archivos o pega un enlace, y toca Entregar.",
          "Cuando te califiquen verás tu calificación, la rúbrica y los comentarios. Puedes responder en Comentarios.",
        ],
        image: "est-actividad",
        mobile: true,
      },
      {
        id: "calificaciones",
        title: "Tus calificaciones",
        steps: ["Menú Calificaciones: tu calificación de cada grupo con el desglose por rubro, asistencia y entregas."],
        image: "est-calificaciones",
        mobile: true,
      },
      {
        id: "notificaciones",
        title: "Notificaciones",
        steps: ["La campana te avisa de actividades nuevas, calificaciones, avisos del grupo, pases de lista y cuando algo vence en menos de 24 horas."],
        image: "est-notificaciones",
        mobile: true,
      },
    ],
  },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Un estudiante no recibe el correo para confirmar su cuenta.", a: "Que revise spam o que entre con Google. También puede unirse con el código del grupo después de entrar." },
  { q: "Un estudiante se registró con otro correo y no aparece en mi grupo.", a: "Comparte el código o el enlace del grupo; al unirse aparecerá como activo. Puedes borrar la invitación con el correo anterior." },
  { q: "¿Qué pasa si el GPS de un estudiante falla en el salón?", a: "Si no exiges ubicación, se registra normal. Si la exiges, queda Pendiente de revisión y tú decides con un toque." },
  { q: "¿Puedo cambiar una calificación ya publicada?", a: "Sí. Abre la entrega y guarda una nueva calificación; el estudiante recibe una notificación." },
  { q: "¿Cómo reutilizo un grupo el siguiente semestre?", a: "Configuración → Duplicar para otro periodo. Copia todo menos a los estudiantes." },
  { q: "¿Los evaluadores de un evento necesitan cuenta?", a: "No. Escanean el QR del proyecto y escriben su nombre." },
];
