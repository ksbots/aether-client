'use strict';

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { Client, Authenticator } = require('minecraft-launcher-core');
const fetch  = require('node-fetch');

// ─── Constants ────────────────────────────────────────────
const IS_DEV   = process.argv.includes('--dev');
const ROOT_DIR = app.getPath('userData');
const MC_DIR   = path.join(ROOT_DIR, '.minecraft');
const MODS_DIR = path.join(MC_DIR, 'mods');
const CFG_FILE = path.join(ROOT_DIR, 'config.json');
const ACC_FILE = path.join(ROOT_DIR, 'accounts.json');
const BACKEND  = 'https://aether-backend.onrender.com';

// Fabric loader version compatible with 1.8.9 (LegacyFabric)
const LEGACY_FABRIC_META = 'https://meta.legacyfabric.net/v2';
const FABRIC_META        = 'https://meta.fabricmc.net/v2';
const AETHER_MOD_URL     = 'https://github.com/AetherVexClient/aethervex-mod/releases/download/v1.0.0/aethervex-1.0.0.jar';
// Fallback: we use the local jar bundled in assets/
const AETHER_MOD_LOCAL   = path.join(__dirname, 'assets', 'mods', 'aethervex.jar');

let win = null;
let gameProcess = null;

// ─── App lifecycle ─────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function createWindow () {
  win = new BrowserWindow({
    width:  1100,
    height: 680,
    minWidth:  900,
    minHeight: 580,
    frame: false,
    transparent: false,
    backgroundColor: '#03020e',
    icon: path.join(__dirname, 'assets', 'icons', 'app-icon.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webviewTag:       false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  if (IS_DEV) win.webContents.openDevTools({ mode: 'detach' });

  win.on('closed', () => { win = null; });
}

// ─── IPC: window controls ──────────────────────────────────
ipcMain.handle('minimize-window', () => win?.minimize());
ipcMain.handle('close-window',    () => app.quit());
ipcMain.handle('open-store',      () => shell.openExternal('https://ksbots.github.io/aether-client/store/'));

// ─── IPC: config ──────────────────────────────────────────
ipcMain.handle('load-config', () => {
  try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); }
  catch { return {}; }
});
ipcMain.handle('save-config', (_e, cfg) => {
  fs.mkdirSync(ROOT_DIR, { recursive: true });
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));
  return { ok: true };
});

// ─── IPC: accounts ────────────────────────────────────────
function readAccounts () {
  try { return JSON.parse(fs.readFileSync(ACC_FILE, 'utf8')); }
  catch { return []; }
}
function writeAccounts (accs) {
  fs.mkdirSync(ROOT_DIR, { recursive: true });
  fs.writeFileSync(ACC_FILE, JSON.stringify(accs, null, 2));
}

ipcMain.handle('load-accounts',    () => readAccounts());
ipcMain.handle('add-account',      (_e, acc) => { const a = readAccounts().filter(x => x.uuid !== acc.uuid); a.unshift(acc); writeAccounts(a); return a; });
ipcMain.handle('remove-account',   (_e, uuid) => { const a = readAccounts().filter(x => x.uuid !== uuid); writeAccounts(a); return a; });
ipcMain.handle('add-offline-account', (_e, username) => {
  const uuid = 'offline-' + username.toLowerCase().replace(/\s/g, '_');
  const acc  = { uuid, username, type: 'offline', addedAt: Date.now() };
  const existing = readAccounts().filter(x => x.uuid !== uuid);
  existing.unshift(acc);
  writeAccounts(existing);
  return { accounts: existing, account: acc };
});

// ─── IPC: Microsoft Device Auth ───────────────────────────
let msmc = null;
try { msmc = require('msmc'); } catch { /* optional */ }

