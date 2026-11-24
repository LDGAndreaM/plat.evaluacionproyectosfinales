import Link from "next/link";
import { ClipboardList, QrCode, Sparkles, Users } from "lucide-react";

function Logo({ className = "h-12 w-auto sm:h-14" }: { className?: string }) {
  return (
    <Link href="/" aria-label="EvalúaQR — inicio" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/evaluaqr-logo-white.png" alt="EvalúaQR" className={className} width={1200} height={365} />
    </Link>
  );
}

/** Panel izquierdo del acceso: qué puedes hacer en EvalúaQR. */
export function FeaturesPanel() {
  const items = [
    { icon: QrCode, title: "Evalúa proyectos con QR", text: "El jurado califica desde su celular y el ranking se arma solo.", bg: "bg-turquoise", fg: "text-violet-950" },
    { icon: Users, title: "Tu aula organizada", text: "Grupos, pase de lista con QR y justificantes.", bg: "bg-lilac", fg: "text-white" },
    { icon: ClipboardList, title: "Tareas y calificaciones", text: "Entregas, rúbricas, ponderaciones y reportes.", bg: "bg-coral", fg: "text-white" },
    { icon: Sparkles, title: "Actividades interactivas", text: "Fichas, trivia, sopa de letras, mapas y más.", bg: "bg-sun", fg: "text-violet-950" },
  ];
  return (
    <div className="w-full max-w-lg text-left">
      <Logo />
      <h2 className="mt-8 text-3xl font-extrabold leading-tight xl:text-4xl">
        Todo tu trabajo docente,{" "}
        <span className="relative whitespace-nowrap text-turquoise">
          en un solo lugar
          <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-turquoise/60" aria-hidden />
        </span>
      </h2>
      <p className="mt-3 text-lg text-violet-100">Para docentes y estudiantes. Gratis.</p>
      <ul className="mt-8 space-y-4">
        {items.map((it) => (
          <li key={it.title} className="flex items-start gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl shadow-md ${it.bg} ${it.fg}`}>
              <it.icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-bold">{it.title}</span>
              <span className="block text-sm text-violet-100">{it.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
