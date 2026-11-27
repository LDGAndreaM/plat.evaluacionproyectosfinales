import { CalendarCheck, CheckCircle2, ClipboardList, Star, Users } from "lucide-react";

/** Laptop con el panel de un grupo (ilustración en "em", escala con el contenedor). */
export function AulaLaptop() {
  return (
    <div className="w-full [container-type:inline-size]" aria-hidden>
      <div className="relative" style={{ fontSize: "calc(100cqw / 36)", height: "23em" }}>
        <div className="absolute rounded-[1.2em] bg-violet-950 p-[0.8em] shadow-2xl shadow-violet-900/30" style={{ left: "2em", top: "0.5em", width: "32em", height: "20em" }}>
          <div className="flex h-full overflow-hidden rounded-[0.5em] bg-white">
            <div className="flex w-[7.5em] shrink-0 flex-col gap-[1em] bg-gradient-to-b from-violet-700 to-violet-900 p-[1em]">
              <div className="text-[1.05em] font-extrabold italic text-white">
                Evalua<span className="text-turquoise">QR</span>
              </div>
              {[70, 55, 80, 60, 45].map((w, i) => (
                <div key={i} className="flex items-center gap-[0.5em]">
                  <span className="size-[0.8em] rounded-[0.2em] border-[0.12em] border-white/70" />
                  <span className="h-[0.35em] rounded-full bg-white/50" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <div className="flex-1 p-[1em]">
              <div className="text-[0.95em] font-bold text-violet-950">Mi grupo · Diseño Web</div>
              <div className="mt-[0.8em] grid grid-cols-4 gap-[0.5em]">
                {(
                  [
                    [Users, "32", "Estudiantes", "text-violet-600 bg-violet-50"],
                    [CalendarCheck, "96%", "Asistencia", "text-turquoise-700 bg-turquoise-50"],
                    [ClipboardList, "4", "Tareas", "text-coral bg-[#fff3f6]"],
                    [Star, "8.9", "Promedio", "text-[#e0a100] bg-[#fffaeb]"],
                  ] as const
                ).map(([Icon, n, label, cls]) => (
                  <div key={label} className={`flex flex-col items-center rounded-[0.5em] py-[0.5em] ${cls}`}>
                    <Icon className="size-[1.3em]" />
                    <span className="mt-[0.2em] text-[1em] font-extrabold text-violet-950">{n}</span>
                    <span className="text-[0.55em] text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
              {[80, 65, 72, 50].map((w, i) => (
                <div key={i} className="mt-[0.75em] flex items-center gap-[0.6em]">
                  <CheckCircle2 className="size-[1em] shrink-0 text-turquoise-600" />
                  <span className="h-[0.4em] rounded-full bg-slate-200" style={{ width: `${w}%` }} />
                  <span className="ml-auto h-[0.4em] w-[2em] rounded-full bg-violet-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute rounded-b-[1.2em] bg-gradient-to-b from-violet-200 to-violet-300" style={{ left: "0", top: "20.5em", width: "36em", height: "1.4em" }} />
      </div>
    </div>
  );
}
