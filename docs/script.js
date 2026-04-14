'use strict';

/* ================================================================
   AETHER CLIENT — Site Oficial Script (docs/)
   - Downloads reais via GitHub Releases API
   - Status Mojang em tempo real
   - Particles, reveal, counters
================================================================ */

const GH_USER   = 'ksbots';
const GH_REPO   = 'aether-client';
const GH_PAGE   = `https://github.com/${GH_USER}/${GH_REPO}/releases`;
const GH_API    = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/releases/latest`;

/* URLs base dos assets — ajuste ao publicar releases reais */
const ASSET_BASE = GH_PAGE; // fallback: página de releases

const DEFAULT_DL = {
  windows: GH_PAGE,
  mac:     GH_PAGE,
  linux:   GH_PAGE,
  android: GH_PAGE
};

const PLATFORM_INFO = {
  windows: { label: 'Download para Windows', badge: 'EXE'      },
  mac:     { label: 'Download para macOS',   badge: 'DMG'      },
  linux:   { label: 'Download para Linux',   badge: 'AppImage' },
  android: { label: 'Download para Android', badge: 'ZIP'      }
};

let currentDL = { ...DEFAULT_DL };

/* ── OS detection ────────────────────────────────────────────── */
function detectOS() {
  const ua  = navigator.userAgent.toLowerCase();
  const pf  = (navigator.platform || '').toLowerCase();
  if (/android/.test(ua))               return 'android';
  if (/iphone|ipad/.test(ua))           return 'mac';
  if (/win/.test(ua) || /win/.test(pf)) return 'windows';
  if (/mac/.test(ua) || /mac/.test(pf)) return 'mac';
  if (/linux/.test(ua))                 return 'linux';
  return 'windows';
}

/* ── fetch helper ────────────────────────────────────────────── */
async function fetchJSON(url, opts = {}, ms = 8000) {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ac.signal });
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ── parse assets from GitHub release ────────────────────────── */
function parseAssets(assets = []) {
  const find = (rx) => assets.find(a => rx.test(a.name || ''))?.browser_download_url || GH_PAGE;
  return {
    windows: find(/\.exe$/i),
    mac:     find(/\.(dmg|pkg)$/i),
    linux:   find(/\.(AppImage|deb|rpm|tar\.gz)$/i),
    android: find(/\.(apk|zip)$/i)
  };
}

/* ── apply downloads to DOM ──────────────────────────────────── */
function applyDownloads(vd) {
  currentDL = { ...DEFAULT_DL, ...(vd?.downloads || {}) };

  const os   = detectOS();
  const info = PLATFORM_INFO[os] || PLATFORM_INFO.windows;

  /* Hero main button */
  setHref('main-dl',      currentDL[os]);
  setText('main-dl-label', info.label);
  setText('main-dl-badge', info.badge);

  /* Alt buttons + footer */
  const map = {
    'alt-win':     currentDL.windows,
    'alt-mac':     currentDL.mac,
    'alt-linux':   currentDL.linux,
    'android-dl':  currentDL.android,
    'pc-win-dl':   currentDL.windows,
    'pc-mac-dl':   currentDL.mac,
    'pc-linux-dl': currentDL.linux,
    'fl-win':      currentDL.windows,
    'fl-mac':      currentDL.mac,
    'fl-linux':    currentDL.linux,
    'fl-android':  currentDL.android,
  };
  Object.entries(map).forEach(([id, href]) => setHref(id, href));

  /* Active state on alt buttons */
  ['windows','mac','linux'].forEach(p => {
    const el = document.getElementById(`alt-${p === 'windows' ? 'win' : p}`);
    if (el) el.classList.toggle('active', p === os);
  });

  /* Badge text */
  if (vd?.version) {
    setText('badge-text', `v${vd.version} — Fabric · Mods Automáticos · Cosméticos`);
  }

  /* Version note */
  const note = document.getElementById('dl-note');
  if (note) {
    if (vd?.version) {
      const date = vd.releaseDate ? new Date(vd.releaseDate).toLocaleDateString('pt-BR') : '';
      note.textContent = `Versão ${vd.version}${date ? ` · Lançado ${date}` : ''}`;
    } else {
      note.textContent = 'Release ainda não publicada — veja a página de releases.';
    }
  }
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  el.href = href || GH_PAGE;
  if (/^https?:/i.test(el.href)) {
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  }
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ── fetch version from GH API ───────────────────────────────── */
async function loadVersion() {
  try {
    const gh      = await fetchJSON(GH_API, { headers: { Accept: 'application/vnd.github+json' } });
    const tag     = gh.tag_name || '';
    const version = tag.replace(/^v/, '');
    applyDownloads({
      version,
      tag,
      releaseDate: gh.published_at,
      releaseUrl:  gh.html_url,
      downloads:   parseAssets(gh.assets)
    });
  } catch {
    applyDownloads(null);
  }
}

/* ── status ──────────────────────────────────────────────────── */
async function checkStatus() {
  const grid = document.getElementById('status-grid');
  const ts   = document.getElementById('status-ts');
  if (!grid) return;

  const services = [
    { id:'auth',    name:'Auth Server',     url:'https://authserver.mojang.com/'          },
    { id:'session', name:'Session Server',  url:'https://sessionserver.mojang.com/'       },
    { id:'api',     name:'Mojang API',      url:'https://api.mojang.com/'                 },
    { id:'ms',      name:'Microsoft Login', url:'https://login.microsoftonline.com/'      },
    { id:'mc',      name:'MC Services',     url:'https://api.minecraftservices.com/'      },
    { id:'assets',  name:'Asset CDN',       url:'https://resources.download.minecraft.net/'}
  ];

  /* Show checking state */
  grid.innerHTML = services.map(s => `
    <div class="svc-card">
      <div class="svc-led checking"></div>
      <div>
        <div class="svc-name">${s.name}</div>
        <div class="svc-url">${s.url.replace('https://','').replace(/\/$/,'')}</div>
        <div class="svc-stat">Verificando...</div>
      </div>
    </div>`).join('');

  /* Probe each service via no-cors (status 0 = reachable) */
  const results = await Promise.allSettled(services.map(async svc => {
    const t0  = Date.now();
    try {
      await fetch(svc.url, { method:'HEAD', mode:'no-cors', signal: AbortSignal.timeout(5000) });
      return { ...svc, status:'online', latency: Date.now() - t0 };
    } catch {
      return { ...svc, status:'offline', latency: null };
    }
  }));

  const statuses = results.map(r => r.status === 'fulfilled' ? r.value : { status:'offline', latency:null });

  grid.innerHTML = statuses.map(s => `
    <div class="svc-card">
      <div class="svc-led ${s.status}"></div>
      <div>
        <div class="svc-name">${s.name}</div>
        <div class="svc-url">${s.url.replace('https://','').replace(/\/$/,'')}</div>
        <div class="svc-stat">${s.status === 'online'
          ? `Online${s.latency != null ? ` · ${s.latency}ms` : ''}`
          : 'Offline'}</div>
      </div>
    </div>`).join('');

  if (ts) ts.textContent = `Última verificação: ${new Date().toLocaleTimeString('pt-BR')}`;
}

/* ── reveal on scroll ────────────────────────────────────────── */
function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = Number(e.target.dataset.delay || 0) * 100;
      setTimeout(() => e.target.classList.add('revealed'), delay);
      io.unobserve(e.target);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
}

/* ── number counters ─────────────────────────────────────────── */
function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const end = Number(el.dataset.count || 0);
      if (!end) return;
      let v = 0;
      const step = Math.max(1, Math.ceil(end / 60));
      const t = setInterval(() => {
        v = Math.min(v + step, end);
        el.textContent = end >= 1000 ? `${Math.round(v/1000)}K+` : String(v);
        if (v >= end) clearInterval(t);
      }, 16);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}

/* ── navbar ──────────────────────────────────────────────────── */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const mob    = document.getElementById('mob-menu');
  if (!nav || !burger || !mob) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  burger.addEventListener('click', () => {
    const open = !mob.hidden;
    mob.hidden = open;
    burger.setAttribute('aria-expanded', String(!open));
    burger.classList.toggle('open', !open);
  });
}

function closeBurger() {
  const mob    = document.getElementById('mob-menu');
  const burger = document.getElementById('burger');
  if (mob) mob.hidden = true;
  if (burger) { burger.setAttribute('aria-expanded','false'); burger.classList.remove('open'); }
}
window.closeBurger = closeBurger;

/* ── particles ───────────────────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  if (window.innerWidth < 600 || window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    canvas.style.display = 'none'; return;
  }

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, pts = [], raf = 0;

  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  const build  = () => Array.from({length:80}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: Math.random()*1.5+.2,
    vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25,
    a: Math.random()*.5+.08
  }));

  const draw = () => {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(99,102,241,${p.a})`; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    raf = requestAnimationFrame(draw);
  };

  resize(); pts = build(); draw();
  window.addEventListener('resize', () => { resize(); pts = build(); }, { passive:true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else draw();
  });
}

/* ── init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initCounters();
  initParticles();
  applyDownloads(null); // default state imediato
  loadVersion();        // atualiza com release real
  checkStatus();
  setInterval(checkStatus, 60_000);
});
