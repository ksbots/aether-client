'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── Expose a safe API to the renderer ─────────────────────
contextBridge.exposeInMainWorld('aether', {

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow:    () => ipcRenderer.invoke('close-window'),
  openStore:      () => ipcRenderer.invoke('open-store'),

  // Config persistence
  loadConfig:  ()      => ipcRenderer.invoke('load-config'),
  saveConfig:  (cfg)   => ipcRenderer.invoke('save-config', cfg),

  // Account management
  loadAccounts:       ()       => ipcRenderer.invoke('load-accounts'),
  addAccount:         (acc)    => ipcRenderer.invoke('add-account', acc),
  removeAccount:      (uuid)   => ipcRenderer.invoke('remove-account', uuid),
  addOfflineAccount:  (name)   => ipcRenderer.invoke('add-offline-account', name),

  // Microsoft auth
  msDeviceStart: ()       => ipcRenderer.invoke('ms-device-start'),
  msDevicePoll:  (code)   => ipcRenderer.invoke('ms-device-poll', code),

  // Java detection
  checkJava: () => ipcRenderer.invoke('check-java'),

  // Game launch
  launch: (account, opts) => ipcRenderer.invoke('launch', account, opts),

  // Event listeners (one-way: main → renderer)
  on: (channel, callback) => {
    const allowed = [
      'launch-progress',
      'game-closed',
      'launch-error',
    ];
    if (!allowed.includes(channel)) return;
    // Remove previous listener to avoid duplicates
    ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel) => ipcRenderer.removeAllListeners(channel),
});
