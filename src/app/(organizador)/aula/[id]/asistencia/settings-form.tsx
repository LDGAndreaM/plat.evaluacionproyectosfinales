"use client";

import { Crosshair, Loader2, MapPin } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ClassRow } from "@/lib/aula/types";
import { saveAttendanceSettings } from "../../attendance-actions";

export function AttendanceSettings({ cls }: { cls: ClassRow }) {
  const [state, action] = useActionState(saveAttendanceSettings, null);
  const [lat, setLat] = useState(cls.att_lat?.toString() ?? "");
  const [lng, setLng] = useState(cls.att_lng?.toString() ?? "");
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  function useMyLocation() {
    setGeoMsg(null);
    if (!("geolocation" in navigator)) return setGeoMsg("Este navegador no permite obtener la ubicación.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoMsg(`Ubicación tomada (precisión ±${Math.round(pos.coords.accuracy)} m). No olvides guardar.`);
        setLocating(false);
      },
      (err) => {
        setGeoMsg(err.code === 1 ? "No diste permiso de ubicación al navegador." : "No se pudo obtener la ubicación. Inténtalo de nuevo.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader title="Ajustes de asistencia" description="Se aplican a los próximos pases de lista." />
      <form action={action} className="space-y-6 p-5">
        <input type="hidden" name="class_id" value={cls.id} />
        <Field
          label="Tolerancia para llegar a tiempo (minutos)"
          htmlFor="late_after_min"
          hint="Después de este tiempo desde que abres el QR, el registro cuenta como Retardo."
        >
          <Input id="late_after_min" name="late_after_min" type="number" min={0} max={240} defaultValue={cls.att_late_after_min} className="w-32" />
        </Field>

        <fieldset className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-900">
            <MapPin className="size-4 text-violet-600" /> Ubicación del aula (opcional)
          </legend>
          <p className="text-sm text-slate-600">
            Si la guardas, al registrarse se compara la ubicación del estudiante con la del aula. La ubicación solo se pide en ese momento y con su
            permiso; no se rastrea después.
          </p>
          <Button variant="secondary" size="sm" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />} Usar mi ubicación actual (estando en el aula)
          </Button>
          {geoMsg && <p className="text-sm text-slate-600">{geoMsg}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Latitud" htmlFor="lat">
              <Input id="lat" name="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="27.918000" />
            </Field>
            <Field label="Longitud" htmlFor="lng">
              <Input id="lng" name="lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-110.899500" />
            </Field>
            <Field label="Radio permitido (m)" htmlFor="radius" hint="Recomendado: 80–150 m.">
              <Input id="radius" name="radius" type="number" min={20} max={5000} defaultValue={cls.att_radius_m} />
            </Field>
          </div>
          {lat && lng && (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-violet-700 hover:underline"
            >
              Ver en el mapa →
            </a>
          )}
          {(lat || lng) && (
            <button
              type="button"
              onClick={() => {
                setLat("");
                setLng("");
              }}
              className="ml-4 text-sm text-slate-500 hover:underline"
            >
              Quitar ubicación
            </button>
          )}
          <label className="flex items-start gap-3 pt-1">
            <input type="checkbox" name="require_location" defaultChecked={cls.att_require_location} className="mt-1 size-5 accent-violet-600" />
            <span className="text-sm">
              <span className="font-medium text-slate-900">Exigir ubicación</span>
              <span className="block text-slate-500">
                Si alguien se registra sin ubicación o fuera del radio, quedará como <strong>Pendiente de revisión</strong> para que tú decidas. Si no
                lo exiges, solo se revisa a quien comparta una ubicación fuera del radio.
              </span>
            </span>
          </label>
        </fieldset>
        <FormMessage state={state} />
        <SubmitButton>Guardar ajustes</SubmitButton>
      </form>
    </Card>
  );
}
