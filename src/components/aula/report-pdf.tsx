import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportTable } from "@/lib/aula/reports";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { padding: 32, paddingBottom: 44, fontFamily: "Helvetica", fontSize: 8, color: "#0f172a" },
  brand: { fontSize: 8, color: "#6a11cb", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  meta: { fontSize: 8, color: "#64748b", marginTop: 2 },
  bar: { height: 4, borderRadius: 2, backgroundColor: "#00d6b8", width: 60, marginTop: 6, marginBottom: 12 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 2 },
  sub: { fontSize: 8, color: "#64748b", marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#e2e8f0", minHeight: 16, alignItems: "center" },
  head: { backgroundColor: "#ede9fe" },
  cell: { paddingHorizontal: 3, paddingVertical: 3 },
  th: { fontFamily: "Helvetica-Bold", color: "#3a0a71", fontSize: 7 },
  hl: { backgroundColor: "#fff1f4" },
  note: { fontSize: 7, color: "#64748b", marginTop: 6 },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#94a3b8" },
});

export function ReportPdf({ heading, meta, tables, landscape }: { heading: string; meta: string; tables: ReportTable[]; landscape: boolean }) {
  return (
    <Document title={heading} author="EvalúaQR">
      <Page size="LETTER" orientation={landscape ? "landscape" : "portrait"} style={s.page} wrap>
        <Text style={s.brand}>EVALÚAQR · AULA</Text>
        <Text style={s.title}>{heading}</Text>
        <Text style={s.meta}>{meta}</Text>
        <View style={s.bar} />
        {tables.map((t, ti) => {
          // El primer ancho flexible se reparte; los fijos se respetan
          const widths = t.columns.map((c) => c.width);
          return (
            <View key={ti} wrap>
              {(ti > 0 || tables.length > 1) && <Text style={s.h2}>{t.title}</Text>}
              {t.subtitle && <Text style={s.sub}>{t.subtitle}</Text>}
              <View style={[s.row, s.head]} fixed>
                {t.columns.map((c, i) => (
                  <Text key={i} style={[s.cell, s.th, widths[i] ? { width: widths[i] } : { flex: 1 }, { textAlign: c.align ?? "left" }]}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {t.rows.length === 0 && <Text style={[s.cell, { color: "#94a3b8" }]}>Sin datos.</Text>}
              {t.rows.map((r, ri) => (
                <View key={ri} style={[s.row, t.highlight?.includes(ri) ? s.hl : {}]} wrap={false}>
                  {r.map((v, i) => (
                    <Text key={i} style={[s.cell, widths[i] ? { width: widths[i] } : { flex: 1 }, { textAlign: t.columns[i]?.align ?? "left" }]}>
                      {v == null ? "" : String(v)}
                    </Text>
                  ))}
                </View>
              ))}
              {t.note && <Text style={s.note}>{t.note}</Text>}
            </View>
          );
        })}
        <View style={s.footer} fixed>
          <Text>{heading}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
