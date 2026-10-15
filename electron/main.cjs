const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const path = require('node:path');

let server;
let window;

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
    stdio: 'inherit',
    windowsHide: true,
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url, server);

  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith(url)) return { action: 'allow' };
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, target) => {
    if (target.startsWith(url)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(target)) void shell.openExternal(target);
  });
  await window.loadURL(url);
}

app.whenReady().then(start).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void start();
});
app.on('before-quit', () => {
  if (server && server.exitCode === null) server.kill();
});