ipcMain.handle('ms-device-start', async () => {
  if (!msmc) return { error: 'msmc não instalado. Execute npm install msmc' };
  try {
    const flow = await msmc.createDeviceCode();
    global._msFlow = flow;
    return {
      user_code:         flow.user_code,
      device_code:       flow.device_code,
      verification_uri:  flow.verification_uri,
      expires_in:        flow.expires_in,
      interval:          flow.interval,
    };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('ms-device-poll', async (_e, device_code) => {
  if (!msmc || !global._msFlow) return { status: 'pending' };
  try {
    const token = await msmc.checkDeviceCode(global._msFlow);
    if (!token) return { status: 'pending' };
    const profile = await msmc.getProfile(token.access_token);
    const acc = {
      uuid:         profile.id,
      username:     profile.name,
      type:         'microsoft',
      accessToken:  token.access_token,
      refreshToken: token.refresh_token,
      role:         'MEMBER',
      addedAt:      Date.now(),
    };
    const existing = readAccounts().filter(x => x.uuid !== acc.uuid);
    existing.unshift(acc);
    writeAccounts(existing);
    global._msFlow = null;
    return { status: 'authorized', ...acc };
  } catch (e) {
    if (e.message?.includes('expired') || e.message?.includes('declined')) return { status: 'expired' };
    return { status: 'pending' };
  }
});

// ─── IPC: java check ──────────────────────────────────────
ipcMain.handle('check-java', async () => {
  const { execSync } = require('child_process');
  const totalRAM = Math.round(os.totalmem() / 1024 / 1024);
  const candidates = [
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    'java',
    '/usr/bin/java',
    '/usr/local/bin/java',
    'C:\\Program Files\\Java\\jre1.8.0_431\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jre-17.0.11.9-hotspot\\bin\\java.exe',
  ].filter(Boolean);

  for (const java of candidates) {
    try {
      const out = execSync(`"${java}" -version 2>&1`, { timeout: 5000 }).toString();
      const match = out.match(/version "([^"]+)"/);
      const version = match ? match[1] : 'unknown';
      return { path: java, version, systemRAM: totalRAM };
    } catch { /* try next */ }
  }
  return { path: null, error: 'Java não encontrado. Instale Java 8 ou superior.', systemRAM: totalRAM };
});

// ─── IPC: launch game ────────────────────────────────────
ipcMain.handle('launch', async (_e, account, opts) => {
  if (gameProcess) return { error: 'Jogo já está em execução.' };

  const version = opts.version || '1.8.9';
  const ram     = opts.ram     || '2G';

  try {
    // 1. Ensure dirs
    [MC_DIR, MODS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

    // 2. Download AetherVex mod jar if needed
    const modDest = path.join(MODS_DIR, 'aethervex.jar');
    if (!fs.existsSync(modDest)) {
      sendProgress('Baixando AetherVex Mod...', 10);
      const downloaded = await downloadMod(modDest);
      if (!downloaded) {
        // If download fails and local exists, copy it
        if (fs.existsSync(AETHER_MOD_LOCAL)) {
          fs.copyFileSync(AETHER_MOD_LOCAL, modDest);
        } else {
          // Create a placeholder (game will still load without the mod)
          console.warn('[AetherVex] Mod JAR not found — game will launch without mod.');
        }
      }
    }

    // 3. Build auth object
    let auth;
    if (account.type === 'microsoft' && account.accessToken) {
      auth = {
        access_token: account.accessToken,
        client_token: account.uuid,
        uuid:         account.uuid,
        name:         account.username,
        meta:         { type: 'msa', demo: false },
        user_properties: {},
      };
    } else {
      auth = Authenticator.getAuth(account.username);
      auth.uuid = account.uuid || auth.uuid;
    }

    // 4. Determine loader
    sendProgress('Configurando Fabric/LegacyFabric...', 25);
    let loaderVersion = null;
    let gameVersion   = version;

    if (version === '1.8.9') {
      // LegacyFabric for 1.8.9
      loaderVersion = await getLatestLegacyFabricLoader(version);
      if (loaderVersion) {
        gameVersion = `fabric-loader-${loaderVersion}-${version}`;
      }
    } else {
      // Modern Fabric
      loaderVersion = await getLatestFabricLoader(version);
      if (loaderVersion) {
        gameVersion = `fabric-loader-${loaderVersion}-${version}`;
      }
    }

    sendProgress('Preparando Minecraft ' + version + '...', 40);

    // 5. Launch with minecraft-launcher-core
    const launcher = new Client();

    launcher.on('debug',    m  => console.log('[MC]', m));
    launcher.on('data',     dt => console.log('[MC]', dt));
    launcher.on('progress', p  => {
      const pct = Math.round((p.current / Math.max(p.total, 1)) * 60) + 40;
      sendProgress(`${p.type}: ${p.task} (${p.current}/${p.total})`, Math.min(pct, 95));
    });
    launcher.on('close', code => {
      console.log('[AetherVex] Game closed, exit code:', code);
      gameProcess = null;
      win?.webContents.send('game-closed', { code });
    });

    const launchOpts = {
      authorization: auth,
      root: MC_DIR,
      version: {
        number:  version,
        type:    'release',
        custom:  loaderVersion ? gameVersion : undefined,
      },
      memory: {
        max: ram,
        min: '512M',
      },
      javaPath: opts.javaPath || undefined,
      customArgs: [
        '-Dfml.ignorePatchDiscrepancies=true',
        '-Dfml.ignoreInvalidMinecraftCertificates=true',
      ],
    };

    sendProgress('Iniciando Minecraft...', 97);

    gameProcess = await launcher.launch(launchOpts);

    // Hide launcher window while game runs (optional)
    // win?.hide();

    sendProgress('Minecraft em execução!', 100);
    return { ok: true };

  } catch (err) {
    console.error('[AetherVex] Launch error:', err);
    gameProcess = null;
    win?.webContents.send('launch-error', { error: err.message || String(err) });
    return { error: err.message || String(err) };
  }
});

// ─── Helpers ──────────────────────────────────────────────
function sendProgress (step, percent) {
  win?.webContents.send('launch-progress', { step, percent });
}

async function downloadMod (dest) {
  try {
    const res = await fetch(AETHER_MOD_URL, { timeout: 30000 });
    if (!res.ok) return false;
    const buf = await res.buffer();
    fs.writeFileSync(dest, buf);
    return true;
  } catch { return false; }
}

async function getLatestLegacyFabricLoader (mcVersion) {
  try {
    const res  = await fetch(`${LEGACY_FABRIC_META}/versions/loader/${mcVersion}`, { timeout: 10000 });
    const data = await res.json();
    return data[0]?.loader?.version || null;
  } catch { return null; }
}

async function getLatestFabricLoader (mcVersion) {
  try {
    const res  = await fetch(`${FABRIC_META}/versions/loader/${mcVersion}`, { timeout: 10000 });
    const data = await res.json();
    return data[0]?.loader?.version || null;
  } catch { return null; }
}
