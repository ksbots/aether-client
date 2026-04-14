'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const EVENTS = [
  'updater:available',
  'updater:notAvailable',
  'updater:progress',
  'updater:ready'
];

contextBridge.exposeInMainWorld('aether', {
  window: {
    minimize:    () => ipcRenderer.invoke('window:minimize'),
    maximize:    () => ipcRenderer.invoke('window:maximize'),
    close:       () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  config: {
    get:   ()  => ipcRenderer.invoke('config:get'),
    set:   (o) => ipcRenderer.invoke('config:set', o),
    clear: ()  => ipcRenderer.invoke('config:clear')
  },
  api: {
    status:  () => ipcRenderer.invoke('api:status'),
    version: () => ipcRenderer.invoke('api:version')
  },
  auth: {
    startDevice: ()  => ipcRenderer.invoke('auth:startDevice'),
    pollDevice:  (c) => ipcRenderer.invoke('auth:pollDevice', c)
  },
  accounts: {
    list:   ()    => ipcRenderer.invoke('accounts:list'),
    select: (u)   => ipcRenderer.invoke('accounts:select', u),
    delete: (u)   => ipcRenderer.invoke('accounts:delete', u)
  },
  cosmetics: {
    list:     ()  => ipcRenderer.invoke('cosmetics:list'),
    equip:    (id)=> ipcRenderer.invoke('cosmetics:equip', id),
    unequip:  ()  => ipcRenderer.invoke('cosmetics:unequip'),
    equipped: ()  => ipcRenderer.invoke('cosmetics:equipped')
  },
  dialog: {
    openDir: () => ipcRenderer.invoke('dialog:openDir')
  },
  shell: {
    open: (url) => ipcRenderer.invoke('shell:open', url)
  },
  updater: {
    check:    () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install:  () => ipcRenderer.invoke('updater:install')
  },
  on:  (ch, cb) => {
    if (EVENTS.includes(ch)) {
      const fn = (_, ...a) => cb(...a);
      ipcRenderer.on(ch, fn);
      return fn;
    }
  },
  off: (ch, fn) => {
    if (EVENTS.includes(ch)) ipcRenderer.removeListener(ch, fn);
  }
});
