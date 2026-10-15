const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const path = require('node:path');
const log = require('electron-log/main');

log.initialize();

let server;
let window;
let serverUrl;

function freePort() {
  return new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      listener.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`SlideFarm server exited (${child.exitCode}).`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('SlideFarm server did not start.');
}

async function start() {
  const port = await freePort();
  const serverRoot = app.isPackaged ? path.join(process.resourcesPath, 'server') : path.join(__dirname, '..');
  const entry = app.isPackaged ? path.join(serverRoot, 'server.js') : path.join(serverRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const args = app.isPackaged ? [entry] : [entry, 'dev', '--hostname', '127.0.0.1', '--port', String(port)];
  server = spawn(process.execPath, args, {
    cwd: serverRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOSTNAME: '127.0.0.1',
      PORT: String(port),
      SLIDEFARM_DATA_DIR: app.getPath('userData'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  server.stdout.on('data', (chunk) => log.info(String(chunk).trim()));
  server.stderr.on('data', (chunk) => log.error(String(chunk).trim()));
  server.on('error', (error) => log.error(error));
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url, server);
  serverUrl = url;
  await createWindow(url);
}

async function createWindow(url) {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 600,
    show: false,
    frame: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  if (process.platform !== 'darwin') window.removeMenu();
  const notifyMaximized = () => {
    if (!window.isDestroyed()) window.webContents.send('window:maximized', window.isMaximized());
  };
  window.on('maximize', notifyMaximized);
  window.on('unmaximize', notifyMaximized);
  window.once('ready-to-show', () => window.show());
  const isLocal = (target) => {
    try { return new URL(target).origin === url; } catch { return false; }
  };
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isLocal(target)) return { action: 'allow' };
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, target) => {
    if (isLocal(target)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
  });
  await window.loadURL(url);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const ownWindow = (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    return senderWindow === window ? senderWindow : null;
  };
  ipcMain.handle('window:minimize', (event) => ownWindow(event)?.minimize());
  ipcMain.handle('window:toggle-maximize', (event) => {
    const target = ownWindow(event);
    if (!target) return false;
    if (target.isMaximized()) target.unmaximize();
    else target.maximize();
    return target.isMaximized();
  });
  ipcMain.handle('window:is-maximized', (event) => ownWindow(event)?.isMaximized() ?? false);
  ipcMain.handle('window:close', (event) => ownWindow(event)?.close());
  return start();
}).catch((error) => {
  log.error(error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void (serverUrl ? createWindow(serverUrl) : start());
});
app.on('before-quit', () => {
  if (server && server.exitCode === null) server.kill();
});
