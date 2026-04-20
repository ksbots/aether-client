# AetherVex Client

> Premium Minecraft 1.8.9 client — Launcher PC + Mod Fabric + Loja + Mobile

---

## 📁 Estrutura do Projeto

```
AetherVex/
├── launcher/              ← Electron launcher (PC)
│   ├── main.js            ← Processo principal Electron
│   ├── preload.js         ← Bridge IPC segura
│   ├── package.json
│   └── src/index.html     ← Interface do launcher
│
├── mod/                   ← Mod Fabric 1.8.9
│   ├── build.gradle
│   ├── src/main/java/com/aethervex/
│   │   ├── client/        ← Entrypoint
│   │   ├── mixin/         ← Mixins (RIGHT SHIFT, render hooks)
│   │   ├── gui/           ← AetherMenuScreen (menu in-game)
│   │   ├── modules/       ← ToggleSprint, FPS, Keystrokes etc.
│   │   ├── hud/           ← HudManager + HudElement
│   │   ├── cosmetics/     ← CosmeticsManager + WingsRenderer
│   │   └── network/       ← AetherNetworkHandler
│   └── src/main/resources/
│       ├── fabric.mod.json
│       └── aethervex.mixins.json
│
├── backend/               ← API Node.js + SQLite
│   ├── server.js
│   ├── scripts/init-db.js
│   ├── routes/
│   └── middleware/
│
├── site/                  ← Site GitHub Pages
│   ├── index.html
│   ├── css/shared.css
│   └── assets/
│
├── store/                 ← Loja de cosméticos
│   └── index.html
│
└── downloads/             ← .exe e .apk ficam aqui
    └── README.txt
```

---

## 🚀 1. Launcher PC (Electron)

### Pré-requisitos
- Node.js 18+ → https://nodejs.org
- npm 9+

### Instalação e execução

```bash
cd launcher
npm install
npm start          # abre o launcher em modo dev
```

### Build do instalador (.exe)

```bash
cd launcher
npm install
npm run build      # gera launcher/dist/AetherVex-Setup.exe
```

Após o build, copie o `.exe` para `downloads/`:

```bash
cp launcher/dist/AetherVex-Setup.exe downloads/AetherVex-Setup.exe
```

### Como o launcher funciona

1. O usuário clica **JOGAR**
2. `main.js` chama `minecraft-launcher-core`
3. Baixa Minecraft 1.8.9 + LegacyFabric loader
4. Injeta `aethervex.jar` em `.minecraft/mods/`
5. Lança o Java com as flags de RAM configuradas
6. RIGHT SHIFT in-game abre o `AetherMenuScreen`

---

## ☕ 2. Mod Fabric (1.8.9)

### Pré-requisitos
- Java 8 (JDK 8) → https://adoptium.net/temurin/releases/?version=8
- Gradle (ou use o wrapper `./gradlew`)

### Compilação

```bash
cd mod
./gradlew build
# JAR gerado em: mod/build/libs/aethervex-1.0.0.jar
```

### Colocar o JAR no launcher

```bash
mkdir -p launcher/assets/mods
cp mod/build/libs/aethervex-1.0.0.jar launcher/assets/mods/aethervex.jar
```

O `main.js` do launcher vai copiar automaticamente este JAR para
`~/.aethervex/.minecraft/mods/aethervex.jar` antes de iniciar o jogo.

### Como o mod funciona

| Tecla | Ação |
|---|---|
| **RIGHT SHIFT** | Abre o menu AetherVex (Mods + Cosméticos) |
| Clique em módulo | Ativa/desativa o módulo |
| Clique em cosmético | Equipa/desequipa no jogo |

### Módulos incluídos

| Módulo | Categoria | Descrição |
|---|---|---|
| ToggleSprint | Movimento | Sprint permanente automático |
| FPS Display | HUD | FPS com cores (verde/amarelo/vermelho) |
| Keystrokes | HUD | WASD + Espaço animados |
| Armor Status | HUD | Durabilidade de armadura |
| Potion Status | HUD | Efeitos ativos + timer |
| Combo Counter | PvP | Hits consecutivos |
| Direction HUD | HUD | Bússola + XYZ |
| CPS Counter | PvP | Cliques por segundo |

---

## 🗄️ 3. Backend (Node.js + SQLite)

### Pré-requisitos
- Node.js 18+

