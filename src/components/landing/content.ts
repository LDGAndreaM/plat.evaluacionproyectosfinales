import {
  Archive,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ShipWheel,
  FileSpreadsheet,
  FileText,
  Grid3x3,
  LayoutGrid,
  Megaphone,
  Network,
  QrCode,
  ScanLine,
  Smartphone,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface Tone {
  /** Color del ícono. */
  color: string;
  /** Fondo de la tarjeta. */
  bg: string;
  /** Borde de la tarjeta. */
  border: string;
  /** Mancha detrás del ícono. */
  blob: string;
}

export const TONES = {
  violet: { color: "#6A11CB", bg: "#F7F2FF", border: "#E4D8FD", blob: "#E4D8FD" },
  turquoise: { color: "#00A891", bg: "#EEFCF9", border: "#C9F3EA", blob: "#C2F5EE" },
  sun: { color: "#E0A100", bg: "#FFFAEB", border: "#FCEBB8", blob: "#FFEDB3" },
  coral: { color: "#E0466A", bg: "#FFF3F6", border: "#FCD7E0", blob: "#FFDCE5" },
} satisfies Record<string, Tone>;

export interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: keyof typeof TONES;
}

export const FEATURE_TABS: { key: string; label: string; icon: LucideIcon; items: Feature[] }[] = [
  {
    key: "evaluacion",
    label: "Evaluación",
    icon: ClipboardCheck,
    items: [
      { icon: ClipboardCheck, title: "Rúbricas", text: "Crea rúbricas personalizadas con criterios, escalas y ponderaciones.", tone: "violet" },
      { icon: QrCode, title: "Un QR por stand", text: "Imprime los códigos y pégalos en cada proyecto de tu feria o exposición.", tone: "turquoise" },
      { icon: Smartphone, title: "Evalúa desde el celular", text: "El jurado escanea y califica sin crear cuenta.", tone: "sun" },
      { icon: Trophy, title: "Ranking en vivo", text: "Podio, empates y desglose por criterio en tiempo real.", tone: "coral" },
      { icon: BarChart3, title: "Pantalla de premiación", text: "Presenta a los ganadores en el proyector con un clic.", tone: "violet" },
      { icon: FileSpreadsheet, title: "Exporta resultados", text: "Descarga respuestas y resultados en Excel, CSV o PDF.", tone: "turquoise" },
    ],
  },
  {
    key: "aula",
    label: "EvaluaQR Aula",
    icon: Users,
    items: [
      { icon: Users, title: "Grupos", text: "Importa tu lista o comparte un código o QR para que se unan.", tone: "violet" },
      { icon: ScanLine, title: "Asistencia QR", text: "Toma lista con un código QR, ubicación opcional y justificantes.", tone: "turquoise" },
      { icon: ClipboardCheck, title: "Tareas y rúbricas", text: "Entregas con archivos, equipos, fechas límite y comentarios.", tone: "sun" },
      { icon: FileSpreadsheet, title: "Calificaciones", text: "Ponderaciones, estudiantes en riesgo y 9 reportes listos.", tone: "coral" },
      { icon: Megaphone, title: "Avisos del grupo", text: "Anuncios que llegan como notificación a tus estudiantes.", tone: "violet" },
      { icon: CalendarDays, title: "Calendario", text: "Entregas y clases en un calendario que puedes llevar a tu celular.", tone: "turquoise" },
      { icon: Bell, title: "Notificaciones", text: "Entregas nuevas, calificaciones y recordatorios de vencimiento.", tone: "sun" },
      { icon: Archive, title: "Respaldo del grupo", text: "Descarga todo el periodo en un ZIP: reportes, entregas y más.", tone: "coral" },
    ],
  },
  {
    key: "gamificacion",
    label: "Gamificación",
    icon: Trophy,
    items: [
      { icon: Trophy, title: "Tablero de trivia", text: "Preguntas por categorías y puntos para competir por equipos.", tone: "sun" },
      { icon: ShipWheel, title: "Ruleta", text: "Elige al azar quién expone, equipos o temas.", tone: "coral" },
      { icon: Grid3x3, title: "Sopa de letras", text: "Escribe tus palabras y obtén la hoja lista para imprimir.", tone: "turquoise" },
      { icon: LayoutGrid, title: "Crucigrama", text: "Palabras y pistas: el crucigrama se arma solo.", tone: "violet" },
    ],
  },
  {
    key: "recursos",
    label: "Recursos",
    icon: FileText,
    items: [
      { icon: FileText, title: "PDF interactivos", text: "Convierte tus materiales en actividades que se califican solas.", tone: "coral" },
      { icon: Network, title: "Mapas conceptuales", text: "Conceptos y palabras de enlace que se acomodan solos.", tone: "turquoise" },
      { icon: Workflow, title: "Diagramas de flujo", text: "Procesos paso a paso con decisiones Sí / No.", tone: "violet" },
      { icon: Smartphone, title: "App en tu celular", text: "Instálala en tu pantalla de inicio, en Android o iPhone.", tone: "sun" },
    ],
  },
];

export const MORE_TOOLS: { icon: LucideIcon; title: string; tone: keyof typeof TONES }[] = [
  { icon: ShipWheel, title: "Ruleta", tone: "turquoise" },
  { icon: Grid3x3, title: "Sopa de letras", tone: "violet" },
  { icon: LayoutGrid, title: "Crucigrama", tone: "sun" },
  { icon: Network, title: "Mapas conceptuales", tone: "turquoise" },
  { icon: Workflow, title: "Diagramas de flujo", tone: "coral" },
];
