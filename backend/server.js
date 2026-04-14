'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app  = express();
const PORT = process.env.PORT || 3001;

const GH_RELEASES_API  = 'https://api.github.com/repos/ksbots/aether-client/releases/latest';
const GH_RELEASES_PAGE = 'https://github.com/ksbots/aether-client/releases';

const LAUNCHER_VERSION = {
  version:   '2.1.1',
  build:     '20240415',
  channel:   'stable',
  changelog: 'Fabric + mods automáticos, cosméticos, tema dual, redesign do site',
  downloads: {
    windows: GH_RELEASES_PAGE,
    mac:     GH_RELEASES_PAGE,
    linux:   GH_RELEASES_PAGE,
    android: GH_RELEASES_PAGE
  }
};

const MS_CLIENT_ID  = process.env.MS_CLIENT_ID  || '00000000402b5328';
const MS_TENANT_ID  = process.env.MS_TENANT_ID  || 'consumers';
const MS_DEVICE_URL = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/devicecode`;
const MS_TOKEN_URL  = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
const MS_SCOPE      = 'XboxLive.signin offline_access';

// ── CORS ────────────────────────────────────────────────────────
// CORREÇÃO: adicionado suporte a origin 'null' (Electron file://)
// e wildcard de desenvolvimento local
app.use(cors({
  origin(origin, callback) {
    const allowed = new Set([
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://ksbots.github.io',
      'https://ksbots.github.io/aether-client',
      'https://ksbots.github.io/aether-client/'
    ]);
    // origin null = Electron (file://) ou curl sem header
    if (!origin || origin === 'null' || allowed.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin não permitida: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ── GET / ────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({
  name:      'Aether Client API',
  version:   '1.0.1',
  status:    'online',
  endpoints: ['/status', '/version', '/auth/device', '/auth/poll', '/cosmetics']
}));

// ── GET /version ─────────────────────────────────────────────────
app.get('/version', async (_req, res) => {
  try {
    const ghRes = await axios.get(GH_RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      timeout: 5000
    });
    const release = ghRes.data || {};
    const tag     = release.tag_name || `v${LAUNCHER_VERSION.version}`;
    const version = String(tag).replace(/^v/, '');
    const assets  = Array.isArray(release.assets) ? release.assets : [];
    const pick    = (rx) => assets.find(a => rx.test(a.name || ''))?.browser_download_url || GH_RELEASES_PAGE;

    return res.json({
      ...LAUNCHER_VERSION,
      version,
      tag,
      releaseDate:        release.published_at || null,
      releaseUrl:         release.html_url || GH_RELEASES_PAGE,
      downloadsAvailable: assets.length > 0,
      downloads: {
        windows: pick(/\.exe$/i),
        mac:     pick(/\.(dmg|pkg)$/i),
        linux:   pick(/\.(AppImage|deb|rpm|tar\.gz)$/i),
        android: pick(/\.(apk|zip)$/i)
      }
    });
  } catch {
    return res.json({
      ...LAUNCHER_VERSION,
      source:             'local',
      releaseUrl:         GH_RELEASES_PAGE,
      downloadsAvailable: false
    });
  }
});

// ── GET /status ──────────────────────────────────────────────────
app.get('/status', async (_req, res) => {
  const services = [
    { id: 'auth',    name: 'Auth Server',     url: 'https://authserver.mojang.com/'                    },
    { id: 'session', name: 'Session Server',  url: 'https://sessionserver.mojang.com/'                 },
    { id: 'api',     name: 'Mojang API',      url: 'https://api.mojang.com/'                           },
    { id: 'ms',      name: 'Microsoft Login', url: 'https://login.microsoftonline.com/'                },
    { id: 'mc',      name: 'MC Services',     url: 'https://api.minecraftservices.com/'                },
    { id: 'assets',  name: 'Asset CDN',       url: 'https://resources.download.minecraft.net/'         }
  ];

  const results = await Promise.allSettled(services.map(async svc => {
    const start = Date.now();
    await axios.head(svc.url, { timeout: 5000 });
    return { ...svc, status: 'online', latency: Date.now() - start };
  }));

  const statuses = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { ...services[i], status: 'offline', latency: null }
  );

  res.json({
    overall:   statuses.every(s => s.status === 'online') ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    services:  statuses
  });
});

// ── POST /auth/device ────────────────────────────────────────────
const deviceCodeStore = new Map();
setInterval(() => {
  const now = Date.now();
  deviceCodeStore.forEach((v, k) => { if (v.expires_at < now) deviceCodeStore.delete(k); });
}, 60_000);

app.post('/auth/device', async (_req, res) => {
  try {
    const response = await axios.post(
      MS_DEVICE_URL,
      new URLSearchParams({ client_id: MS_CLIENT_ID, scope: MS_SCOPE }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );
    const { device_code, user_code, verification_uri, expires_in, interval, message } = response.data;
    deviceCodeStore.set(user_code, { device_code, expires_at: Date.now() + expires_in * 1000 });
    return res.json({ ok: true, user_code, verification_uri, expires_in, interval, message });
  } catch (e) {
    console.error('[/auth/device]', e.response?.data || e.message);
    return res.status(500).json({ ok: false, error: 'Falha ao iniciar autenticação Microsoft.' });
  }
});

// ── POST /auth/poll ──────────────────────────────────────────────
app.post('/auth/poll', async (req, res) => {
  const { user_code } = req.body;
  if (!user_code) return res.status(400).json({ ok: false, error: 'user_code obrigatório.' });

  const stored = deviceCodeStore.get(user_code);
  if (!stored)                    return res.status(404).json({ ok: false, error: 'Código expirado ou inválido.' });
  if (stored.expires_at < Date.now()) {
    deviceCodeStore.delete(user_code);
    return res.status(410).json({ ok: false, error: 'Código expirado.' });
  }

  try {
    const response = await axios.post(
      MS_TOKEN_URL,
      new URLSearchParams({
        client_id:   MS_CLIENT_ID,
        grant_type:  'urn:ietf:params:oauth:grant-type:device_code',
        device_code: stored.device_code
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );
    const { access_token, refresh_token } = response.data;
    deviceCodeStore.delete(user_code);
    const profile = await _getMinecraftProfile(access_token);
    return res.json({ ok: true, profile, refresh_token });
  } catch (e) {
    const err = e.response?.data?.error;
    if (err === 'authorization_pending')  return res.json({ ok: false, pending: true });
    if (err === 'slow_down')              return res.json({ ok: false, pending: true, slowDown: true });
    if (err === 'authorization_declined') return res.json({ ok: false, error: 'Login cancelado pelo usuário.' });
    if (err === 'expired_token')          return res.json({ ok: false, error: 'Código expirado.' });
    console.error('[/auth/poll]', e.response?.data || e.message);
    return res.status(500).json({ ok: false, error: 'Erro ao verificar autenticação.' });
  }
});

// ── GET /cosmetics — lista de cosméticos disponíveis ─────────────
// Em produção, migrar para banco de dados
const COSMETICS_CATALOG = [
  { id: 'cape_aether',    category: 'capes',     name: 'Capa Aether',      rarity: 'exclusive', unlocked: true  },
  { id: 'cape_void',      category: 'capes',     name: 'Capa Void',        rarity: 'rare',      unlocked: false },
  { id: 'wings_angel',    category: 'wings',     name: 'Asas Anjo',        rarity: 'epic',      unlocked: false },
  { id: 'wings_demon',    category: 'wings',     name: 'Asas Demônio',     rarity: 'epic',      unlocked: false },
  { id: 'hat_crown',      category: 'hats',      name: 'Coroa Real',       rarity: 'legendary', unlocked: false },
  { id: 'hat_beanie',     category: 'hats',      name: 'Gorro Aether',     rarity: 'common',    unlocked: true  },
  { id: 'mask_bandana',   category: 'masks',     name: 'Bandana Ninja',    rarity: 'rare',      unlocked: false },
  { id: 'mask_skull',     category: 'masks',     name: 'Máscara Caveira',  rarity: 'epic',      unlocked: false },
  { id: 'emote_wave',     category: 'emotes',    name: 'Aceno',            rarity: 'common',    unlocked: true  },
  { id: 'emote_dance',    category: 'emotes',    name: 'Dança',            rarity: 'rare',      unlocked: false },
  { id: 'badge_founder',  category: 'badges',    name: 'Badge Fundador',   rarity: 'legendary', unlocked: false },
  { id: 'badge_early',    category: 'badges',    name: 'Early Adopter',    rarity: 'epic',      unlocked: false }
];

app.get('/cosmetics', (_req, res) => {
  res.json({ ok: true, cosmetics: COSMETICS_CATALOG });
});

// ── Perfil Minecraft via Xbox Live ──────────────────────────────
async function _getMinecraftProfile(msAccessToken) {
  const xblRes = await axios.post('https://user.auth.xboxlive.com/user/authenticate', {
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msAccessToken}` },
    RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT'
  }, { headers: { 'Content-Type': 'application/json' } });

  const xstsRes = await axios.post('https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xblRes.data.Token] },
    RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT'
  }, { headers: { 'Content-Type': 'application/json' } });

  const uhs  = xstsRes.data.DisplayClaims.xui[0].uhs;
  const xsts = xstsRes.data.Token;

  const mcRes = await axios.post('https://api.minecraftservices.com/authentication/login_with_xbox',
    { identityToken: `XBL3.0 x=${uhs};${xsts}` },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const profRes = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${mcRes.data.access_token}` }
  });

  return { uuid: profRes.data.id, username: profRes.data.name, skin: profRes.data.skins?.[0]?.url };
}

// ── Handlers de erro ─────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
app.use((err, _req, res, _next) => {
  console.error('[Global Error]', err.message);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Aether Backend rodando em http://localhost:${PORT}`);
  console.log(`   Endpoints: /status  /version  /auth/device  /auth/poll  /cosmetics\n`);
});
