import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  startSorting: (folderPath: string, recursive: boolean, fallbackName: string) => ipcRenderer.invoke('start-sorting', folderPath, recursive, fallbackName),
  getFolderStats: (folderPath: string, recursive: boolean, fallbackName: string) => ipcRenderer.invoke('get-folder-stats', folderPath, recursive, fallbackName),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  getCategories: () => ipcRenderer.invoke('get-categories'),
  updateCategories: (newCategories: Record<string, string[]>) => ipcRenderer.invoke('update-categories', newCategories),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // System Utilities IPC hooks
  getRamUsage: () => ipcRenderer.invoke('get-ram-usage'),
  purgeRam: () => ipcRenderer.invoke('purge-ram'),
  findDuplicates: (folderPath: string) => ipcRenderer.invoke('find-duplicates', folderPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  scanSystemTrash: () => ipcRenderer.invoke('scan-system-trash'),
  cleanSystemTrash: () => ipcRenderer.invoke('clean-system-trash'),
  purgeEmptyFolders: (folderPath: string) => ipcRenderer.invoke('purge-empty-folders', folderPath),
  getLargeFiles: (folderPath: string) => ipcRenderer.invoke('get-large-files', folderPath),
  getStartupApps: () => ipcRenderer.invoke('get-startup-apps'),
  toggleStartupApp: (name: string, path: string, enabled: boolean) => ipcRenderer.invoke('toggle-startup-app', name, path, enabled),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),

  onSortProgress: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('sort-progress', listener);
    return () => ipcRenderer.removeListener('sort-progress', listener);
  }
});
