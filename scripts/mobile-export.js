#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.join(root, "frontends", "web", "out");
const mobileWeb = path.join(root, "frontends", "mobile", "web");

function run(cmd) {
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, NEXT_EXPORT: "true" },
  });
}

run("next build frontends/web");

if (!fs.existsSync(outDir)) {
  throw new Error(`Expected export output at ${outDir}`);
}

fs.rmSync(mobileWeb, { recursive: true, force: true });
fs.cpSync(outDir, mobileWeb, { recursive: true });

console.log("[mobile-export] Copied static export to frontends/mobile/web");
