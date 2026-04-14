'use strict';

/* ================================================================
   AETHER CLIENT — Frontend Script (Launcher Desktop)
================================================================ */

const API_URL   = 'http://localhost:3001';
const GH_PAGE   = 'https://github.com/ksbots/aether-client/releases';
const isElectron = typeof window !== 'undefined' && !!window.aether;

/* ── Cosmetics catalog (fallback local, override pelo backend) ─── */
const COSMETICS_LOCAL = [
  { id:'cape_aether',   category:'capes',   name:'Capa Aether',     rarity:'exclusive', unlocked:true,  icon:'🌊' },
  { id:'cape_void',     category:'capes',   name:'Capa Void',       rarity:'rare',      unlocked:false, icon:'🌑' },
  { id:'wings_angel',  category:'wings',   name:'Asas Anjo',       rarity:'epic',      unlocked:false, icon:'🪶' },
  { id:'wings_demon',  category:'wings',   name:'Asas Demônio',    rarity:'epic',      unlocked:false, icon:'😈' },
  { id:'hat_crown',    category:'hats',    name:'Coroa Real',      rarity:'legendary', unlocked:false, icon:'👑' },
  { id:'hat_beanie',   category:'hats',    name:'Gorro Aether',    rarity:'common',    unlocked:true,  icon:'🎩' },
  { id:'mask_bandana', category:'masks',   name:'Bandana Ninja',   rarity:'rare',      unlocked:false, icon:'🎭' },
  { id:'mask_skull',   category:'masks',   name:'Máscara Caveira', rarity:'epic',      unlocked:false, icon:'💀' },
  { id:'emote_wave',   category:'emotes',  name:'Aceno',           rarity:'common',    unlocked:true,  icon:'👋' },
  { id:'emote_dance',  category:'emotes',  name:'Dança',           rarity:'rare',      unlocked:false, icon:'🕺' },
  { id:'badge_founder',category:'badges',  name:'Badge Fundador',  rarity:'legendary', unlocked:false, icon:'🏅' },
  { id:'badge_early',  category:'badges',  name:'Early Adopter',   rarity:'epic',      unlocked:false, icon:'⭐' },
];

const RARITY_ORDER = { common:0, rare:1, epic:2, legendary:3, exclusive:4 };
const RARITY_LABEL = { common:'Comum', rare:'Raro', epic:'Épico', legendary:'Lendário', exclusive:'Exclusivo' };
const CATEGORY_LABEL = { capes:'Capa', wings:'Asas', hats:'Chapéu', masks:'Máscara', emotes:'Emote', badges:'Badge' };

/* ── State ──────────────────────────────────────────────────────── */
let state = {
  page:            'home',
  accounts:        [],
  selectedAccount: null,
  cosmetics:       [...COSMETICS_LOCAL],
  equippedCosmetic:null,
  selectedCosmetic:null,
  cosFilter:       'all',
  config:          { ram: '4096', version: '1.20.1', mcDir: '' },
  launching:       false,
};

