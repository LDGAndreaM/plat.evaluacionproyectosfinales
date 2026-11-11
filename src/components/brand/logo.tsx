import { QrCode } from "lucide-react";
import Link from "next/link";

export function AppLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold text-slate-900">
      <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-white">
        <QrCode className="size-5" aria-hidden />
      </span>
      <span>
        Evalúa<span className="text-violet-700">QR</span>
      </span>
    </Link>
  );
}
