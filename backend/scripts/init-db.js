'use strict';
/**
 * Run once: node scripts/init-db.js
 * Creates all tables and seeds cosmetic catalog.
 */

const path    = require('path');
const fs      = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = process.env.DB_PATH || './data/aethervex.db';
const dbDir   = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const Database = require('better-sqlite3');
const db = new Database(path.resolve(DB_PATH));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT NOT NULL UNIQUE,
    email       TEXT UNIQUE,
    password    TEXT,
    role        TEXT NOT NULL DEFAULT 'MEMBER',
    coins       INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS cosmetics (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    rarity      TEXT NOT NULL,
    price       REAL NOT NULL,
    description TEXT,
    image_url   TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS user_inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cosmetic_id TEXT NOT NULL REFERENCES cosmetics(id),
    equipped    INTEGER NOT NULL DEFAULT 0,
    obtained_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, cosmetic_id)
  );

  CREATE TABLE IF NOT EXISTS redeem_codes (
    code        TEXT PRIMARY KEY,
    cosmetic_id TEXT NOT NULL REFERENCES cosmetics(id),
    used        INTEGER NOT NULL DEFAULT 0,
    used_by     TEXT REFERENCES users(id),
    used_at     INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    cosmetic_id TEXT NOT NULL REFERENCES cosmetics(id),
    amount      REAL NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'BRL',
    provider    TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);
  CREATE INDEX IF NOT EXISTS idx_codes_used ON redeem_codes(used);
`);

// ── Seed cosmetic catalog ──────────────────────────────────
const CATALOG = [
  ['aether_wings_001','Aether Wings','wings','Mythic',79.90,'Asas cósmicas do núcleo Aether.'],
  ['shadow_wings_002','Shadow Wings','wings','Legendary',69.90,'Asas das sombras com neon roxo.'],
  ['solar_wings_003','Solar Flare Wings','wings','Epic',44.90,'Asas incandescentes do núcleo solar.'],
  ['frost_wings_004','Frost Wings','wings','Elite',29.90,'Asas de gelo eterno.'],
  ['storm_wings_005','Storm Wings','wings','Legendary',64.90,'Asas da tempestade.'],
  ['void_wings_006','Void Wings','wings','Mythic',84.90,'Asas do vazio absoluto.'],
  ['crystal_wings_007','Crystal Wings','wings','Premium',14.90,'Asas de cristal.'],
  ['dragon_wings_008','Dragon Wings','wings','Exclusive',149.90,'Asas de dragão ancestral.'],
  ['angel_wings_009','Angel Wings','wings','Celestial',99.90,'Asas angelicais com luz divina.'],
  ['neon_wings_010','Neon Wings','wings','Epic',39.90,'Asas de energia neon.'],
  ['void_cloak_011','Void Emperor Cloak','cloaks','Exclusive',119.90,'Capa do imperador do vazio.'],
  ['astral_cloak_012','Astral Cloak','cloaks','Celestial',89.90,'Capa de matéria estelar.'],
  ['shadow_cloak_013','Shadow Cloak','cloaks','Legendary',64.90,'Capa da sombra perfeita.'],
  ['frost_veil_014','Frost Veil','cloaks','Epic',34.90,'Capa glacial.'],
  ['crimson_cloak_015','Crimson Cloak','cloaks','Elite',24.90,'Capa carmesim.'],
  ['mystic_cloak_016','Mystic Cloak','cloaks','Premium',12.90,'Capa mística.'],
  ['night_cloak_017','Night Cloak','cloaks','Standard',4.90,'Capa da noite.'],
  ['phoenix_cloak_018','Phoenix Cloak','cloaks','Mythic',94.90,'Capa de fênix.'],
  ['neon_cap_019','Neon Hacker Cap','hats','Epic',19.90,'Boné neon roxo.'],
  ['urban_cap_020','Urban Cap','hats','Standard',4.90,'Boné urbano.'],
  ['royal_tophat_021','Royal Top Hat','hats','Elite',27.90,'Cartola real dourada.'],
  ['astral_beanie_022','Astral Beanie','hats','Premium',9.90,'Gorro astral.'],
  ['dragon_helm_023','Dragon Helm','hats','Legendary',69.90,'Capacete de dragão.'],
  ['cyber_hood_024','Cyber Hood','hats','Elite',24.90,'Capuz cyberpunk.'],
  ['oni_mask_025','Oni Mask','masks','Elite',22.90,'Máscara de oni.'],
  ['phantom_mask_026','Phantom Mask','masks','Legendary',59.90,'Máscara do fantasma.'],
  ['cyber_mask_027','Cyber Mask','masks','Epic',34.90,'Máscara cyber.'],
  ['death_mask_028','Death Mask','masks','Mythic',89.90,'Máscara da morte.'],
  ['fox_mask_029','Fox Mask','masks','Premium',14.90,'Máscara de raposa.'],
  ['dragon_mask_030','Dragon Mask','masks','Exclusive',129.90,'Máscara de dragão.'],
  ['astral_band_031','Astral Bandana','bandanas','Celestial',44.90,'Bandana celestial.'],
  ['neon_band_032','Neon Bandana','bandanas','Premium',9.90,'Bandana neon.'],
  ['void_band_033','Void Bandana','bandanas','Legendary',54.90,'Bandana do vazio.'],
  ['flame_band_034','Flame Bandana','bandanas','Elite',19.90,'Bandana com chamas.'],
  ['shadow_band_035','Shadow Bandana','bandanas','Epic',29.90,'Bandana das sombras.'],
  ['divine_aura_036','Divine Halo Aura','auras','Celestial',64.90,'Aura com halo divino.'],
  ['astral_aura_037','Astral Aura','auras','Celestial',54.90,'Aura astral.'],
  ['plasma_aura_038','Plasma Aura','auras','Epic',39.90,'Aura de plasma.'],
  ['void_aura_039','Void Aura','auras','Mythic',84.90,'Aura do vazio.'],
  ['flame_aura_040','Flame Aura','auras','Legendary',59.90,'Aura de chamas.'],
  ['void_suit_041','Void Emperor Suit','suits','Exclusive',159.90,'Armadura do vazio.'],
  ['cyber_suit_042','Cyber Suit','suits','Legendary',74.90,'Armadura cyber.'],
  ['astral_suit_043','Astral Suit','suits','Mythic',99.90,'Armadura astral.'],
  ['shadow_suit_044','Shadow Suit','suits','Epic',44.90,'Armadura das sombras.'],
  ['royal_crown_045','Royal Crown','crowns','Legendary',69.90,'Coroa real dourada.'],
  ['void_crown_046','Void Crown','crowns','Mythic',94.90,'Coroa do vazio.'],
  ['diamond_crown_047','Diamond Crown','crowns','Celestial',109.90,'Coroa de diamante.'],
  ['gold_chain_048','Gold Chain','necklaces','Premium',12.90,'Corrente dourada.'],
  ['aether_chain_049','Aether Chain','necklaces','Legendary',59.90,'Corrente Aether.'],
  ['dragon_chain_050','Dragon Chain','necklaces','Elite',22.90,'Corrente de dragão.'],
];

const insertCosmetic = db.prepare(`
  INSERT OR IGNORE INTO cosmetics (id, name, category, rarity, price, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertMany = db.transaction((rows) => {
  for (const r of rows) insertCosmetic.run(...r);
});
insertMany(CATALOG);

console.log('✅ Database initialised at', path.resolve(DB_PATH));
console.log(`   → ${CATALOG.length} cosmetics seeded`);
db.close();
