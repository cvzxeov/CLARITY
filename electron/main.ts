import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { exec } from 'child_process';

const isDev = !app.isPackaged;

// Disable sandboxing in packaged environment to prevent 0xC0000135 (STATUS_DLL_NOT_FOUND)
// crashes when launched from AppData or paths containing Cyrillic/Unicode characters.
if (!isDev) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// Hardware acceleration must remain enabled for frameless windows on Windows

function createWindow() {
  const logoAppPath = path.join(__dirname, 'logo_app.png');
  const logoDevPath = path.join(__dirname, '../src/img/logo_app.png');
  const logoWhitePath = path.join(__dirname, '../src/img/logo_white.png');

  let iconPath: string | undefined = undefined;
  try {
    if (fs.existsSync(logoAppPath)) {
      iconPath = logoAppPath;
    } else if (fs.existsSync(logoDevPath)) {
      iconPath = logoDevPath;
    } else if (fs.existsSync(logoWhitePath)) {
      iconPath = logoWhitePath;
    }
  } catch (e) {
    console.error('Failed to resolve icon path:', e);
  }

  const win = new BrowserWindow({
    width: 1468,
    height: 827,
    minWidth: 960,
    minHeight: 640,
    frame: false, // frameless window for custom header buttons
    icon: isDev ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    center: true
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));

    // Log renderer errors to a file
    try {
      const logPath = path.join(app.getPath('userData'), 'renderer_error.log');
      win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        try {
          fs.appendFileSync(logPath, `[Console level ${level}] ${sourceId}:${line} -> ${message}\n`);
        } catch (e) {
          // Silently catch write errors to avoid crashing the main process
        }
      });
    } catch (e) {
      console.error('Failed to set up console logging to file:', e);
    }
  }
}

app.whenReady().then(() => {
  try {
    const logPath = path.join(app.getPath('userData'), 'main_process.log');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, `[${new Date().toISOString()}] Clarity Main Process Started. Packaged: ${app.isPackaged}, isDev: ${isDev}\n`);

    app.on('render-process-gone', (event, webContents, details) => {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] [Crash] Renderer process gone: ${JSON.stringify(details)}\n`);
    });

    app.on('child-process-gone', (event, details) => {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] [Crash] Child process gone: ${JSON.stringify(details)}\n`);
    });
  } catch (e) {
    console.error('Failed to init main process logging:', e);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Window control IPCs
ipcMain.on('window-minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

let CATEGORIES: Record<string, string[]> = {
  'Изображения': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp'],
  'Видео': ['.mp4', '.mkv', '.avi', '.mov', '.flv'],
  'Документы': ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.pptx', '.csv'],
  'Архивы': ['.zip', '.rar', '.7z', '.tar', '.gz'],
  'Аудио': ['.mp3', '.wav', '.flac', '.ogg'],
  'Программы': ['.exe', '.msi', '.apk']
};

function getCategory(ext: string, fallbackName: string): string {
  const lowerExt = ext.toLowerCase();
  for (const [folder, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(lowerExt)) return folder;
  }
  return fallbackName;
}

function getUniquePath(dir: string, baseName: string, ext: string) {
  let targetPath = path.join(dir, `${baseName}${ext}`);
  let counter = 1;
  while (fs.existsSync(targetPath)) {
    targetPath = path.join(dir, `${baseName} (${counter})${ext}`);
    counter++;
  }
  return targetPath;
}

function scanDir(dirPath: string, recursive: boolean, filesList: string[], fallbackName: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    // Ignore hidden or system folders like .git
    if (entry.name.startsWith('.') || entry.name === 'System Volume Information') continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Don't recurse into target category folders to avoid infinite loops if scanning the same dir
      if (Object.keys(CATEGORIES).includes(entry.name) || entry.name === 'Разное' || entry.name === fallbackName) continue;

      if (recursive) {
        scanDir(fullPath, recursive, filesList, fallbackName);
      }
    } else if (entry.isFile()) {
      filesList.push(fullPath);
    }
  }
}

