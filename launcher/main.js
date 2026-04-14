'use strict';

const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('path');
const fse = require('fs-extra');
const axios = require('axios');
const log = require('electron-log');
const Store = require('electron-store');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (err) {
  console.warn('[updater] electron-updater não encontrado. Auto update desativado.');
}

const API_URL = process.env.AETHER_API || 'http://localhost:3001';
const FRONTEND_URL = process.env.AETHER_FRONTEND_URL || 'https://ksbots.github.io/aether-client/';

// CORREÇÃO CRÍTICA: padrão agora é 'local'.
// O launcher nunca abre apenas o site. Fallback remoto só se local falhar.
const FRONTEND_MODE = process.env.AETHER_FRONTEND_MODE || 'local';

const LOCAL_FRONTEND_DEV  = path.join(__dirname, '..', 'frontend', 'index.html');
const LOCAL_FRONTEND_PROD = path.join(process.resourcesPath || __dirname, 'frontend', 'index.html');

function getLocalFrontend() {
  if (fse.existsSync(LOCAL_FRONTEND_PROD)) return LOCAL_FRONTEND_PROD;
  if (fse.existsSync(LOCAL_FRONTEND_DEV))  return LOCAL_FRONTEND_DEV;
  return null;
}

const isDev = process.env.AETHER_DEV === 'true' || !app.isPackaged;
const store = new Store({ name: 'aether-config' });

log.transports.file.level = 'info';
log.transports.console.level = isDev ? 'debug' : 'info';
if (autoUpdater) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
}

let mainWindow = null;
let tray = null;

const lock = app.requestSingleInstanceLock();
if (!lock) { app.quit(); process.exit(0); }
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

