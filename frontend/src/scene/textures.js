import * as THREE from "three";
import { FLOOR_BY_ID } from "./catalog.js";

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v) => Math.max(0, Math.min(255, v));
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => clamp(c + amt * 255);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** metres covered by one texture repeat */
export function spanOf(mat, size) {
  const p = mat.pattern;
  if (p === "checker") return size * 2;
  if (p === "grid" || p === "brick" || p === "hex") return size;
  return 1;
}

function draw(ctx, S, mat, color, size) {
  const R = rng(mat.id.length * 977 + 13);
  const p = mat.pattern;
  ctx.fillStyle = color; ctx.fillRect(0, 0, S, S);
  const noise = (amt, n = 2200) => { for (let i = 0; i < n; i++) { ctx.fillStyle = shade(color, (R() - 0.5) * amt); ctx.fillRect(R() * S, R() * S, 2 + R() * 3, 2 + R() * 3); } };
  if (p === "grid") {
    noise(0.05, 800);
    ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = Math.max(2, S * 0.012); ctx.strokeRect(0, 0, S, S);
    if (mat.gloss) { const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, "rgba(255,255,255,0.22)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
  } else if (p === "checker") {
    ctx.fillStyle = mat.alt || "#222"; ctx.fillRect(0, 0, S / 2, S / 2); ctx.fillRect(S / 2, S / 2, S / 2, S / 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2; ctx.strokeRect(0, 0, S / 2, S / 2); ctx.strokeRect(S / 2, 0, S / 2, S / 2); ctx.strokeRect(0, S / 2, S / 2, S / 2); ctx.strokeRect(S / 2, S / 2, S / 2, S / 2);
  } else if (p === "planks") {
    const n = Math.max(3, Math.round(1 / size));
    const ph = S / n;
    for (let i = 0; i < n; i++) {
      const off = R() * S;
      const tint = (R() - 0.5) * 0.12;
      for (let k = 0; k < 2; k++) {
        const w = S * (0.45 + R() * 0.3);
        ctx.fillStyle = shade(color, tint); ctx.fillRect(((off + k * S * 0.55) % S), i * ph, w, ph - 2);
        ctx.fillRect(((off + k * S * 0.55) % S) - S, i * ph, w, ph - 2);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1;
      for (let g = 0; g < 7; g++) { ctx.beginPath(); const y = i * ph + 3 + R() * (ph - 6); ctx.moveTo(0, y); ctx.bezierCurveTo(S * 0.3, y + R() * 4 - 2, S * 0.7, y + R() * 4 - 2, S, y); ctx.stroke(); }
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, i * ph + ph - 2, S, 2);
    }
  } else if (p === "herring") {
    const w = S / 8, l = S / 4;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    for (let y = -l; y < S + l; y += w) for (let x = -l; x < S + l; x += w * 2) {
      const flip = (Math.round(y / w) % 2) === 0;
      ctx.save(); ctx.translate(x, y); if (flip) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = shade(color, (R() - 0.5) * 0.14); ctx.fillRect(0, 0, l, w - 1.5); ctx.restore();
    }
  } else if (p === "veins") {
    noise(0.04, 900);
    ctx.strokeStyle = mat.vein ? mat.vein : "rgba(110,110,120,0.45)"; ctx.lineCap = "round";
    for (let v = 0; v < 9; v++) {
      ctx.lineWidth = 0.6 + R() * 2.4; ctx.globalAlpha = 0.25 + R() * 0.45; ctx.beginPath();
      let x = R() * S, y = 0; ctx.moveTo(x, y);
      while (y < S) { x += (R() - 0.5) * 60; y += 14 + R() * 24; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (mat.gloss) { const g = ctx.createLinearGradient(0, 0, S, 0); g.addColorStop(0, "rgba(255,255,255,0.18)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); }
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 2; ctx.strokeRect(0, 0, S, S);
  } else if (p === "speckle") {
    const cols = mat.flecks || [shade(color, 0.12), shade(color, -0.1), shade(color, 0.2)];
    for (let i = 0; i < 2600; i++) { ctx.fillStyle = cols[i % cols.length]; const r = 1 + R() * (mat.flecks ? 5 : 2.2); ctx.beginPath(); ctx.arc(R() * S, R() * S, r, 0, 7); ctx.fill(); }
    if (mat.gloss) { ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2; ctx.strokeRect(0, 0, S, S); }
  } else if (p === "hex" || p === "brick") {
    const rows = p === "brick" ? 4 : 5, rh = S / rows, cw = p === "brick" ? S / 2 : S / 3;
    for (let r = 0; r < rows; r++) for (let c = -1; c < S / cw + 1; c++) {
      const x = c * cw + (r % 2 ? cw / 2 : 0);
      ctx.fillStyle = shade(color, (R() - 0.5) * 0.12); ctx.fillRect(x + 2, r * rh + 2, cw - 4, rh - 4);
    }
  } else if (p === "grass") {
    for (let i = 0; i < 5200; i++) { ctx.fillStyle = shade(color, (R() - 0.5) * 0.3); ctx.fillRect(R() * S, R() * S, 1.5, 4 + R() * 5); }
  } else {
    noise(mat.rough ? 0.1 : 0.05, 2600);
  }
}

const cache = new Map();
export function floorTexture(matId, color, size, w, l) {
  const mat = FLOOR_BY_ID[matId] || FLOOR_BY_ID.ceramic;
  const span = spanOf(mat, size || mat.size);
  const key = `${matId}|${color}|${size}`;
  let base = cache.get(key);
  if (!base) {
    const S = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    draw(canvas.getContext("2d"), S, { ...mat }, color, size || mat.size);
    base = new THREE.CanvasTexture(canvas);
    base.colorSpace = THREE.SRGBColorSpace;
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    base.anisotropy = 4;
    cache.set(key, base);
    if (cache.size > 48) { const k = cache.keys().next().value; cache.get(k)?.dispose(); cache.delete(k); }
  }
  const t = base.clone();  // shares the image, owns its repeat
  t.needsUpdate = true;
  t.repeat.set(Math.max(0.2, w / span), Math.max(0.2, l / span));
  return t;
}
