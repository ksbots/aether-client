# Aether Client v2.1.1

Launcher profissional de Minecraft com Fabric, mods automáticos, cosméticos e suporte Android.

---

## Estrutura do Projeto

```
aether-client/
├── launcher/          ← Electron (launcher desktop)
│   ├── main.js        ← Processo principal corrigido
│   ├── preload.js     ← Ponte IPC segura
│   ├── package.json
│   └── assets/
│       └── icon.png   ← Ícone do tray (substitua pelo final)
├── backend/           ← Node.js / Express API
│   ├── server.js      ← Rotas: /status /version /auth/* /cosmetics
│   └── package.json
├── frontend/          ← Interface do launcher (carregada pelo Electron)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── docs/              ← Site oficial (GitHub Pages)
    ├── index.html     ← Site redesenhado
    ├── style.css
    ├── script.js
    └── .nojekyll
```

---

## Instalação e Execução

### 1. Backend

```cmd
cd backend
npm install
npm start
```

Backend roda em `http://localhost:3001`.

### 2. Launcher (modo dev — frontend local)

```cmd
cd launcher
npm install
cd ..\backend
npm run dev
```

Isso inicia o backend + launcher com frontend local automaticamente.

### 3. Launcher (modo dev — site hospedado)

```cmd
cd backend
npm run dev:remote
```

### 4. Gerar instalador .exe

```cmd
cd backend
npm run build
```

O instalador fica em `launcher/dist/`.

---

## GitHub Pages

1. Vá em **Settings → Pages** do seu repositório
2. Source: **Deploy from branch** → `main` → `/docs`
3. Acesse: `https://ksbots.github.io/aether-client/`

---

## Downloads no Site

O site detecta a versão mais recente automaticamente via GitHub API.

Para que os downloads funcionem, publique releases no GitHub com os assets:
- `Aether-Client-Setup-x.x.x.exe` → Windows
- `Aether-Client-x.x.x.dmg` → macOS
- `Aether-Client-x.x.x.AppImage` → Linux
- `aether-client-mobile-x.x.x.zip` → Android

---

## Variáveis de Ambiente (.env no backend)

```env
PORT=3001
MS_CLIENT_ID=seu_client_id_azure
MS_TENANT_ID=consumers
```

---

## Cosméticos

O catálogo de cosméticos está em `backend/server.js` → `COSMETICS_CATALOG`.
Para expandir, adicione itens à lista seguindo o formato:

```json
{
  "id": "cape_nova",
  "category": "capes",
  "name": "Capa Nova",
  "rarity": "epic",
  "unlocked": false
}
```

Categorias disponíveis: `capes`, `wings`, `hats`, `masks`, `emotes`, `badges`
Raridades: `common`, `rare`, `epic`, `legendary`, `exclusive`

---

## Como Validar

- [ ] `cd backend && npm run dev` → launcher abre com interface local
- [ ] Launcher **não** abre o navegador/site
- [ ] Backend responde em `http://localhost:3001/status`
- [ ] Aba Cosméticos mostra a grade e permite equipar
- [ ] Site `docs/index.html` abre no browser sem erros
- [ ] Downloads apontam para GitHub Releases
- [ ] Site é responsivo em mobile
- [ ] Partículas e animações funcionam
- [ ] Status dos serviços Mojang aparece em tempo real