/* ════════════════════════════════════════════════════════════════
   NAVIGATION
═════════════════════════════════════════════════════════════════ */
function setPage(page) {
  state.page = page;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  document.querySelectorAll('.sb-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  if (page === 'home')      renderHome();
  if (page === 'accounts')  renderAccounts();
  if (page === 'cosmetics') renderCosmetics();
}
window.setPage = setPage;

/* ════════════════════════════════════════════════════════════════
   TITLEBAR — maximize toggle
═════════════════════════════════════════════════════════════════ */
async function toggleMaximize() {
  if (!isElectron) return;
  await window.aether.window.maximize();
  const isMax = await window.aether.window.isMaximized();
  const btn = document.getElementById('btn-maximize');
  if (btn) btn.textContent = isMax ? '❐' : '□';
}
window.toggleMaximize = toggleMaximize;

/* ════════════════════════════════════════════════════════════════
   CONFIG
═════════════════════════════════════════════════════════════════ */
async function loadConfig() {
  if (isElectron) {
    const cfg = await window.aether.config.get();
    if (cfg.ram)        state.config.ram     = cfg.ram;
    if (cfg.version)    state.config.version = cfg.version;
    if (cfg.mcDir)      state.config.mcDir   = cfg.mcDir;
    if (cfg.selectedAccount) state.selectedAccount = cfg.selectedAccount;
  }
  const ramSel = document.getElementById('ram-select');
  const verSel = document.getElementById('ver-select');
  if (ramSel) ramSel.value = state.config.ram;
  if (verSel) verSel.value = state.config.version;
}

async function saveConfig() {
  const ramSel = document.getElementById('ram-select');
  const verSel = document.getElementById('ver-select');
  state.config.ram     = ramSel?.value || '4096';
  state.config.version = verSel?.value || '1.20.1';
  if (isElectron) {
    await window.aether.config.set({ ram: state.config.ram, version: state.config.version });
  }
}
window.saveConfig = saveConfig;

async function chooseMcDir() {
  if (!isElectron) { showToast('Disponível apenas no launcher desktop.'); return; }
  const dir = await window.aether.dialog.openDir();
  if (dir) {
    state.config.mcDir = dir;
    await window.aether.config.set({ mcDir: dir });
    const el = document.getElementById('mc-dir-val');
    if (el) el.textContent = dir;
    showToast('Diretório salvo!');
  }
}
window.chooseMcDir = chooseMcDir;

function selectVersion(ver) {
  state.config.version = ver;
  const verSel = document.getElementById('ver-select');
  if (verSel) verSel.value = ver;
  if (isElectron) window.aether.config.set({ version: ver });
  showToast(`Versão ${ver} selecionada.`);
}
window.selectVersion = selectVersion;

/* ════════════════════════════════════════════════════════════════
   HOME
═════════════════════════════════════════════════════════════════ */
function renderHome() {
  const acc = state.accounts.find(a => a.uuid === state.selectedAccount) || state.accounts[0] || null;

  const avatar = document.getElementById('hac-avatar');
  const name   = document.getElementById('hac-name');
  const type   = document.getElementById('hac-type');
  if (avatar) avatar.textContent = acc ? acc.username[0].toUpperCase() : '?';
  if (name)   name.textContent   = acc ? acc.username : 'Nenhuma conta';
  if (type)   type.textContent   = acc ? (acc.type === 'microsoft' ? '🔷 Microsoft (Original)' : '💀 Conta Offline') : 'Adicione uma conta para jogar';

  const greeting = document.getElementById('home-greeting');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  if (greeting) greeting.textContent = acc ? `${greet}, ${acc.username}! Pronto para jogar?` : 'Adicione uma conta para começar.';

  // Cosmético equipado
  const cos = state.cosmetics.find(c => c.id === state.equippedCosmetic);
  const hcpName = document.getElementById('hcp-name');
  if (hcpName) hcpName.textContent = cos ? `${cos.icon} ${cos.name}` : 'Nenhum';

  // Dir
  const dirEl = document.getElementById('mc-dir-val');
  if (dirEl && state.config.mcDir) dirEl.textContent = state.config.mcDir;
  const verEl = document.getElementById('cfg-launcher-ver');
  if (verEl) verEl.textContent = 'v2.1.1';
}

/* ════════════════════════════════════════════════════════════════
   LAUNCH GAME (simulação — em produção integrar com java-launcher)
═════════════════════════════════════════════════════════════════ */
async function launchGame() {
  if (state.launching) return;
  const acc = state.accounts.find(a => a.uuid === state.selectedAccount) || state.accounts[0];
  if (!acc) { showToast('⚠ Adicione uma conta antes de jogar.'); setPage('accounts'); return; }

  state.launching = true;
  const btn   = document.getElementById('btn-play');
  const label = document.getElementById('play-label');
  const log   = document.getElementById('launch-log');
  const logTxt= document.getElementById('log-text');
  if (btn)   btn.style.opacity = '.6';
  if (label) label.textContent = 'INICIANDO...';
  if (log)   log.hidden = false;

  const steps = [
    'Verificando Java 17...',
    `Preparando versão ${state.config.version}...`,
    'Baixando assets em falta...',
    'Verificando mods (Fabric)...',
    'Aplicando cosmético...',
    'Iniciando Minecraft...',
  ];

  for (const step of steps) {
    if (logTxt) logTxt.textContent = step;
    await new Promise(r => setTimeout(r, 600));
  }

  if (logTxt) logTxt.textContent = `✅ Minecraft ${state.config.version} iniciado — ${acc.username}`;
  if (label)  label.textContent = 'JOGANDO';

  setTimeout(() => {
    state.launching = false;
    if (btn)   btn.style.opacity = '';
    if (label) label.textContent = 'JOGAR';
    if (log)   log.hidden = true;
  }, 5000);
}
window.launchGame = launchGame;

/* ════════════════════════════════════════════════════════════════
   ACCOUNTS
═════════════════════════════════════════════════════════════════ */
async function loadAccounts() {
  if (isElectron) {
    state.accounts        = await window.aether.accounts.list() || [];
    const cfg             = await window.aether.config.get();
    state.selectedAccount = cfg.selectedAccount || state.accounts[0]?.uuid || null;
  }
}

function renderAccounts() {
  const list = document.getElementById('accounts-list');
  if (!list) return;

  if (!state.accounts.length) {
    list.innerHTML = '<p style="color:var(--txt2);font-size:13px;padding:8px 0">Nenhuma conta adicionada.</p>';
    return;
  }

  list.innerHTML = state.accounts.map(acc => `
    <div class="acc-item ${acc.uuid === state.selectedAccount ? 'selected-acc' : ''}">
      <div class="acc-avatar">${acc.username[0].toUpperCase()}</div>
      <div class="acc-info">
        <div class="acc-name">${acc.username}</div>
        <div class="acc-type">${acc.type === 'microsoft' ? '🔷 Microsoft (Original)' : '💀 Offline'}</div>
      </div>
      <div class="acc-actions">
        ${acc.uuid !== state.selectedAccount ? `<button class="acc-btn" onclick="selectAccount('${acc.uuid}')">Selecionar</button>` : '<span class="acc-btn" style="color:var(--ph)">✓ Ativa</span>'}
        <button class="acc-btn delete" onclick="deleteAccount('${acc.uuid}')">Remover</button>
      </div>
    </div>
  `).join('');
}

async function selectAccount(uuid) {
  state.selectedAccount = uuid;
  if (isElectron) await window.aether.accounts.select(uuid);
  renderAccounts();
  renderHome();
  showToast('Conta selecionada!');
}
window.selectAccount = selectAccount;

async function deleteAccount(uuid) {
  if (!confirm('Remover esta conta?')) return;
  state.accounts = state.accounts.filter(a => a.uuid !== uuid);
  if (state.selectedAccount === uuid) state.selectedAccount = state.accounts[0]?.uuid || null;
  if (isElectron) await window.aether.accounts.delete(uuid);
  renderAccounts();
  renderHome();
  showToast('Conta removida.');
}
window.deleteAccount = deleteAccount;

function showOfflineForm() {
  const form = document.getElementById('offline-form');
  if (form) { form.hidden = !form.hidden; }
}
window.showOfflineForm = showOfflineForm;

async function addOfflineAccount() {
  const input = document.getElementById('offline-nick');
  const nick  = input?.value?.trim();
  if (!nick || nick.length < 3) { showToast('⚠ Apelido deve ter ao menos 3 caracteres.'); return; }

  // UUID offline v5 simulado
  const uuid = 'offline-' + nick.toLowerCase().replace(/[^a-z0-9]/g,'') + '-' + Math.random().toString(36).slice(2,8);
  const acc  = { uuid, username: nick, type: 'offline', addedAt: Date.now() };

  state.accounts.push(acc);
  if (!state.selectedAccount) state.selectedAccount = uuid;

  if (isElectron) {
    const cfg = await window.aether.config.get();
    const accounts = [...(cfg.accounts || []), acc];
    await window.aether.config.set({ accounts, selectedAccount: state.selectedAccount });
  }

  if (input) input.value = '';
  const form = document.getElementById('offline-form');
  if (form) form.hidden = true;
  renderAccounts();
  renderHome();
  showToast(`Conta "${nick}" adicionada!`);
}
window.addOfflineAccount = addOfflineAccount;

/* ════════════════════════════════════════════════════════════════
   MICROSOFT LOGIN
═════════════════════════════════════════════════════════════════ */
let msPolling  = null;
let msUserCode = null;
let msInterval = 5;

async function openMicrosoftLogin() {
  showMsStep('code');
  const modal = document.getElementById('ms-modal');
  if (modal) { modal.hidden = false; document.body.style.overflow = 'hidden'; }

  const codeEl = document.getElementById('ms-code');
  const hintEl = document.getElementById('ms-hint');
  if (codeEl) codeEl.textContent = '• • • • • •';
  if (hintEl) hintEl.textContent = 'Solicitando código...';

  try {
    let data;
    if (isElectron && window.aether?.auth?.startDevice) {
      data = await window.aether.auth.startDevice();
    } else {
      const res = await fetch(`${API_URL}/auth/device`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      data = await res.json();
    }

    if (!data?.ok) throw new Error(data?.error || 'Falha ao obter código.');
    msUserCode = data.user_code;
    msInterval = data.interval || 5;
    if (codeEl) codeEl.textContent = data.user_code;
    const link = document.getElementById('ms-link');
    if (link) { link.href = data.verification_uri; link.textContent = `Abrir ${data.verification_uri} ↗`; }
    if (hintEl) hintEl.textContent = 'Aguardando você inserir o código...';
    startMsPolling();
  } catch (err) {
    showMsError(err.message);
  }
}
window.openMicrosoftLogin = openMicrosoftLogin;

function startMsPolling() {
  clearInterval(msPolling);
  msPolling = setInterval(async () => {
    if (!msUserCode) return;
    try {
      let data;
      if (isElectron && window.aether?.auth?.pollDevice) {
        data = await window.aether.auth.pollDevice(msUserCode);
      } else {
        const res = await fetch(`${API_URL}/auth/poll`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({user_code: msUserCode}) });
        data = await res.json();
      }
      if (data.ok) {
        clearInterval(msPolling);
        const acc = { ...data.profile, type: 'microsoft', addedAt: Date.now() };
        const idx = state.accounts.findIndex(a => a.uuid === acc.uuid);
        if (idx >= 0) state.accounts[idx] = acc; else state.accounts.push(acc);
        state.selectedAccount = acc.uuid;
        showMsSuccess(acc.username);
        renderHome();
      } else if (!data.pending) {
        clearInterval(msPolling);
        showMsError(data.error || 'Autenticação falhou.');
      }
      if (data.slowDown) { clearInterval(msPolling); msInterval = Math.min(msInterval + 5, 30); startMsPolling(); }
    } catch (err) { console.warn('[auth poll]', err.message); }
  }, msInterval * 1000);
}

function showMsStep(step) {
  ['code','success','error'].forEach(n => {
    const el = document.getElementById(`ms-step-${n}`);
    if (el) el.hidden = n !== step;
  });
}
function showMsSuccess(username) {
  const el = document.getElementById('ms-success-name');
  if (el) el.textContent = `Bem-vindo, ${username}!`;
  showMsStep('success');
  setTimeout(closeMsModal, 2500);
  renderAccounts();
  showToast(`Login realizado: ${username}`);
}
function showMsError(msg) {
  const el = document.getElementById('ms-error-msg');
  if (el) el.textContent = msg;
  showMsStep('error');
}
function closeMsModal() {
  clearInterval(msPolling); msPolling = null; msUserCode = null;
  const modal = document.getElementById('ms-modal');
  if (modal) { modal.hidden = true; document.body.style.overflow = ''; }
}
window.closeMsModal = closeMsModal;

/* ════════════════════════════════════════════════════════════════
   COSMETICS
═════════════════════════════════════════════════════════════════ */
async function loadCosmetics() {
  // Tentar carregar do backend
  try {
    const res  = await fetch(`${API_URL}/cosmetics`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.cosmetics)) {
      // Mesclar ícones locais pois backend não tem icons
      state.cosmetics = data.cosmetics.map(c => ({
        ...c,
        icon: COSMETICS_LOCAL.find(l => l.id === c.id)?.icon || '✨'
      }));
    }
  } catch { /* usa COSMETICS_LOCAL */ }

  // Carregar cosmético equipado
  if (isElectron && window.aether?.cosmetics) {
    state.equippedCosmetic = await window.aether.cosmetics.equipped();
  } else {
    state.equippedCosmetic = localStorage.getItem('aether_equipped') || null;
  }
}

