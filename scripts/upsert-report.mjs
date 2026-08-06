import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDir = path.join(rootDir, "reports");
const options = parseArgs(process.argv.slice(2));
const report = JSON.parse(options.stdin ? await readStdin() : await fs.readFile(path.resolve(options.file), "utf8"));
validate(report);
await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(path.join(reportsDir, report.date + ".json"), JSON.stringify(report, null, 2) + "\n");
await run("node", ["scripts/build-gallery.mjs"], rootDir);
if (options.publish) await run("node", ["scripts/publish-pages.mjs"], rootDir);

function parseArgs(argv) {
  const options = { file: null, stdin: false, publish: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file") options.file = argv[++i];
    else if (argv[i] === "--stdin") options.stdin = true;
    else if (argv[i] === "--publish") options.publish = true;
  }
  if (!options.file && !options.stdin) throw new Error("Provide --file <report.json> or --stdin");
  return options;
}
function validate(report) {
  for (const key of ["date", "headline", "summary"]) {
    if (!report[key] || typeof report[key] !== "string") throw new Error("Missing field: " + key);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.date)) throw new Error("Invalid date: " + report.date);
}
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(command + " " + args.join(" ") + " failed with code " + code)));
  });
}
