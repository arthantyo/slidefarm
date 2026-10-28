const startupStarted = process.hrtime.bigint();
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const { createServer: createNetServer } = require("node:net");
const { createServer: createHttpServer } = require("node:http");
const path = require("node:path");
const log = require("electron-log/main");

log.initialize();

let server;
let window;
let serverUrl;
let tiktokCallbackServer;
let tiktokCallbackOrigin;
const startupMilestones = new Set();
const pendingStartup = [];
let sendingStartup = false;

function recordStartup(milestone) {
  if (startupMilestones.has(milestone)) return;
  startupMilestones.add(milestone);
  const durationMs = Number(process.hrtime.bigint() - startupStarted) / 1e6;
  log.info("Startup milestone", milestone, `${durationMs.toFixed(1)} ms`);
  pendingStartup.push({ milestone, durationMs });
  void flushStartup();
}

async function flushStartup() {
  if (!serverUrl || sendingStartup) return;
  sendingStartup = true;
  try {
    while (pendingStartup.length) {
      const response = await fetch(`${serverUrl}/api/desktop-startup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingStartup[0]),
      });
      if (!response.ok) throw new Error(`Startup telemetry returned ${response.status}`);
      pendingStartup.shift();
    }
  } catch (error) {
    log.warn("Could not report startup timing", error);
  } finally {
    sendingStartup = false;
  }
}
const deepLink = "slidefarm://tiktok-connected";
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient("slidefarm", process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient("slidefarm");
}
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on("second-instance", () => {
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
});
app.on("open-url", (event) => {
  event.preventDefault();
  if (window && !window.isDestroyed()) {
    window.show();
    window.focus();
  }
});
const iconName =
  process.platform === "win32"
    ? "icon-windows.ico"
    : process.platform === "darwin"
      ? "icon-mac.icns"
      : "icon-linux.png";
const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, "icons", iconName)
  : path.join(__dirname, "..", "app", "assets", iconName);

function freePort() {
  return new Promise((resolve, reject) => {
    const listener = createNetServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const address = listener.address();
      listener.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`SlideFarm server exited (${child.exitCode}).`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* Server is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("SlideFarm server did not start.");
}

async function start() {
  const port = await freePort();
  const serverRoot = app.isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.join(__dirname, "..");
  const entry = app.isPackaged
    ? path.join(serverRoot, "server.js")
    : path.join(serverRoot, "node_modules", "next", "dist", "bin", "next");
  const args = app.isPackaged
    ? [entry]
    : [entry, "dev", "--hostname", "127.0.0.1", "--port", String(port)];
  server = spawn(process.execPath, args, {
    cwd: serverRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      SLIDEFARM_DATA_DIR: app.getPath("userData"),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout.on("data", (chunk) => log.info(String(chunk).trim()));
  server.stderr.on("data", (chunk) => log.error(String(chunk).trim()));
  server.on("error", (error) => log.error(error));
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url, server);
  serverUrl = url;
  void flushStartup();
  await createWindow(url);
}

async function createWindow(url) {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: iconPath,
    minWidth: 1080,
    minHeight: 600,
    show: false,
    frame: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  if (process.platform !== "darwin") window.removeMenu();
  const notifyMaximized = () => {
    if (!window.isDestroyed())
      window.webContents.send("window:maximized", window.isMaximized());
  };
  window.on("maximize", notifyMaximized);
  window.on("unmaximize", notifyMaximized);
  window.once("ready-to-show", () => window.show());
  window.webContents.once("did-finish-load", () => recordStartup("window_loaded"));
  const isLocal = (target) => {
    try {
      return new URL(target).origin === url;
    } catch {
      return false;
    }
  };
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isLocal(target)) return { action: "allow" };
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, target) => {
    if (isLocal(target)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
  });
  await window.loadURL(url);
}

async function listenForTikTokCallback(redirectUri) {
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(redirect.hostname) || !redirect.port || redirect.pathname !== "/api/tiktok/callback") {
    throw new Error("Desktop TikTok connection needs a registered HTTP localhost callback URI with a port.");
  }
  if (tiktokCallbackServer && tiktokCallbackOrigin === redirect.origin) return;
  if (tiktokCallbackServer) {
    await new Promise((resolve) => tiktokCallbackServer.close(resolve));
    tiktokCallbackServer = undefined;
  }
  const callbackServer = createHttpServer(async (request, response) => {
    const incoming = new URL(request.url || "/", redirect.origin);
    if (request.method !== "GET" || incoming.pathname !== redirect.pathname) {
      response.writeHead(404).end();
      return;
    }
    try {
      const result = await fetch(`${serverUrl}${incoming.pathname}${incoming.search}`, { redirect: "manual" });
      const location = result.headers.get("location");
      const destination = location && new URL(location, serverUrl);
      if (!destination || destination.origin !== serverUrl || destination.pathname !== "/accounts") throw new Error("Unexpected TikTok callback response.");
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(`<!doctype html><html><head><title>Return to SlideFarm</title></head><body><p>TikTok connection finished. <a href="${deepLink}">Return to SlideFarm</a>.</p><script>location.replace(${JSON.stringify(deepLink)});</script></body></html>`);
      if (window && !window.isDestroyed()) {
        void window.loadURL(destination.toString()).catch((error) => log.error(error));
        window.show();
        window.focus();
      }
    } catch (error) {
      log.error(error);
      if (!response.headersSent) {
        response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Could not complete TikTok connection. Return to SlideFarm and try again.");
      }
    }
  });
  await new Promise((resolve, reject) => {
    callbackServer.once("error", reject);
    callbackServer.listen(Number(redirect.port), redirect.hostname, resolve);
  });
  tiktokCallbackServer = callbackServer;
  tiktokCallbackOrigin = redirect.origin;
}

if (hasInstanceLock) app
  .whenReady()
  .then(() => {
    recordStartup("app_ready");
    if (process.platform === "darwin") app.dock.setIcon(iconPath);
    Menu.setApplicationMenu(null);
    const ownWindow = (event) => {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      return senderWindow === window ? senderWindow : null;
    };
    ipcMain.handle("window:minimize", (event) => ownWindow(event)?.minimize());
    ipcMain.handle("window:toggle-maximize", (event) => {
      const target = ownWindow(event);
      if (!target) return false;
      if (target.isMaximized()) target.unmaximize();
      else target.maximize();
      return target.isMaximized();
    });
    ipcMain.handle(
      "window:is-maximized",
      (event) => ownWindow(event)?.isMaximized() ?? false,
    );
    ipcMain.handle("window:close", (event) => ownWindow(event)?.close());
    ipcMain.handle("startup:interactive", (event, stage) => {
      if (!ownWindow(event) || (stage !== "dashboard" && stage !== "editor")) return;
      recordStartup(stage === "dashboard" ? "dashboard_interactive" : "editor_interactive");
    });
    ipcMain.handle("tiktok:connect", async (event) => {
      if (!ownWindow(event) || !serverUrl) throw new Error("SlideFarm is not ready.");
      const response = await fetch(`${serverUrl}/api/tiktok/connect?desktop=1`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start TikTok connection. Check Settings.");
      if (!result.authorizationUrl || !result.redirectUri) throw new Error("Complete TikTok Login Kit settings first.");
      await listenForTikTokCallback(result.redirectUri);
      await shell.openExternal(result.authorizationUrl);
    });
    return start();
  })
  .catch((error) => {
    log.error(error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0)
    void (serverUrl ? createWindow(serverUrl) : start());
});
app.on("before-quit", () => {
  if (tiktokCallbackServer) tiktokCallbackServer.close();
  if (server && server.exitCode === null) server.kill();
});