### Setup

```bash
cd backend
cp .env.example .env
# Edite .env — defina JWT_SECRET e PORT

npm install
node scripts/init-db.js   # cria o banco e semeia os 50 cosméticos
npm start                  # http://localhost:3001
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/status` | Health check |
| GET | `/api/cosmetics` | Lista todos os cosméticos |
| GET | `/api/cosmetics/:id` | Cosmético individual |
| POST | `/api/user/register` | Registrar usuário |
| POST | `/api/user/login` | Login + JWT |
| GET | `/api/user/inventory?userId=X` | Inventário do usuário |
| POST | `/api/user/equip` | Equipar/desequipar |
| POST | `/store/redeem` | Resgatar código |
| POST | `/store/purchase` | Simular compra + gerar código |

### Deploy gratuito (Render.com)

1. Crie conta em https://render.com
2. "New Web Service" → conecte o repositório
3. Root: `backend/`
4. Start Command: `npm start`
5. Adicione as variáveis do `.env.example`
6. A URL gerada substitui `https://aether-backend.onrender.com` no código

---

## 📱 4. Launcher Mobile (Android — PojavLauncher Customizado)

O launcher mobile é baseado no **PojavLauncher** (open-source, MIT License).
GitHub oficial: https://github.com/PojavLauncherTeam/PojavLauncher

### Passo a passo para gerar o AetherVex-Mobile.apk

#### Requisitos
- Android Studio (Hedgehog ou mais novo) — https://developer.android.com/studio
- JDK 17
- Git

#### 1. Clone o PojavLauncher

```bash
git clone https://github.com/PojavLauncherTeam/PojavLauncher.git
cd PojavLauncher
git checkout v3_openjdk   # branch estável
```

#### 2. Aplique a customização AetherVex

```bash
# Renomear o app
# Edite: app_pojavlauncher/src/main/res/values/strings.xml
# Mude: <string name="app_name">AetherVex</string>

# Trocar ícone
cp SEU_ÍCONE.png app_pojavlauncher/src/main/res/mipmap-xxxhdpi/ic_launcher.png
cp SEU_ÍCONE.png app_pojavlauncher/src/main/res/mipmap-xxhdpi/ic_launcher.png
# (repita para hdpi, mdpi, xhdpi)

# Trocar splash screen
cp SEU_SPLASH.png app_pojavlauncher/src/main/res/drawable/splash.png
```

#### 3. Adicionar auto-injeção do mod AetherVex

Edite `app_pojavlauncher/src/main/java/net/kdt/pojavlaunch/LauncherActivity.java`
e adicione após a criação do diretório `.minecraft/mods`:

```java
// AetherVex mod auto-inject
File modsDir = new File(Tools.DIR_GAME_HOME + "/mods");
modsDir.mkdirs();
File modJar = new File(modsDir, "aethervex.jar");
if (!modJar.exists()) {
    try {
        InputStream is = getAssets().open("aethervex.jar");
        FileOutputStream fos = new FileOutputStream(modJar);
        byte[] buf = new byte[8192];
        int n;
        while ((n = is.read(buf)) > 0) fos.write(buf, 0, n);
        fos.close(); is.close();
        android.util.Log.i("AetherVex", "Mod injetado com sucesso!");
    } catch (Exception e) {
        android.util.Log.w("AetherVex", "Falha ao injetar mod: " + e.getMessage());
    }
}
```

#### 4. Copiar o JAR do mod como asset

```bash
mkdir -p app_pojavlauncher/src/main/assets
cp /caminho/para/aethervex-1.0.0.jar app_pojavlauncher/src/main/assets/aethervex.jar
```

#### 5. Configurar ID do app

Edite `app_pojavlauncher/build.gradle`:
```gradle
applicationId "com.aethervex.launcher"
versionName "2.1.1"
versionCode 211
```

#### 6. Gerar o APK

```bash
./gradlew assembleRelease
# APK gerado em: app_pojavlauncher/build/outputs/apk/release/app-release.apk
```

#### 7. Assinar o APK (necessário para distribuição)

```bash
keytool -genkey -v -keystore aethervex.keystore -alias aethervex -keyalg RSA -keysize 2048 -validity 10000

jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore aethervex.keystore \
  app-release.apk aethervex

zipalign -v 4 app-release.apk AetherVex-Mobile.apk
```

#### 8. Copiar para downloads

