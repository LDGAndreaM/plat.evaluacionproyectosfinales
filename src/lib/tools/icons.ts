import { Disc3, Grid3x3, LayoutGrid, NotebookPen, Trophy } from "lucide-react";
import type { ToolKind } from "./types";

export const TOOL_ICONS: Record<ToolKind, typeof Disc3> = { wheel: Disc3, wordsearch: Grid3x3, crossword: LayoutGrid, worksheet: NotebookPen, trivia: Trophy };
