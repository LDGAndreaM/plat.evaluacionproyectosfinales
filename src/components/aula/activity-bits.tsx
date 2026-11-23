"use client";

import { ExternalLink, Loader2, Paperclip } from "lucide-react";
import { useState } from "react";
import type { Resource, SubmissionFile } from "@/lib/aula/activities";
import { openAfter } from "@/lib/qr";

/** Botón que abre un archivo privado con una URL temporal. */
export function FileButton({ path, name, getUrl }: { path: string; name: string; getUrl: (path: string) => Promise<string | null> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        await openAfter(() => getUrl(path));
        setBusy(false);
      }}
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm text-slate-800 hover:border-violet-300 hover:bg-violet-50"
    >
      {busy ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Paperclip className="size-4 shrink-0 text-slate-400" />}
      <span className="truncate">{name}</span>
    </button>
  );
}

export function ResourceList({ resources, getUrl }: { resources: Resource[]; getUrl: (path: string) => Promise<string | null> }) {
  if (!resources.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {resources.map((r, i) =>
        r.type === "file" && r.path ? (
          <FileButton key={i} path={r.path} name={r.name} getUrl={getUrl} />
        ) : (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-violet-700 hover:border-violet-300 hover:bg-violet-50"
          >
            <ExternalLink className="size-4 shrink-0" />
            <span className="truncate">{r.name}</span>
          </a>
        ),
      )}
    </div>
  );
}

export function SubmissionFiles({ files, getUrl }: { files: SubmissionFile[]; getUrl: (path: string) => Promise<string | null> }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <FileButton key={f.path} path={f.path} name={f.name} getUrl={getUrl} />
      ))}
    </div>
  );
}
