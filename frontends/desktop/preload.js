// Preload keeps contextIsolation enabled. Expose a minimal API if needed later.
// Currently we only provide a stub for future expansion.

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  ready: true,
});
