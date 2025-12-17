#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, "score-server", ".env");

function parseEnvFile(contents) {
  const env = {};
  const lines = contents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7) : line;
    const eqIdx = withoutExport.indexOf("=");
    if (eqIdx === -1) continue;

    const key = withoutExport.slice(0, eqIdx).trim();
    let value = withoutExport.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadScoreServerEnv({ excludeKeys = [] } = {}) {
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  const parsed = parseEnvFile(contents);
  for (const [key, value] of Object.entries(parsed)) {
    if (excludeKeys.includes(key)) continue;
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function main() {
  const cmd = process.argv.slice(2).join(" ").trim();
  if (!cmd) {
    console.error("Usage: node scripts/with-score-env.cjs <command...>");
    process.exit(1);
  }

  // Electron (especially packaged) warns/errors if NODE_OPTIONS is present.
  // Avoid importing NODE_OPTIONS from score-server/.env for Electron commands.
  const looksLikeElectronCommand = /\belectron\b/i.test(cmd);
  loadScoreServerEnv({
    excludeKeys: looksLikeElectronCommand ? ["NODE_OPTIONS"] : [],
  });

  const child = spawn(cmd, {
    stdio: "inherit",
    shell: true,
    env: process.env,
    cwd: root,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

main();
