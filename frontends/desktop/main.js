// Lightweight Electron launcher that reuses the existing Next.js web UI.
// It starts (or reuses) the web dev server, then opens a BrowserWindow that points at it.

const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const NEXT_HOST = process.env.NEXT_HOST || "localhost";
// Avoid the default 3000 used by other tooling; desktop uses 4000 unless overridden.
const NEXT_PORT = Number(process.env.NEXT_PORT || 4000);
const NEXT_URL = process.env.NEXT_URL || `http://${NEXT_HOST}:${NEXT_PORT}`;

let nextProcess;

function pingServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1000 }, (res) => {
      res.destroy();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForNext(url, attempts = 40, delayMs = 500) {
  for (let i = 0; i < attempts; i += 1) {
    if (await pingServer(url)) return;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Next server did not respond at ${url}`);
}

const workspaceRoot = path.resolve(__dirname, "..", "..");

function getNxCommand() {
  const binName = process.platform === "win32" ? "nx.cmd" : "nx";
  const localNx = path.join(workspaceRoot, "node_modules", ".bin", binName);
  return localNx;
}

async function ensureNextServer() {
  // Reuse an already running server if present.
  if (await pingServer(NEXT_URL)) {
    console.log(`[desktop] Reusing existing Next server at ${NEXT_URL}`);
    return;
  }

  console.log("[desktop] Starting Next dev server...");
  const nxBin = getNxCommand();
  nextProcess = spawn(
    nxBin,
    ["serve", "web", "--hostname", NEXT_HOST, "--port", String(NEXT_PORT)],
    {
      stdio: "inherit",
      env: { ...process.env, BROWSER: "none" },
      cwd: workspaceRoot,
      shell: process.platform === "win32", // allow .cmd shim resolution on Windows
    },
  );

  nextProcess.on("exit", (code) => {
    console.log(`[desktop] Next server exited with code ${code}`);
    if (!app.isQuiting) {
      app.quit();
    }
  });

  await waitForNext(NEXT_URL);
  console.log(`[desktop] Next server is up at ${NEXT_URL}`);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(NEXT_URL);

  mainWindow.on("closed", () => {
    // no-op
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
  }
});

app.whenReady().then(async () => {
  try {
    await ensureNextServer();
    createWindow();
  } catch (err) {
    console.error("[desktop] Failed to start:", err);
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
