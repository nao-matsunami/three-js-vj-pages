import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(scriptDir, "..");
const targetDir = path.join(sourceDir, "pages-work");
const repo = "nao-matsunami/three-js-vj-pages";
const excluded = new Set([".git", "node_modules", "pages-work"]);

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function copyRecursive(from, to) {
  const stat = await fs.lstat(from);
  if (stat.isDirectory()) {
    await ensureDir(to);
    const entries = await fs.readdir(from, { withFileTypes: true });
    for (const entry of entries) {
      if (excluded.has(entry.name)) continue;
      await copyRecursive(path.join(from, entry.name), path.join(to, entry.name));
    }
    return;
  }
  await ensureDir(path.dirname(to));
  await fs.copyFile(from, to);
}

async function emptyTargetDir(targetPath) {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    await fs.rm(path.join(targetPath, entry.name), { recursive: true, force: true });
  }
}

function run(command, args, cwd, stdio = "inherit") {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

function runCapture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("exit", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function ensurePublishRepo() {
  const hasGit = await pathExists(path.join(targetDir, ".git"));
  if (!hasGit) {
    await ensureDir(targetDir);
    await run("git", ["init", "-b", "main"], targetDir);
  }

  const remotes = await runCapture("git", ["remote"], targetDir);
  if (!remotes.split("\n").includes("origin")) {
    await run("git", ["remote", "add", "origin", `https://github.com/${repo}.git`], targetDir);
  }

  await run("git", ["fetch", "origin", "main"], targetDir).catch(() => {});
  const hasCommit = await runCapture("git", ["rev-parse", "--verify", "HEAD"], targetDir)
    .then(() => true)
    .catch(() => false);

  if (hasCommit) {
    await run("git", ["checkout", "main"], targetDir);
    await run("git", ["pull", "--ff-only", "origin", "main"], targetDir).catch(() => {});
  }
}

async function copyProject() {
  await ensurePublishRepo();
  await emptyTargetDir(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    await copyRecursive(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
  }
}

async function main() {
  await copyProject();
  await run("git", ["add", "."], targetDir);
  try {
    await run("git", ["diff", "--cached", "--quiet"], targetDir, "ignore");
    console.log("No changes to publish.");
    return;
  } catch {
    // Changes are staged.
  }
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  await run("git", ["commit", "-m", `Publish Three.js VJ site ${stamp}`], targetDir);
  const token = await runCapture("gh", ["auth", "token"], targetDir);
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  const gitPushArgs = ["-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`];
  await run("git", [...gitPushArgs, "push", "-u", "origin", "main"], targetDir);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
