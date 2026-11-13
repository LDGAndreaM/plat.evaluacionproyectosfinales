import QRCode from "qrcode";

const OPTS = { errorCorrectionLevel: "M" as const, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } };

export function qrDataUrl(text: string, width = 512) {
  return QRCode.toDataURL(text, { ...OPTS, width });
}

export function qrSvg(text: string) {
  return QRCode.toString(text, { ...OPTS, type: "svg" });
}

export function eventUrl(origin: string, code: string) {
  return `${origin}/e/${code}`;
}

export function projectUrl(origin: string, eventCode: string, projectCode: string) {
  return `${origin}/e/${eventCode}/p/${projectCode}`;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
