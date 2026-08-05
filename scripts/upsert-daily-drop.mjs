import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());

const titles = [
  "Orbital Mesh Gate",
  "Depth Lattice Sweep",
  "Camera Halo Tunnel",
  "Wireframe Pulse Room",
  "Reflective Box Drift",
];

const copyLines = [
  "3Dカメラ、軌道メッシュ、奥行き感を主役にしたThree.js VJループのサンプル。",
  "販売用3D映像パックに展開するための、軽量なWebプレビューフレーム。",
  "XRや空間投影に転用しやすい、カメラ運動とメッシュ周期をそろえた抽象ループ。",
];

const whyLines = [
  "Three.jsはカメラ、メッシュ、ライト、ポストエフェクトを扱う3D VJ素材に向く。まずは日次データと公開導線を固定し、後からscene実装を差し替えやすい形にした。",
  "3D素材は視点運動がループの印象を左右するため、整数周期のカメラ揺れとメッシュ配置を前提にした。GitHub Pagesでは軽量プレビュー、販売先では高品質レンダーを扱う。",
  "XRや空間演出へ展開するなら、2Dパターンより3Dシーンの方が拡張余地が大きい。今日のサンプルはそのためのフレーム確認を優先した。",
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
const existing = data.drops.find((drop) => drop.date === targetDate);
if (existing) {
  console.log(`Daily drop already exists: ${targetDate} / ${existing.title}`);
  process.exit(0);
}

const seed = hash(targetDate);
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
const drop = {
  date: targetDate,
  title: titles[seed % titles.length],
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.68, 0.92), ...hsv(hueB, 0.72, 0.78)],
  copy: copyLines[seed % copyLines.length],
  why: whyLines[seed % whyLines.length],
};

data.drops.unshift(drop);
data.drops.sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile(dropsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added daily drop: ${targetDate} / ${drop.title}`);

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hash(value) {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return Math.abs(out);
}

function fract(value) {
  return value - Math.floor(value);
}

function hsv(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const table = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ];
  return table[i % 6].map((n) => Number(n.toFixed(3)));
}