function filterCosmetics(cat) {
  state.cosFilter = cat;
  document.querySelectorAll('.cos-cat').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  renderCosGrid();
}
window.filterCosmetics = filterCosmetics;

function renderCosmetics() {
  renderCosGrid();
  renderCosPreview(null);
}

function renderCosGrid() {
  const grid = document.getElementById('cos-grid');
  if (!grid) return;

  const filtered = state.cosFilter === 'all'
    ? state.cosmetics
    : state.cosmetics.filter(c => c.category === state.cosFilter);

  if (!filtered.length) {
    grid.innerHTML = '<p style="color:var(--txt2);font-size:13px;grid-column:1/-1">Nenhum cosmético nesta categoria.</p>';
    return;
  }

  grid.innerHTML = filtered
    .sort((a,b) => (RARITY_ORDER[b.rarity]||0) - (RARITY_ORDER[a.rarity]||0))
    .map(c => {
      const isEquipped = c.id === state.equippedCosmetic;
      const isSelected = c.id === state.selectedCosmetic;
      const cls = ['cos-card', isEquipped?'equipped':'', isSelected?'selected':'', !c.unlocked?'locked':''].filter(Boolean).join(' ');
      return `
        <div class="${cls}" onclick="selectCosmetic('${c.id}')" title="${c.unlocked?'':'🔒 Bloqueado'}">
          ${isEquipped ? '<div class="cos-eq-tag">ON</div>' : ''}
          <div class="cos-ic">${c.icon || '✨'}</div>
          <div class="cos-nm">${c.name}</div>
          <div class="cos-rar rar-${c.rarity}">${RARITY_LABEL[c.rarity]||c.rarity}</div>
        </div>`;
    }).join('');
}