```bash
cp AetherVex-Mobile.apk /caminho/AetherVex/downloads/AetherVex-Mobile.apk
```

---

## 🌐 5. Site + GitHub Pages

### Estrutura de deploy

O repositório deve ter esta estrutura para o GitHub Pages funcionar:

```
/                         ← raiz do repositório
├── site/
│   ├── index.html        ← Página principal
│   └── css/shared.css
├── store/
│   └── index.html        ← Loja
├── downloads/
│   ├── AetherVex-Setup.exe
│   └── AetherVex-Mobile.apk
└── README.md
```

### Configurar GitHub Pages

1. Vá em **Settings → Pages** no repositório
2. Source: **Deploy from a branch**
3. Branch: `main` · Folder: `/` (raiz)
4. Clique Save
5. Após ~2 min, o site estará em `https://SEU-USER.github.io/SEU-REPO/site/`

### URLs finais

| Recurso | URL |
|---|---|
| Site | `https://user.github.io/repo/site/` |
| Loja | `https://user.github.io/repo/store/` |
| Download .exe | `https://user.github.io/repo/downloads/AetherVex-Setup.exe` |
| Download .apk | `https://user.github.io/repo/downloads/AetherVex-Mobile.apk` |

---

## 🔄 6. Fluxo de Compra Completo

```
Jogador        Site/Loja         Backend           Launcher/Jogo
   │               │                │                    │
   │── compra ────▶│                │                    │
   │               │── POST /store/purchase ────────────▶│
   │               │◀── redeemCode: "AE8X-4Q91-..." ────│
   │◀── recebe ────│                │                    │
   │   código      │                │                    │
   │                                │                    │
   │─── insere código no launcher ──────────────────────▶│
   │                                │◀── POST /store/redeem
   │                                │──▶ valida + equipa │
   │◀────────────────────────── "✅ Equipado!" ──────────│
   │                                │                    │
   │── RIGHT SHIFT in-game ────────────────────────────▶│
   │◀────── AetherMenuScreen com cosmético equipado ─────│
```

---

## ✅ 7. Checklist de Conformidade (Regra de Ouro)

| Requisito | Status |
|---|---|
| Launcher abre e executa Minecraft 1.8.9 | ✅ `main.js` usa `minecraft-launcher-core` + LegacyFabric |
| RIGHT SHIFT abre menu de mods | ✅ `MixinMinecraft.java` + `AetherMenuScreen.java` |
| Menu tem Cofre de Cosméticos | ✅ Tab "Cosméticos" com 50 itens, sidebar de categorias, equip/unequip |
| Site com botão Download Windows | ✅ `site/index.html` → `./downloads/AetherVex-Setup.exe` |
| Site com botão Download APK | ✅ `site/index.html` → `./downloads/AetherVex-Mobile.apk` |
| Loja com imagens e categorias | ✅ `store/index.html` com 50 SVGs, filtros, trending, new |
| Design premium | ✅ Dark theme com gradientes, animações, Rajdhani + Outfit fonts |

---

## 🛠️ Troubleshooting

### "Java não encontrado"
→ Instale Java 8: https://adoptium.net/temurin/releases/?version=8
→ Ou configure `JAVA_HOME` apontando para o JDK

### Minecraft não inicia / trava no download
→ Verifique conexão com internet
→ Delete `.aethervex/.minecraft/versions` e tente novamente
→ Ative logs no launcher (F12 → Console)

### Mod não aparece em jogo
→ Confirme que `aethervex.jar` está em `.minecraft/mods/`
→ Confirme que a versão selecionada é **1.8.9** com LegacyFabric
→ Verifique o log do jogo em `.minecraft/logs/latest.log`

### Backend offline (toasts de erro)
→ Deploy no Render.com (ver seção 3)
→ Ou rode localmente: `cd backend && npm start`
→ Troque `BACKEND` em `launcher/src/index.html` para `http://localhost:3001`

### APK não instala no Android
→ Habilite "Fontes desconhecidas": Configurações → Segurança
→ Confirme Android 8.0+
→ Se usar Android 13+: Configurações → Apps → Permissões especiais

---

## 📜 Licença

AetherVex Client — All Rights Reserved © 2025 AetherVex Team
Minecraft é marca registrada da Mojang Studios / Microsoft.
PojavLauncher licenciado sob MIT License.
