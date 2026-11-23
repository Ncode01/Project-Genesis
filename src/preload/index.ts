// Preload: exposes a minimal, typed API on window.genesis via contextBridge. No Node APIs
// leak to the renderer; only the command sender and snapshot subscription cross the bridge.
import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type AppStatus, type GenesisApi, type SimCommand, type Snapshot } from './ipc.js';

const api: GenesisApi = {
  send(command: SimCommand): Promise<void> {
    return ipcRenderer.invoke(IPC.command, command) as Promise<void>;
  },
  onSnapshot(handler: (s: Snapshot) => void): () => void {
    const listener = (_e: unknown, s: Snapshot): void => handler(s);
    ipcRenderer.on(IPC.snapshot, listener);
    void ipcRenderer.invoke(IPC.snapshotCurrent).then((s: Snapshot) => handler(s));
    return () => ipcRenderer.removeListener(IPC.snapshot, listener);
  },
  onStatus(handler: (s: AppStatus) => void): () => void {
    const listener = (_e: unknown, s: AppStatus): void => handler(s);
    ipcRenderer.on(IPC.status, listener);
    void ipcRenderer.invoke(IPC.statusCurrent).then((s: AppStatus) => handler(s));
    return () => ipcRenderer.removeListener(IPC.status, listener);
  },
};

contextBridge.exposeInMainWorld('genesis', api);
