import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());

const engines = [
  {
    slug: "raymarch-scene",
    titles: ["Orbital Mesh Gate", "Depth Lattice Sweep", "Camera Halo Tunnel", "Wireframe Pulse Room", "Reflective Box Drift"],
    copy: "3Dカメラ、軌道メッシュ、奥行き感を主役にしたThree.js VJループのサンプル。",
    why: "既存系列として、カメラ、奥行き、raymarch風の立体感を増やす。現場で映える3D抽象素材の軸にする。",
  },
  {
    slug: "particle-depth",
    titles: ["Depth Particle Swarm", "Point Cloud Gate", "Orbital Dust Room", "Z Particle Bloom"],
    copy: "点群と奥行き感を主役にしたThree.js向けVJループ。",
    why: "raymarchの塊とは別に、点群、粒子、Z方向の密度で見せるラインを作る。軽量で空間投影にも合わせやすい。",
  },
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
const existing = data.drops.find((drop) => drop.date === targetDate);
if (existing) {
  console.log(`Daily drop already exists: ${targetDate} / ${existing.title}`);
  process.exit(0);
}

const seed = hash(targetDate);
const engine = engines[seed % engines.length];
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
const drop = {
  date: targetDate,
  title: engine.titles[seed % engine.titles.length],
  engine: engine.slug,
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.68, 0.92), ...hsv(hueB, 0.72, 0.78)],
  copy: engine.copy,
  why: engine.why,
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
