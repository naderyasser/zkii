// ═══════════════════════════════════════════════════════════════════════════════
// PALETTE (server) — استخراج ألوان الغلاف (node-vibrant) + ترويض HSL/تباين
// ═══════════════════════════════════════════════════════════════════════════════
import { Vibrant } from 'node-vibrant/node';

const PAPER_LIGHT = '#f6f0e2';
const PAPER_DARK = '#211e19';

export interface PagePalette {
  accentLight: string;
  accentDark: string;
  tintLight: string;
  tintDark: string;
  swatches: string[];
}

// ─── تحويلات لونية ──────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

// ─── تباين WCAG ─────────────────────────────────────────────────────────────
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// ─── ترويض الألوان (إلزامي قبل التخزين) ─────────────────────────────────────
// accentLight: sat ≤ 60% + يغمق لحد contrast ≥ 4.5 مع الورق الفاتح
function tameLight(hex: string): string {
  let [h, s, l] = rgbToHsl(...hexToRgb(hex));
  s = Math.min(s, 0.6);
  for (let i = 0; i < 60; i++) {
    const [r, g, b] = hslToRgb(h, s, l);
    if (contrast(rgbToHex(r, g, b), PAPER_LIGHT) >= 4.5) break;
    l = Math.max(0, l - 0.02);
  }
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
// accentDark: يفتح لحد contrast ≥ 4.5 مع الفحمي
function tameDark(hex: string): string {
  let [h, s, l] = rgbToHsl(...hexToRgb(hex));
  s = Math.min(s, 0.7);
  for (let i = 0; i < 60; i++) {
    const [r, g, b] = hslToRgb(h, s, l);
    if (contrast(rgbToHex(r, g, b), PAPER_DARK) >= 4.5) break;
    l = Math.min(1, l + 0.02);
  }
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
// tint: 92% ورق + 8% اللون المهيمن
function mixTint(dominant: string, paper: string): string {
  const [dr, dg, db] = hexToRgb(dominant);
  const [pr, pg, pb] = hexToRgb(paper);
  return rgbToHex(pr * 0.92 + dr * 0.08, pg * 0.92 + dg * 0.08, pb * 0.92 + db * 0.08);
}

// ─── الاستخراج الرئيسي ──────────────────────────────────────────────────────
export async function extractPalette(imageUrl: string): Promise<PagePalette | null> {
  try {
    const sw = await Vibrant.from(imageUrl).getPalette();
    const order = ['Vibrant', 'DarkVibrant', 'LightVibrant', 'Muted', 'DarkMuted', 'LightMuted'] as const;
    const swatches = order.map((k) => sw[k]?.hex).filter(Boolean) as string[];
    if (swatches.length === 0) return null;
    const dominant = sw.Vibrant?.hex || sw.LightVibrant?.hex || swatches[0];
    return {
      accentLight: tameLight(dominant),
      accentDark: tameDark(dominant),
      tintLight: mixTint(dominant, PAPER_LIGHT),
      tintDark: mixTint(dominant, PAPER_DARK),
      swatches: swatches.slice(0, 5),
    };
  } catch (err) {
    console.error('[palette] extract failed', err);
    return null;
  }
}
