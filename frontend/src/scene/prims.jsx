import { createContext, useContext } from "react";
import * as THREE from "three";

export const LightCtx = createContext({ night: false, allowed: new Set() });
export const useLights = () => useContext(LightCtx);

const tmp = new THREE.Color();
export function tone(hex, amt) {
  tmp.set(hex || "#888888");
  const hsl = {};
  tmp.getHSL(hsl);
  tmp.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return "#" + tmp.getHexString();
}

export const B = ({ p = [0, 0, 0], s = [1, 1, 1], c = "#888", r = 0.7, m = 0, o = 1, e = null, ry = 0, rz = 0, rx = 0, shadow = true }) => (
  <mesh position={p} rotation={[rx, ry, rz]} castShadow={shadow && o >= 1} receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={r} metalness={m} transparent={o < 1} opacity={o} emissive={e || "#000"} emissiveIntensity={e ? 1.4 : 0} depthWrite={o >= 1} />
  </mesh>
);
export const Cy = ({ p = [0, 0, 0], r = 0.1, rb, h = 1, c = "#888", rough = 0.7, m = 0, o = 1, seg = 28, rx = 0, rz = 0, e = null, open = false }) => (
  <mesh position={p} rotation={[rx, 0, rz]} castShadow={o >= 1} receiveShadow>
    <cylinderGeometry args={[r, rb ?? r, h, seg, 1, open]} />
    <meshStandardMaterial color={c} roughness={rough} metalness={m} transparent={o < 1} opacity={o} emissive={e || "#000"} emissiveIntensity={e ? 1.4 : 0} side={open ? THREE.DoubleSide : THREE.FrontSide} depthWrite={o >= 1} />
  </mesh>
);
export const Sp = ({ p = [0, 0, 0], r = 0.1, c = "#888", sy = 1, sx = 1, sz = 1, rough = 0.7, m = 0, o = 1, e = null, seg = 20 }) => (
  <mesh position={p} scale={[sx, sy, sz]} castShadow={o >= 1} receiveShadow>
    <sphereGeometry args={[r, seg, Math.max(8, seg - 6)]} />
    <meshStandardMaterial color={c} roughness={rough} metalness={m} transparent={o < 1} opacity={o} emissive={e || "#000"} emissiveIntensity={e ? 1.6 : 0} depthWrite={o >= 1} />
  </mesh>
);
export const Cone = ({ p = [0, 0, 0], r = 0.3, h = 1, c = "#2f7d4f", seg = 20 }) => (
  <mesh position={p} castShadow receiveShadow>
    <coneGeometry args={[r, h, seg]} />
    <meshStandardMaterial color={c} roughness={0.85} />
  </mesh>
);
export const Torus = ({ p = [0, 0, 0], r = 0.3, t = 0.03, c = "#888", rx = Math.PI / 2, m = 0.3, e = null }) => (
  <mesh position={p} rotation={[rx, 0, 0]} castShadow>
    <torusGeometry args={[r, t, 12, 36]} />
    <meshStandardMaterial color={c} metalness={m} roughness={0.4} emissive={e || "#000"} emissiveIntensity={e ? 1.4 : 0} />
  </mesh>
);
export const GLASS = "#9fd8ef";
export const MIRROR = "#dfe9ee";

/** Real light source (only for items in the allowed budget, only at night). */
export function Glow({ id, p = [0, 0, 0], color = "#ffd9a0", intensity = 6, dist = 7 }) {
  const { night, allowed } = useLights();
  if (!night || !allowed.has(id)) return null;
  return <pointLight position={p} color={color} intensity={intensity} distance={dist} decay={2} />;
}