ipcMain.handle('start-sorting', async (event, folderPath: string, recursive: boolean, fallbackName: string) => {
  try {
    if (!fs.existsSync(folderPath)) throw new Error('Folder does not exist');

    const filesList: string[] = [];
    scanDir(folderPath, recursive, filesList, fallbackName);

    const total = filesList.length;
    let processed = 0;

    for (const filePath of filesList) {
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);

      const category = getCategory(ext, fallbackName);
      const targetFolder = path.join(folderPath, category);

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const newPath = getUniquePath(targetFolder, baseName, ext);
      fs.renameSync(filePath, newPath);

      processed++;
      event.sender.send('sort-progress', {
        total,
        processed,
        log: `[Успех] ${path.basename(filePath)} -> /${category}/${path.basename(newPath)}`
      });
    }

    return { success: true, message: `Отсортировано файлов: ${processed}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-folder-stats', async (event, folderPath: string, recursive: boolean, fallbackName: string) => {
  try {
    if (!fs.existsSync(folderPath)) throw new Error('Folder does not exist');
    const filesList: string[] = [];
    scanDir(folderPath, recursive, filesList, fallbackName);

    const stats: Record<string, number> = {};
    for (const key of Object.keys(CATEGORIES)) {
      stats[key] = 0;
    }
    stats[fallbackName] = 0;

    let totalSize = 0;
    for (const filePath of filesList) {
      const ext = path.extname(filePath);
      const cat = getCategory(ext, fallbackName);
      stats[cat] = (stats[cat] || 0) + 1;

      try {
        const fStat = fs.statSync(filePath);
        totalSize += fStat.size;
      } catch (e) { }
    }

    return {
      success: true,
      stats,
      totalFiles: filesList.length,
      totalSize
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder', async (event, folderPath: string) => {
  try {
    if (fs.existsSync(folderPath)) {
      await shell.openPath(folderPath);
      return { success: true };
    }
    return { success: false, error: 'Folder does not exist' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-categories', () => {
  return CATEGORIES;
});

ipcMain.handle('update-categories', (event, newCategories: Record<string, string[]>) => {
  CATEGORIES = newCategories;
  return { success: true };
});

// --- System Utilities Suite Helpers & IPC Handlers ---

function runPowerShell(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`powershell -NoProfile -Command "${query.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function getFileHash(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function scanForDuplicates(dirPath: string, fileList: Array<{ path: string; name: string; size: number }>) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'System Volume Information') continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (['Изображения', 'Видео', 'Документы', 'Архивы', 'Аудио', 'Программы', 'Разное'].includes(entry.name)) continue;
        scanForDuplicates(fullPath, fileList);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          fileList.push({ path: fullPath, name: entry.name, size: stat.size });
        } catch (e) { }
      }
    }
  } catch (e) { }
}

function getFolderSize(dirPath: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getFolderSize(fullPath);
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        size += stat.size;
      }
    }
  } catch (e) { }
  return size;
}

function cleanDirContents(dirPath: string) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      } catch (e) { }
    }
  } catch (e) { }
}

function removeEmptyDirs(dirPath: string, counter: { count: number }) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        removeEmptyDirs(fullPath, counter);
      }
    }
    const remaining = fs.readdirSync(dirPath);
    if (remaining.length === 0) {
      fs.rmdirSync(dirPath);
      counter.count++;
    }
  } catch (e) { }
}

ipcMain.handle('get-ram-usage', async () => {
  try {
    const result = await runPowerShell("Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize | ConvertTo-Json");
    const data = JSON.parse(result);
    const freeKb = data.FreePhysicalMemory;
    const totalKb = data.TotalVisibleMemorySize;
    const free = freeKb / 1024;
    const total = totalKb / 1024;
    const percent = Math.round(((total - free) / total) * 100);
    return { success: true, free, total, percent };
  } catch (e: any) {
    return { success: false, error: e.message, free: 0, total: 16384, percent: 50 };
  }
});

