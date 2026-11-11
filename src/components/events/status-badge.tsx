import { Badge } from "@/components/ui/card";
import type { EventStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/utils";

const TONES = { draft: "slate", open: "green", closed: "amber", published: "violet" } as const;

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge tone={TONES[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
