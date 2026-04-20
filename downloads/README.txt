===================================================
 AetherVex Client — Downloads Folder
===================================================

This folder must contain the installer/APK files
referenced by the site's download buttons.

FILES NEEDED:
  AetherVex-Setup.exe     ← Windows installer (built by electron-builder)
  AetherVex-Mobile.apk    ← Android APK (built from PojavLauncher)

HOW TO BUILD AetherVex-Setup.exe:
  1. cd launcher
  2. npm install
  3. npm run build         (generates dist/AetherVex-Setup.exe)
  4. Copy dist/AetherVex-Setup.exe  →  downloads/AetherVex-Setup.exe

HOW TO BUILD AetherVex-Mobile.apk:
  → See README.md section "📱 Launcher Mobile"

After placing both files here, commit and push to GitHub.
GitHub Pages will serve them at:
  https://<user>.github.io/<repo>/downloads/AetherVex-Setup.exe
  https://<user>.github.io/<repo>/downloads/AetherVex-Mobile.apk
