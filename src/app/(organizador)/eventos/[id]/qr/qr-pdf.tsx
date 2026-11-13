import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// No dividir palabras con guiones
Font.registerHyphenationCallback((word) => [word]);

export interface PdfProject {
  name: string;
  stand: string | null;
  category: string | null;
  url: string;
  qr: string; // data URL
}

export interface PdfEvent {
  name: string;
  color: string;
  logo: string | null;
  generalUrl: string;
  generalQr: string;
  pin: string | null;
}

const s = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", color: "#0f172a" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cell: {
    width: "49%",
    height: 236,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cellQr: { width: 150, height: 150 },
  cellText: { flex: 1, paddingLeft: 10 },
  small: { fontSize: 8, color: "#64748b" },
  stand: { fontSize: 17, fontFamily: "Helvetica-Bold", marginTop: 4 },
  name: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 6 },
  cta: { fontSize: 9, marginTop: 10 },
  url: { fontSize: 6.5, color: "#64748b", marginTop: 4 },
  // una por hoja
  big: { flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
  bar: { height: 14, borderRadius: 7, width: "100%", marginBottom: 24 },
  logo: { width: 70, height: 70, objectFit: "contain", marginBottom: 12 },
  bigEvent: { fontSize: 14, color: "#475569" },
  bigName: { fontSize: 28, fontFamily: "Helvetica-Bold", marginTop: 10, maxWidth: 480 },
  bigStand: { fontSize: 44, fontFamily: "Helvetica-Bold", marginTop: 6 },
  bigQr: { width: 330, height: 330, marginTop: 18 },
  bigCta: { fontSize: 16, marginTop: 14 },
  bigUrl: { fontSize: 9, color: "#64748b", marginTop: 6 },
});

function usableLogo(url: string | null) {
  return url && !/\.svg($|\?)/i.test(url) ? url : null;
}

function BigPage({
  event,
  title,
  subtitle,
  stand,
  qr,
  url,
  cta,
}: {
  event: PdfEvent;
  title: string;
  subtitle?: string | null;
  stand?: string | null;
  qr: string;
  url: string;
  cta: string;
}) {
  const logo = usableLogo(event.logo);
  return (
    <Page size="LETTER" style={s.page}>
      <View style={[s.bar, { backgroundColor: event.color }]} />
      <View style={s.big}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logo && <Image src={logo} style={s.logo} />}
        <Text style={s.bigEvent}>{event.name}</Text>
        {stand && <Text style={[s.bigStand, { color: event.color }]}>Stand {stand}</Text>}
        <Text style={s.bigName}>{title}</Text>
        {subtitle && <Text style={[s.bigEvent, { marginTop: 4 }]}>{subtitle}</Text>}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={qr} style={s.bigQr} />
        <Text style={s.bigCta}>{cta}</Text>
        <Text style={s.bigUrl}>{url}</Text>
      </View>
      <View style={[s.bar, { backgroundColor: event.color, marginBottom: 0, marginTop: 24 }]} />
    </Page>
  );
}

export function QrSheet({
  event,
  projects,
  layout,
  includeGeneral,
}: {
  event: PdfEvent;
  projects: PdfProject[];
  layout: "grid" | "single";
  includeGeneral: boolean;
}) {
  const general = includeGeneral ? (
    <BigPage
      event={event}
      title="Evaluación de proyectos"
      subtitle={event.pin ? `PIN del evento: ${event.pin}` : "Escanea y elige el proyecto que vas a evaluar"}
      qr={event.generalQr}
      url={event.generalUrl}
      cta="Escanea con la cámara de tu celular"
    />
  ) : null;

  if (layout === "single") {
    return (
      <Document title={`Códigos QR — ${event.name}`} author="EvalúaQR">
        {general}
        {projects.map((p, i) => (
          <BigPage
            key={i}
            event={event}
            title={p.name}
            subtitle={p.category}
            stand={p.stand}
            qr={p.qr}
            url={p.url}
            cta="Escanea para evaluar este proyecto"
          />
        ))}
      </Document>
    );
  }

  const pages: PdfProject[][] = [];
  for (let i = 0; i < projects.length; i += 6) pages.push(projects.slice(i, i + 6));

  return (
    <Document title={`Códigos QR — ${event.name}`} author="EvalúaQR">
      {general}
      {pages.map((group, pi) => (
        <Page key={pi} size="LETTER" style={s.page}>
          <View style={s.grid}>
            {group.map((p, i) => (
              <View key={i} style={s.cell} wrap={false}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={p.qr} style={s.cellQr} />
                <View style={s.cellText}>
                  <Text style={s.small}>{event.name}</Text>
                  {p.stand && <Text style={[s.stand, { color: event.color }]}>Stand {p.stand}</Text>}
                  <Text style={s.name}>{p.name}</Text>
                  {p.category && <Text style={[s.small, { marginTop: 2 }]}>{p.category}</Text>}
                  <Text style={s.cta}>Escanea para evaluar este proyecto</Text>
                  <Text style={s.url}>{p.url}</Text>
                </View>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