function selectCosmetic(id) {
  state.selectedCosmetic = id;
  renderCosGrid();
  renderCosPreview(id);
}
window.selectCosmetic = selectCosmetic;

function renderCosPreview(id) {
  const placeholder = document.getElementById('cp-placeholder');
  const detail      = document.getElementById('cp-detail');
  if (!id) {
    if (placeholder) placeholder.hidden = false;
    if (detail)      detail.hidden = true;
    return;
  }
  const cos = state.cosmetics.find(c => c.id === id);
  if (!cos) return;
  if (placeholder) placeholder.hidden = true;
  if (detail)      detail.hidden = false;

  const isEquipped = cos.id === state.equippedCosmetic;
  document.getElementById('cp-icon')?.setAttribute('textContent', cos.icon);
  const iconEl = document.getElementById('cp-icon');
  if (iconEl) iconEl.textContent = cos.icon || '✨';
  const nameEl = document.getElementById('cp-name');
  if (nameEl) nameEl.textContent = cos.name;
  const rarEl  = document.getElementById('cp-rarity');
  if (rarEl)  { rarEl.textContent = RARITY_LABEL[cos.rarity] || cos.rarity; rarEl.className = `cp-rarity rar-${cos.rarity}`; }
  const catEl  = document.getElementById('cp-cat');
  if (catEl)  catEl.textContent = CATEGORY_LABEL[cos.category] || cos.category;

  const equipBtn   = document.getElementById('cp-equip-btn');
  const unequipBtn = document.getElementById('cp-unequip-btn');
  if (equipBtn) {
    equipBtn.hidden   = isEquipped || !cos.unlocked;
    equipBtn.textContent = cos.unlocked ? 'Equipar' : '🔒 Bloqueado';
  }
  if (unequipBtn) unequipBtn.hidden = !isEquipped;
}

