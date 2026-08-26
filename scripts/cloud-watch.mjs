import fs from "node:fs";
import { spawn, execFileSync } from "node:child_process";

let timer = null;
let running = false;
let pending = false;

const IGNORE = [
  ".git/",
  ".next/",
  "node_modules/",
  ".env.local",
  ".DS_Store",
  "tsconfig.tsbuildinfo"
];

function ignored(filename = "") {
  return IGNORE.some((item) => filename.includes(item));
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function hasChanges() {
  try {
    return execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8"
    }).trim().length > 0;
  } catch {
    return false;
  }
}

async function publish() {
  if (running) {
    pending = true;
    return;
  }

  if (!hasChanges()) return;

  running = true;

  console.log("\n☁️ ONE · Cambio detectado.");
  console.log("🔍 Comprobando build antes de publicar...\n");

  const buildCode = await run("npm", ["run", "build"]);

  if (buildCode !== 0) {
    console.log("\n❌ Build con errores. ONE Cloud NO se ha actualizado.");
    console.log("✅ La versión anterior de Cloud permanece intacta.\n");
    running = false;
    return;
  }

  console.log("\n✅   console.log("\n✅   conso.log("  console.log("\n✅   console.log("\n✅   conso.log(", ["r  console.log("\n✅   cng  console.log("\n✅   console.loend  console.log("\n✅   console.log(
ffffffffffffffffffff{
  c  c  c  c  c imer);

  console.log("🟠 Cambio guardado · Cloud se actualizará en 15 segundos si todo compila.");

  timer = setTimeout(publish, 15000);
}

console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("☁️  ONE · CLOUD SYNC AUTOMÁTICO");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Localhost y Cloud conconsole.log("Localhost y Cloud conconsole.log("Localsole.console.log("Localhostproconsole.log("Localhost y Cloud conconsole.log("Localhost y Cloud conconsolfilconsole.log("Localhost y Cloud conconsole.log("Localhost y Cloud conconsoipconsole.log("Local'EOconsole.l/zsco
echo "🚀 ONE · LOCAL + CLOUD"
echo ""

npm run dev &
DEV_PID=$!

node scripts/cloud-watch.mjs &
WATCH_PID=$!

trap 'kill $DEV_PID $WATCH_PID 2>/dev/null' INT TERM EXIT

wait
