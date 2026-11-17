/** Generador pseudoaleatorio con semilla (mulberry32), para poder regenerar igual. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

export function shuffle<T>(arr: T[], rand: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Normaliza una palabra para un pasatiempo: mayúsculas, sin espacios ni signos.
 * Conserva la Ñ; quita acentos y diéresis si se pide.
 */
export function normalizeWord(word: string, removeAccents = true) {
  let w = word.toUpperCase().trim();
  if (removeAccents) {
    w = w
      .replace(/Ñ/g, "\u0000")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\u0000/g, "Ñ");
  }
  return w.replace(/[^A-ZÑÁÉÍÓÚÜ]/g, "");
}

export const SPANISH_ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