async function equipSelected() {
  const id  = state.selectedCosmetic;
  const cos = state.cosmetics.find(c => c.id === id);
  if (!cos || !cos.unlocked) { showToast('⚠ Cosmético bloqueado.'); return; }

  state.equippedCosmetic = id;
  if (isElectron && window.aether?.cosmetics) {
    await window.aether.cosmetics.equip(id);
  } else {
    localStorage.setItem('aether_equipped', id);
  }
  renderCosGrid();
  renderCosPreview(id);
  renderHome();
  showToast(`✅ "${cos.name}" equipado!`);
}
window.equipSelected = equipSelected;

async function unequipCosmetic() {
  state.equippedCosmetic = null;
  if (isElectron && window.aether?.cosmetics) {
    await window.aether.cosmetics.unequip();
  } else {
    localStorage.removeItem('aether_equipped');
  }
  renderCosGrid();
  renderCosPreview(state.selectedCosmetic);
  renderHome();
  showToast('Cosmético desequipado.');
}
window.unequipCosmetic = unequipCosmetic;

/* ════════════════════════════════════════════════════════════════
   STATUS DOS SERVIÇOS
═════════════════════════════════════════════════════════════════ */
async function checkStatus() {
  const dotMap = { auth:'dot-auth', session:'dot-session', ms:'dot-ms', mc:'dot-mc' };
  Object.values(dotMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'ss-dot checking';
  });

  try {
    let data;
    if (isElectron && window.aether?.api?.status) {
      data = await window.aether.api.status();
    } else {
      const res = await fetch(`${API_URL}/status`);
      data = await res.json();
    }

    (data.services || []).forEach(svc => {
      const dotId = dotMap[svc.id];
      if (dotId) {
        const el = document.getElementById(dotId);
        if (el) el.className = `ss-dot ${svc.status === 'online' ? 'online' : 'offline'}`;
      }
    });

    const apiDot = document.getElementById('api-dot');
    if (apiDot) apiDot.className = `sb-status-dot ${data.overall === 'operational' ? 'online' : 'offline'}`;
  } catch {
    const apiDot = document.getElementById('api-dot');
    if (apiDot) apiDot.className = 'sb-status-dot offline';
  }
}

