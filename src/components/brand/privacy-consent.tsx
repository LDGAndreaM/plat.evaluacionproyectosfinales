import Link from "next/link";

/** Casilla de aceptación del aviso de privacidad y los términos. */
export function PrivacyConsent({ checked, onChange, name = "privacy" }: { checked?: boolean; onChange?: (v: boolean) => void; name?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-xl bg-lavender/60 p-3 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        required
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="mt-0.5 size-5 shrink-0 accent-violet-600"
      />
      <span>
        He leído y acepto el{" "}
        <Link href="/privacidad" target="_blank" className="font-semibold text-violet-700 underline">
          Aviso de privacidad
        </Link>{" "}
        y los{" "}
        <Link href="/terminos" target="_blank" className="font-semibold text-violet-700 underline">
          Términos y condiciones
        </Link>
        .
      </span>
    </label>
  );
}
