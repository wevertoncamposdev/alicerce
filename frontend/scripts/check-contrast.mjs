// Calcula contraste WCAG para pares de cores OKLCH propostas para a nova
// paleta de marca (azul) — usado uma vez durante o design, não faz parte do
// app. Conversão OKLCH -> linear sRGB -> luminância relativa -> razão de
// contraste (fórmula padrão WCAG 2.x).

function oklchToLinearSrgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [r, g, bl];
}

function linearToSrgbChannel(c) {
  const clamped = Math.min(1, Math.max(0, c));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function relativeLuminance(linearRgb) {
  const [r, g, b] = linearRgb.map((c) => Math.min(1, Math.max(0, c)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(oklch1, oklch2) {
  const l1 = relativeLuminance(oklchToLinearSrgb(...oklch1));
  const l2 = relativeLuminance(oklchToLinearSrgb(...oklch2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex(oklch) {
  const [r, g, b] = oklchToLinearSrgb(...oklch).map(linearToSrgbChannel);
  const toByte = (c) => Math.round(Math.min(1, Math.max(0, c)) * 255);
  return `#${[r, g, b].map((c) => toByte(c).toString(16).padStart(2, "0")).join("")}`;
}

const pairs = [
  ["light primary (final) vs white fg", [0.5, 0.2, 260], [0.985, 0, 0]],
  ["light ring (final) vs white bg", [0.6, 0.18, 260], [1, 0, 0]],
  ["light save (existing) vs white fg", [0.41692, 0.13126, 259.024], [0.985, 0, 0]],
  ["dark primary (final) vs near-black fg", [0.72, 0.16, 258], [0.145, 0, 0]],
  ["dark ring (final) vs dark bg", [0.72, 0.16, 258], [0.145, 0, 0]],
  ["dark primary vs card bg (0.205)", [0.72, 0.16, 258], [0.205, 0, 0]],
];

for (const [label, a, b] of pairs) {
  const ratio = contrastRatio(a, b);
  console.log(`${label.padEnd(45)} ratio=${ratio.toFixed(2)}  colorA=${toHex(a)}  colorB=${toHex(b)}`);
}
