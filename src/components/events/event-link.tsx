"use client";

import { CopyButton } from "@/components/ui/copy-button";
import { eventUrl } from "@/lib/qr";
import { useOrigin } from "@/lib/use-origin";

export function EventLink({ code }: { code: string }) {
  const origin = useOrigin();
  const link = eventUrl(origin, code);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-sm">{link}</code>
      <CopyButton value={link} />
    </div>
  );
}