/* ════════════════════════════════════════════════════════════════
   VERSION INFO
═════════════════════════════════════════════════════════════════ */
async function loadVersion() {
  try {
    let data;
    if (isElectron && window.aether?.api?.version) {
      data = await window.aether.api.version();
    } else {
      const res = await fetch(`${API_URL}/version`);
      data = await res.json();
    }
    if (data?.version) {
      const el = document.getElementById('sb-version');
      if (el) el.textContent = `v${data.version}`;
    }
  } catch { /* silêncio */ }
}

/* ════════════════════════════════════════════════════════════════
   TOAST
═════════════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

/* ════════════════════════════════════════════════════════════════
   MODAL — fechar ao clicar fora
═════════════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const modal = document.getElementById('ms-modal');
  if (modal && !modal.hidden && e.target === modal) closeMsModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMsModal();
});

/* ════════════════════════════════════════════════════════════════
   UPDATER EVENTS (Electron)
═════════════════════════════════════════════════════════════════ */
if (isElectron && window.aether?.on) {
  window.aether.on('updater:available', info => {
    showToast(`🔄 Update ${info?.version || ''} disponível! Clique em Config → Verificar update.`, 5000);
  });
  window.aether.on('updater:ready', info => {
    showToast(`✅ Update ${info?.version || ''} baixado. Reinicie para instalar.`, 5000);
  });
}

/* ════════════════════════════════════════════════════════════════
   INIT
═════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadAccounts();
  await loadCosmetics();
  renderHome();
  checkStatus();
  loadVersion();
  setInterval(checkStatus, 60000);
});