ipcMain.handle('purge-ram', async () => {
  try {
    await runPowerShell("Get-Process | ForEach-Object { try { $_.MaxWorkingSet = $_.MinWorkingSet } catch {} }");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('find-duplicates', async (event, folderPath: string) => {
  try {
    if (!fs.existsSync(folderPath)) throw new Error('Folder does not exist');
    const fileList: Array<{ path: string; name: string; size: number }> = [];
    scanForDuplicates(folderPath, fileList);

    const sizeGroups: Record<number, typeof fileList> = {};
    for (const f of fileList) {
      if (!sizeGroups[f.size]) sizeGroups[f.size] = [];
      sizeGroups[f.size].push(f);
    }

    const groups: Record<string, typeof fileList> = {};
    for (const [sizeStr, files] of Object.entries(sizeGroups)) {
      if (files.length < 2) continue;
      for (const file of files) {
        try {
          const hash = getFileHash(file.path);
          if (!groups[hash]) groups[hash] = [];
          groups[hash].push(file);
        } catch (e) { }
      }
    }

    const confirmedGroups: Record<string, typeof fileList> = {};
    for (const [hash, files] of Object.entries(groups)) {
      if (files.length > 1) {
        confirmedGroups[hash] = files;
      }
    }

    return { success: true, groups: confirmedGroups };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    throw new Error('File not found');
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-system-trash', async () => {
  try {
    const userTemp = process.env.TEMP || path.join(app.getPath('userData'), 'Temp');
    const winTemp = 'C:\\Windows\\Temp';
    let size = 0;
    if (fs.existsSync(userTemp)) size += getFolderSize(userTemp);
    if (fs.existsSync(winTemp)) size += getFolderSize(winTemp);
    return { success: true, size };
  } catch (e: any) {
    return { success: false, error: e.message, size: 0 };
  }
});

ipcMain.handle('clean-system-trash', async () => {
  try {
    const psCmd = `
      $UserTemp = $env:TEMP;
      if (Test-Path $UserTemp) {
        Get-ChildItem -Path $UserTemp -Force | ForEach-Object {
          try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
        }
      }
      $WinTemp = 'C:\\Windows\\Temp';
      if (Test-Path $WinTemp) {
        Get-ChildItem -Path $WinTemp -Force | ForEach-Object {
          try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
        }
      }
    `;
    await runPowerShell(psCmd);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('purge-empty-folders', async (event, folderPath: string) => {
  try {
    if (!fs.existsSync(folderPath)) throw new Error('Folder does not exist');
    const counter = { count: 0 };
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        removeEmptyDirs(fullPath, counter);
      }
    }
    return { success: true, count: counter.count };
  } catch (e: any) {
    return { success: false, error: e.message, count: 0 };
  }
});

ipcMain.handle('get-large-files', async (event, folderPath: string) => {
  try {
    if (!fs.existsSync(folderPath)) throw new Error('Folder does not exist');
    const files: Array<{ path: string; name: string; size: number }> = [];
    const scan = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'System Volume Information') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (['Изображения', 'Видео', 'Документы', 'Архивы', 'Аудио', 'Программы', 'Разное'].includes(entry.name)) continue;
            scan(fullPath);
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath);
              files.push({ path: fullPath, name: entry.name, size: stat.size });
            } catch (e) { }
          }
        }
      } catch (e) { }
    };
    scan(folderPath);
    files.sort((a, b) => b.size - a.size);
    return { success: true, files: files.slice(0, 30) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-startup-apps', async () => {
  try {
    const psCmd = `Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name | ForEach-Object { [PSCustomObject]@{ Name = $_; Path = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run').$_; Enabled = $true } } | ConvertTo-Json`;
    const result = await runPowerShell(psCmd);
    if (!result) return { success: true, apps: [] };
    let parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) parsed = [parsed];
    const apps = parsed
      .filter((item: any) => item.Name && item.Name !== 'PSPath' && item.Name !== 'PSParentPath' && item.Name !== 'PSChildName' && item.Name !== 'PSProvider' && item.Name !== 'PSDrive')
      .map((item: any) => ({
        name: item.Name,
        path: item.Path,
        enabled: true
      }));
    return { success: true, apps };
  } catch (e: any) {
    return { success: true, apps: [] };
  }
});

ipcMain.handle('toggle-startup-app', async (event, name: string, path: string, enabled: boolean) => {
  try {
    if (!enabled) {
      await runPowerShell(`Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${name}'`);
    } else {
      await runPowerShell(`Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${name}' -Value '${path}'`);
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('read-clipboard', () => {
  return clipboard.readText();
});

ipcMain.handle('open-external-url', async (event, url: string) => {
  await shell.openExternal(url);
});