function createLoadingPage(message = 'Carregando Aether Client...') {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Aether Client</title>
<style>html,body{margin:0;height:100%;background:#07070e;color:#e8eaf6;font-family:Segoe UI,Arial,sans-serif}
.wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px}
.logo{font-weight:800;letter-spacing:4px;font-size:28px;background:linear-gradient(135deg,#818cf8,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.muted{opacity:.75;font-size:14px}.bar{width:240px;height:6px;background:#141429;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
.fill{height:100%;width:38%;background:linear-gradient(90deg,#6366f1,#7c3aed);animation:slide 1.2s infinite ease-in-out}
@keyframes slide{0%{transform:translateX(-120%)}100%{transform:translateX(260%)}}</style></head>
<body><div class="wrap"><div class="logo">AETHER</div><div class="bar"><div class="fill"></div></div>
<div class="muted">${message}</div></div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

async function tryLoadLocal(win) {
  const localPath = getLocalFrontend();
  if (!localPath) throw new Error(`Frontend local não encontrado.\n  Tentado: ${LOCAL_FRONTEND_DEV}\n  Tentado: ${LOCAL_FRONTEND_PROD}`);
  await win.loadFile(localPath);
  log.info(`[frontend] local: ${localPath}`);
  return 'local';
}

async function tryLoadRemote(win) {
  await win.loadURL(FRONTEND_URL);
  log.info(`[frontend] remoto: ${FRONTEND_URL}`);
  return 'remote';
}

async function loadFrontend(win) {
  if (FRONTEND_MODE === 'remote') return tryLoadRemote(win);
  try {
    return await tryLoadLocal(win);
  } catch (localErr) {
    log.warn(`[frontend] local falhou: ${localErr.message} — tentando remoto`);
    try {
      return await tryLoadRemote(win);
    } catch (remoteErr) {
      throw new Error(`Local: ${localErr.message} | Remoto: ${remoteErr.message}`);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 740,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#07070e',
    show: false, // CORREÇÃO: evita tela preta/branca antes de carregar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL(createLoadingPage('Inicializando interface...')).catch(() => {});

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => log.error(`[fail-load] ${code} ${desc} ${url}`));
  mainWindow.webContents.on('console-message', (_e, level, msg, line, src) => log.info(`[renderer:${level}] ${msg} (${src}:${line})`));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  loadFrontend(mainWindow)
    .then(source => {
      log.info(`[frontend] origem: ${source}`);
      if (!isDev && autoUpdater) autoUpdater.checkForUpdates().catch(e => log.warn(e.message));
    })
    .catch(async err => {
      log.error(`[frontend] erro fatal: ${err.message}`);
      const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<body style="background:#07070e;color:#e8eaf6;font-family:Segoe UI,Arial,sans-serif;padding:40px;max-width:640px;margin:0 auto">
<h2 style="color:#818cf8;margin-bottom:16px">⚠ Falha ao carregar o Aether Client</h2>
<p style="color:#aaa;margin-bottom:16px">${String(err.message).replace(/\n/g,'<br>')}</p>
<p style="color:#6b7280;font-size:13px">Certifique-se de que a pasta <code>frontend/</code> existe ao lado da pasta <code>launcher/</code>.</p>
</body></html>`;
      await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  try {
    const icons = [path.join(__dirname,'assets','icon.ico'), path.join(__dirname,'assets','icon.png')];
    const iconPath = icons.find(p => fse.existsSync(p));
    if (!iconPath) return;
    const img = nativeImage.createFromPath(iconPath);
    tray = new Tray(img.resize({ width: 16, height: 16 }));
    tray.setToolTip('Aether Client');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir Aether Client', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() }
    ]));
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (err) { log.warn(`Tray error: ${err.message}`); }
}

// IPC — Window
ipcMain.handle('window:minimize',   () => mainWindow?.minimize());
ipcMain.handle('window:maximize',   () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.handle('window:close',      () => mainWindow?.close());
ipcMain.handle('window:isMaximized',() => mainWindow?.isMaximized() ?? false);

// IPC — Config
ipcMain.handle('config:get',   () => store.store);
ipcMain.handle('config:set',   (_e, p) => { Object.entries(p||{}).forEach(([k,v]) => store.set(k,v)); return {ok:true}; });
ipcMain.handle('config:clear', () => { store.clear(); return {ok:true}; });

// IPC — API
ipcMain.handle('api:status', async () => {
  try { return (await axios.get(`${API_URL}/status`, {timeout:8000})).data; }
  catch (e) { log.warn(`[api:status] ${e.message}`); return {overall:'unknown',services:[]}; }
});
ipcMain.handle('api:version', async () => {
  try { return (await axios.get(`${API_URL}/version`, {timeout:8000})).data; }
  catch (e) { log.warn(`[api:version] ${e.message}`); return null; }
});

// IPC — Auth
ipcMain.handle('auth:startDevice', async () => {
  try { return (await axios.post(`${API_URL}/auth/device`, {}, {timeout:10000})).data; }
  catch (e) { return {ok:false, error: e.response?.data?.error || e.message}; }
});
ipcMain.handle('auth:pollDevice', async (_e, userCode) => {
  try {
    const result = (await axios.post(`${API_URL}/auth/poll`, {user_code:userCode}, {timeout:10000})).data;
    if (result.ok && result.profile?.uuid) {
      const accounts = store.get('accounts',[]);
      const idx = accounts.findIndex(a => a.uuid === result.profile.uuid);
      const entry = {...result.profile, addedAt:Date.now()};
      if (idx >= 0) accounts[idx] = entry; else accounts.push(entry);
      store.set('accounts', accounts);
      store.set('selectedAccount', result.profile.uuid);
    }
    return result;
  } catch (e) { return {ok:false, error: e.response?.data?.error || e.message}; }
});

// IPC — Accounts
ipcMain.handle('accounts:list',   () => store.get('accounts',[]));
ipcMain.handle('accounts:select', (_e, uuid) => { store.set('selectedAccount', uuid); return {ok:true}; });
ipcMain.handle('accounts:delete', (_e, uuid) => {
  store.set('accounts', store.get('accounts',[]).filter(a => a.uuid !== uuid));
  if (store.get('selectedAccount') === uuid) store.delete('selectedAccount');
  return {ok:true};
});

// IPC — Cosméticos
ipcMain.handle('cosmetics:list',     () => store.get('cosmetics',[]));
ipcMain.handle('cosmetics:equip',    (_e, id) => { store.set('equippedCosmetic', id); return {ok:true}; });
ipcMain.handle('cosmetics:unequip',  () => { store.delete('equippedCosmetic'); return {ok:true}; });
ipcMain.handle('cosmetics:equipped', () => store.get('equippedCosmetic', null));

// IPC — Dialog / Shell
ipcMain.handle('dialog:openDir', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {properties:['openDirectory']});
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:open', (_e, url) => shell.openExternal(url));

// IPC — Updater
ipcMain.handle('updater:check',   async () => autoUpdater ? autoUpdater.checkForUpdates().catch(()=>null) : null);
ipcMain.handle('updater:download',async () => autoUpdater ? autoUpdater.downloadUpdate().catch(()=>null) : null);
ipcMain.handle('updater:install', async () => { if (autoUpdater) autoUpdater.quitAndInstall(false,true); return {ok:!!autoUpdater}; });

if (autoUpdater) {
  autoUpdater.on('update-available',    info => mainWindow?.webContents.send('updater:available', info));
  autoUpdater.on('update-not-available',info => mainWindow?.webContents.send('updater:notAvailable', info));
  autoUpdater.on('download-progress',   prog => mainWindow?.webContents.send('updater:progress', prog));
  autoUpdater.on('update-downloaded',   info => mainWindow?.webContents.send('updater:ready', info));
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

process.on('uncaughtException', err => log.error('uncaughtException', err));
process.on('unhandledRejection', err => log.error('unhandledRejection', err));
