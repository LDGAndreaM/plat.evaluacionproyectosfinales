"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CrosswordBoard, CrosswordSheet } from "@/components/tools/crossword-board";
import { PrintArea, printNow } from "@/components/tools/print";
import { WheelTool } from "@/components/tools/wheel";
import { WordSearchBoard, WordSearchSheet } from "@/components/tools/wordsearch-board";
import type { CrosswordData, ToolKind, WheelData, WordSearchData, WorksheetData } from "@/lib/tools/types";
import { StudentWorksheet } from "@/components/worksheet/student";

export function SharedTool({ kind, title, data, code }: { kind: ToolKind; title: string; data: unknown; code: string }) {
  const [wheel, setWheel] = useState<WheelData>(() => ({ ...(data as WheelData), history: [] }));

  if (kind === "wheel") return <WheelTool data={wheel} onChange={setWheel} canEdit={false} title={title} />;
  if (kind === "worksheet") return <StudentWorksheet code={code} data={data as WorksheetData} />;

  if (kind === "wordsearch") {
    const d = data as WordSearchData;
    if (!d.result) return <p className="text-slate-500">Esta sopa de letras está vacía.</p>;
    return (
      <div className="space-y-4">
        {d.instructions && <p className="text-slate-700">{d.instructions}</p>}
        <WordSearchBoard result={d.result} />
        <Button variant="secondary" size="sm" onClick={printNow}>
          <Printer className="size-4" /> Imprimir
        </Button>
        <PrintArea>
          <WordSearchSheet title={title} instructions={d.instructions} result={d.result} withAnswers={false} />
        </PrintArea>
      </div>
    );
  }

  const d = data as CrosswordData;
  if (!d.result) return <p className="text-slate-500">Este crucigrama está vacío.</p>;
  return (
    <div className="space-y-4">
      {d.instructions && <p className="text-slate-700">{d.instructions}</p>}
      <CrosswordBoard result={d.result} />
      <Button variant="secondary" size="sm" onClick={printNow}>
        <Printer className="size-4" /> Imprimir
      </Button>
      <PrintArea>
        <CrosswordSheet title={title} instructions={d.instructions} result={d.result} withAnswers={false} />
      </PrintArea>
    </div>
  );
}
