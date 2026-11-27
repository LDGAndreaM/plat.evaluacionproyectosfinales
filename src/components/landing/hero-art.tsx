import { CheckCircle2, QrCode, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ilustración del inicio, hecha con HTML. Todas las medidas están en "em" y el tamaño de letra
 * depende del ancho del contenedor, así que se escala completa sin deformarse.
 * `compact` (celular) quita las tarjetas laterales.
 */
export function HeroArt({ qrSvg, compact = false }: { qrSvg: string; compact?: boolean }) {
  const W = compact ? 42 : 60;
  return (
    <div className="w-full [container-type:inline-size]" aria-hidden>
      <div className="relative" style={{ fontSize: `calc(100cqw / ${W})`, height: compact ? "34em" : "37em" }}>
        {/* Fondos */}
        <div className="absolute rounded-full bg-violet-300/30 blur-2xl" style={{ left: compact ? "14em" : "26em", top: "16em", width: "30em", height: "22em" }} />
        <div className="absolute rounded-full bg-sun" style={{ left: compact ? "30em" : "33em", top: "-0.5em", width: "9em", height: "9em" }} />
        <div className="absolute rounded-full bg-coral/70" style={{ left: "1em", top: "26em", width: "9em", height: "9em" }} />

        {/* Celular con QR */}
        <div
          className="absolute rounded-[2.6em] bg-violet-600 p-[0.7em] shadow-2xl shadow-violet-900/30"
          style={{ left: "3em", top: "8em", width: "15em", height: "27em", transform: "rotate(-9deg)" }}
        >
          <div className="relative flex h-full flex-col items-center rounded-[2em] bg-gradient-to-b from-white to-violet-50 pt-[1.4em]">
            <div className="h-[0.5em] w-[4em] rounded-full bg-violet-200" />
            <div className="relative mt-[3em] size-[9.5em] p-[0.9em]">
              {(["left-0 top-0 border-l-[0.45em] border-t-[0.45em]", "right-0 top-0 border-r-[0.45em] border-t-[0.45em]", "left-0 bottom-0 border-l-[0.45em] border-b-[0.45em]", "right-0 bottom-0 border-r-[0.45em] border-b-[0.45em]"] as const).map((c) => (
                <span key={c} className={cn("absolute size-[2.2em] rounded-[0.5em] border-turquoise", c)} />
              ))}
              <div className="size-full [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
            <div className="absolute flex items-center gap-[0.5em] rounded-[1em] bg-white px-[0.9em] py-[0.6em] shadow-lg" style={{ bottom: "2.2em", left: "2.2em" }}>
              <CheckCircle2 className="size-[1.7em] shrink-0 text-turquoise-600" />
              <span className="text-[1.05em] font-bold leading-tight text-violet-950">
                Escanea y<br />evalúa
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta de evaluación */}
        <div
          className="absolute rounded-[1.6em] bg-white p-[1.6em] shadow-2xl shadow-violet-900/15 ring-1 ring-violet-100"
          style={{ left: compact ? "16em" : "16.5em", top: "2em", width: compact ? "25em" : "24.5em", transform: "rotate(-3deg)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[1.05em] font-bold text-violet-600">Stand A1</div>
              <div className="text-[1.45em] font-extrabold text-violet-950">Raíces del Mar</div>
            </div>
            <QrCode className="size-[2.6em] text-violet-950" />
          </div>
          {(
            [
              ["Creatividad", 5],
              ["Concepto", 4],
              ["Ejecución técnica", 5],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="mt-[1em]">
              <div className="mb-[0.4em] text-[1.05em] font-semibold text-slate-700">{label}</div>
              <div className="grid grid-cols-5 gap-[0.45em]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "grid h-[2.3em] place-items-center rounded-[0.6em] text-[1em] font-bold",
                      i === n ? "bg-violet-600 text-white" : "bg-lavender text-violet-800",
                    )}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-[1.3em] flex items-center justify-center gap-[0.5em] rounded-[0.8em] bg-turquoise py-[0.75em] text-[1.1em] font-bold text-violet-950">
            <CheckCircle2 className="size-[1.3em]" /> Evaluación enviada
          </div>
        </div>

        {!compact && (
          <>
            {/* Asistencia */}
            <div className="absolute flex items-center gap-[1em] rounded-[1.4em] bg-white p-[1.3em] shadow-xl shadow-violet-900/10 ring-1 ring-violet-100" style={{ left: "42.5em", top: "2em", width: "17.5em" }}>
              <span className="grid size-[3.6em] shrink-0 place-items-center rounded-[0.9em] bg-turquoise-100 text-turquoise-700">
                <QrCode className="size-[2.2em]" />
              </span>
              <div className="min-w-0">
                <div className="text-[1.2em] font-extrabold text-violet-950">Asistencia QR</div>
                <div className="mt-[0.2em] flex items-center gap-[0.4em]">
                  <CheckCircle2 className="size-[1.5em] shrink-0 text-turquoise-600" />
                  <div className="leading-tight">
                    <div className="text-[0.85em] text-slate-500">Registro del día</div>
                    <div className="text-[1.25em] font-extrabold text-violet-950">32 / 34</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking */}
            <div className="absolute rounded-[1.4em] bg-white p-[1.3em] shadow-xl shadow-violet-900/10 ring-1 ring-violet-100" style={{ left: "42.5em", top: "13.5em", width: "17.5em" }}>
              <div className="flex items-center gap-[0.6em]">
                <Trophy className="size-[2em] text-sun" />
                <span className="text-[1.2em] font-extrabold text-violet-950">Ranking en vivo</span>
              </div>
              {(
                [
                  ["Raíces del Mar", 96, "bg-sun text-violet-950"],
                  ["EcoVida", 92, "bg-slate-200 text-slate-700"],
                  ["AquaLab", 89, "bg-coral/80 text-white"],
                ] as const
              ).map(([name, pts, medal], i) => (
                <div key={name} className="mt-[0.7em] flex items-center gap-[0.6em] text-[0.95em]">
                  <span className={cn("grid size-[1.6em] shrink-0 place-items-center rounded-full text-[0.85em] font-bold", medal)}>{i + 1}</span>
                  <span className="flex-1 font-semibold text-slate-700">{name}</span>
                  <span className="font-bold text-violet-950">{pts} pts</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
