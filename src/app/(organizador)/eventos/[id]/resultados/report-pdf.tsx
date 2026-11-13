import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { RankedProject } from "@/lib/scoring/ranking";
import { semesterLabel } from "@/lib/utils";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 48, fontFamily: "Helvetica", fontSize: 9, color: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  logo: { width: 46, height: 46, objectFit: "contain", marginRight: 12 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  bar: { height: 5, borderRadius: 3, marginBottom: 14 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  podium: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  podiumBox: { width: "32%", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  podiumPlace: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  podiumName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 4 },
  table: { borderTopWidth: 1, borderColor: "#e2e8f0" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", paddingVertical: 4 },
  th: { fontFamily: "Helvetica-Bold", color: "#475569", fontSize: 8 },
  cPos: { width: 34 },
  cName: { flex: 1, paddingRight: 6 },
  cCat: { width: 80 },
  cNum: { width: 46, textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#94a3b8" },
});

function usableLogo(url: string | null) {
  return url && !/\.svg($|\?)/i.test(url) ? url : null;
}

export interface ReportInfo {
  name: string;
  logo: string | null;
  color: string;
  subtitle: string;
  methodLabel: string;
  podiumSize: number;
  totals: string;
}

function Ranking({ rows, categoryName }: { rows: RankedProject[]; categoryName: (id: string | null) => string }) {
  return (
    <View style={s.table}>
      <View style={s.row} fixed>
        <Text style={[s.th, s.cPos]}>Lugar</Text>
        <Text style={[s.th, s.cName]}>Proyecto</Text>
        <Text style={[s.th, s.cCat]}>Categoría</Text>
        <Text style={[s.th, s.cNum]}>Eval.</Text>
        <Text style={[s.th, s.cNum]}>Puntaje</Text>
      </View>
      {rows.map((r) => (
        <View key={r.project.id} style={s.row} wrap={false}>
          <Text style={s.cPos}>{r.rank ? `${r.rank}°${r.tied ? "*" : ""}` : "—"}</Text>
          <Text style={s.cName}>
            {r.project.name}
            {r.project.stand ? `  (Stand ${r.project.stand}${r.project.semester ? ` · ${semesterLabel(r.project.semester)}` : ""})` : r.project.semester ? `  (${semesterLabel(r.project.semester)})` : ""}
          </Text>
          <Text style={s.cCat}>{categoryName(r.project.category_id)}</Text>
          <Text style={s.cNum}>{r.count}</Text>
          <Text style={[s.cNum, { fontFamily: "Helvetica-Bold" }]}>{r.score === null ? "—" : r.score.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

export function ResultsReport({
  info,
  rows,
  byCategory,
  categoryName,
  criteria,
}: {
  info: ReportInfo;
  rows: RankedProject[];
  byCategory: { name: string; rows: RankedProject[] }[];
  categoryName: (id: string | null) => string;
  criteria: string[];
}) {
  const logo = usableLogo(info.logo);
  const top = rows.filter((r) => r.rank !== null && r.rank <= Math.min(3, info.podiumSize)).slice(0, 3);
  const generated = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const anyTie = rows.some((r) => r.tied);
  const footer = (
    <View style={s.footer} fixed>
      <Text>
        {info.name} · Generado el {generated}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Resultados — ${info.name}`} author="EvalúaQR">
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logo && <Image src={logo} style={s.logo} />}
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Resultados · {info.name}</Text>
            <Text style={s.sub}>{info.subtitle}</Text>
            <Text style={s.sub}>
              {info.totals} · Método: {info.methodLabel}
            </Text>
          </View>
        </View>
        <View style={[s.bar, { backgroundColor: info.color }]} />

        {top.length > 0 && (
          <>
            <Text style={s.h2}>Ganadores</Text>
            <View style={s.podium}>
              {top.map((r) => (
                <View key={r.project.id} style={[s.podiumBox, r.rank === 1 ? { borderColor: info.color, borderWidth: 2 } : {}]}>
                  <Text style={[s.podiumPlace, { color: info.color }]}>{r.rank}° lugar</Text>
                  <Text style={s.podiumName}>{r.project.name}</Text>
                  {r.project.members.length > 0 && <Text style={[s.sub, { fontSize: 8 }]}>{r.project.members.join(", ")}</Text>}
                  <Text style={{ marginTop: 4, fontFamily: "Helvetica-Bold" }}>{r.score?.toFixed(2)} puntos</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={s.h2}>Ranking general</Text>
        <Ranking rows={rows} categoryName={categoryName} />
        {anyTie && <Text style={[s.sub, { marginTop: 4 }]}>* Empate en la calificación.</Text>}

        {byCategory.map((c) => (
          <View key={c.name} wrap={false}>
            <Text style={s.h2}>{c.name}</Text>
            <Ranking rows={c.rows} categoryName={categoryName} />
          </View>
        ))}
        {footer}
      </Page>

      {criteria.length > 0 && (
        <Page size="LETTER" orientation={criteria.length > 5 ? "landscape" : "portrait"} style={s.page}>
          <Text style={s.title}>Desglose por criterio</Text>
          <Text style={[s.sub, { marginBottom: 10 }]}>Promedio de los evaluadores en cada criterio (0 a 100).</Text>
          <View style={s.table}>
            <View style={s.row} fixed>
              <Text style={[s.th, s.cPos]}>Lugar</Text>
              <Text style={[s.th, s.cName]}>Proyecto</Text>
              {criteria.map((c) => (
                <Text key={c} style={[s.th, { width: 58, textAlign: "right" }]}>
                  {c}
                </Text>
              ))}
              <Text style={[s.th, s.cNum]}>Total</Text>
            </View>
            {rows.map((r) => (
              <View key={r.project.id} style={s.row} wrap={false}>
                <Text style={s.cPos}>{r.rank ? `${r.rank}°` : "—"}</Text>
                <Text style={s.cName}>{r.project.name}</Text>
                {criteria.map((c) => {
                  const v = r.criteria.find((x) => x.label === c)?.average;
                  return (
                    <Text key={c} style={{ width: 58, textAlign: "right" }}>
                      {v === null || v === undefined ? "—" : v.toFixed(1)}
                    </Text>
                  );
                })}
                <Text style={[s.cNum, { fontFamily: "Helvetica-Bold" }]}>{r.score === null ? "—" : r.score.toFixed(2)}</Text>
              </View>
            ))}
          </View>
          {footer}
        </Page>
      )}
    </Document>
  );
}
