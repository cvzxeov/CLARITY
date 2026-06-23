import React, { useState, useEffect, useRef } from 'react';
import { UTILITY_TRANSLATIONS, Language } from '../utils/translations';
import { playClick } from '../utils/audio';

interface UtilitiesProps {
  folderPath: string | null;
  onSelectFolder?: (path: string) => void;
  lang: Language;
  theme: 'dark' | 'light';
  focusTool: string | null;
  setFocusTool: (val: string | null) => void;
}

interface RamUsage {
  free: number;
  total: number;
  percent: number;
}

interface DuplicateFile {
  path: string;
  name: string;
  size: number;
}

interface LargeFile {
  path: string;
  name: string;
  size: number;
}

interface StartupApp {
  name: string;
  path: string;
  enabled: boolean;
}

export const Utilities: React.FC<UtilitiesProps> = ({ 
  folderPath, 
  onSelectFolder, 
  lang, 
  theme, 
  focusTool, 
  setFocusTool 
}) => {
  const t = UTILITY_TRANSLATIONS[lang] || UTILITY_TRANSLATIONS['en'];

  // activeTool persists and controls which card is shown. It's set from focusTool on mount/change.
  const [activeTool, setActiveTool] = useState<string | null>(focusTool);

  // Local folder override for scans
  const [targetPath, setTargetPath] = useState<string>('');

  // 1. RAM State
  const [ram, setRam] = useState<RamUsage>({ free: 0, total: 16, percent: 0 });
  const [ramHistory, setRamHistory] = useState<number[]>(Array(40).fill(0));
  const [ramStatus, setRamStatus] = useState<string>('');
  const [isPurgingRam, setIsPurgingRam] = useState<boolean>(false);

  // 2. System Sweeper State
  const [trashSize, setTrashSize] = useState<number | null>(null);
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepStatus, setSweepStatus] = useState<string>('');

  // 3. Duplicate Finder State
  const [duplicates, setDuplicates] = useState<Record<string, DuplicateFile[]>>({});
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [isSearchingDups, setIsSearchingDups] = useState<boolean>(false);

  // 4. Empty Folder Purger State
  const [isPurgingFolders, setIsPurgingFolders] = useState<boolean>(false);
  const [purgedCount, setPurgedCount] = useState<number | null>(null);

  // 5. Big File Radar State
  const [largeFiles, setLargeFiles] = useState<LargeFile[]>([]);
  const [isScanningLarge, setIsScanningLarge] = useState<boolean>(false);

  // 6. Clipboard Vault State
  const [clipHistory, setClipHistory] = useState<string[]>([]);

  // 7. Startup Optimizer State
  const [startupApps, setStartupApps] = useState<StartupApp[]>([]);
  const [loadingStartup, setLoadingStartup] = useState<boolean>(false);

  // Sync prop folderPath to local state
  useEffect(() => {
    if (folderPath) {
      setTargetPath(folderPath);
    }
  }, [folderPath]);

  // Utilities Global Console Logs
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: 'success' | 'error' | 'info'; text: string }>>([]);

  const addLog = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setConsoleLogs(prev => [...prev, { type, text: `[${new Date().toLocaleTimeString()}] ${text}` }].slice(-50));
  };

  // --- Fetch RAM ---
  const fetchRam = async (init = false) => {
    if (!window.api) return;
    const result = await window.api.getRamUsage();
    if (result.success) {
      const freeG = result.free / 1024; // Convert MB to GB
      const totalG = result.total / 1024;
      setRam({
        free: freeG,
        total: totalG,
        percent: result.percent
      });
      setRamHistory(prev => {
        if (init) {
          return Array(40).fill(result.percent);
        }
        return [...prev.slice(1), result.percent];
      });
    }
  };

  useEffect(() => {
    fetchRam(true);
    const interval = setInterval(() => fetchRam(false), 2000); // Responsive rolling memory visualizer updates
    return () => clearInterval(interval);
  }, []);

  // --- Focus tool trigger effect: update activeTool + animate ---
  useEffect(() => {
    if (focusTool) {
      setActiveTool(focusTool);
      // small timeout to let the card render before scroll
      setTimeout(() => {
        const element = document.getElementById(`${focusTool}-card`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('focused-pulse');
          const timer = setTimeout(() => {
            element.classList.remove('focused-pulse');
            setFocusTool(null); // reset the prop, but activeTool stays
          }, 2200);
        }
      }, 100);
    }
  }, [focusTool]);

  // --- Scan Trash Size on mount ---
  const scanTrash = async () => {
    if (!window.api) return;
    const result = await window.api.scanSystemTrash();
    if (result.success) {
      setTrashSize(result.size);
    }
  };

  useEffect(() => {
    scanTrash();
  }, []);

  // --- Fetch Startup Apps ---
  const fetchStartupApps = async () => {
    if (!window.api) return;
    setLoadingStartup(true);
    const result = await window.api.getStartupApps();
    if (result.success && result.apps) {
      setStartupApps(result.apps);
    }
    setLoadingStartup(false);
  };

  useEffect(() => {
    fetchStartupApps();
  }, []);

  // --- Clipboard Vault Poller (Visibility Aware) ---
  const lastClipRef = useRef<string>('');
  useEffect(() => {
    if (!window.api) return;
    const pollClipboard = async () => {
      try {
        if (document.visibilityState !== 'visible') return; // Skip polling when backgrounded
        const text = await window.api.readClipboard();
        if (text && text.trim() !== '' && text !== lastClipRef.current) {
          lastClipRef.current = text;
          setClipHistory(prev => {
            if (prev.includes(text)) {
              return [text, ...prev.filter(item => item !== text)];
            }
            return [text, ...prev].slice(0, 40);
          });
        }
      } catch (e) {}
    };

    const interval = setInterval(pollClipboard, 1500);
    return () => clearInterval(interval);
  }, []);

  // --- Size Formatter Helper ---
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return `0 ${t.bytes}`;
    const k = 1024;
    const sizes = [t.bytes, t.kb, t.mb, t.gb];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- Directory Selection Dialogue ---
  const handleBrowseDir = async () => {
    if (!window.api) return;
    playClick('click');
    const path = await window.api.selectFolder();
    if (path) {
      setTargetPath(path);
      if (onSelectFolder) {
        onSelectFolder(path);
      }
      addLog(`Selected directory: ${path}`, 'info');
    }
  };

  // --- Actions ---

  // 1. Purge RAM
  const handlePurgeRam = async () => {
    if (isPurgingRam || !window.api) return;
    playClick('click');
    setIsPurgingRam(true);
    setRamStatus('Purging system working sets...');
    addLog('Executing memory purge power routine...', 'info');

    const clickSoundInterval = setInterval(() => playClick('hover'), 150);

    const result = await window.api.purgeRam();
    clearInterval(clickSoundInterval);

    if (result.success) {
      await fetchRam();
      setRamStatus(t.ramOptimized);
      addLog('RAM purged successfully. System working sets reclaimed.', 'success');
      playClick('click');
    } else {
      setRamStatus('Purge failed');
      addLog(`RAM purge error: ${result.error}`, 'error');
    }
    setIsPurgingRam(false);
  };

  // 2. Clean System Trash
  const handleCleanTrash = async () => {
    if (isSweeping || !window.api) return;
    playClick('click');
    setIsSweeping(true);
    setSweepStatus('Sweeping Temp folders...');
    addLog('Scanning and unlinking system cache files...', 'info');

    const result = await window.api.cleanSystemTrash();
    if (result.success) {
      await scanTrash();
      setSweepStatus(t.trashSuccess);
      addLog('System temp directory cleaned.', 'success');
      playClick('click');
    } else {
      setSweepStatus('Clean failed');
      addLog(`Cache clean error: ${result.error}`, 'error');
    }
    setIsSweeping(false);
  };

  // 3. Find Duplicates
  const handleFindDuplicates = async () => {
    if (isSearchingDups || !window.api || !targetPath) return;
    playClick('click');
    setIsSearchingDups(true);
    setSelectedDuplicates(new Set());
    addLog(`Searching duplicates in ${targetPath}...`, 'info');

    const result = await window.api.findDuplicates(targetPath);
    if (result.success && result.groups) {
      setDuplicates(result.groups);
      const count = Object.keys(result.groups).length;
      addLog(`Found ${count} duplicate groups.`, count > 0 ? 'success' : 'info');
    } else {
      addLog(`Duplicate scan failed: ${result.error}`, 'error');
    }
    setIsSearchingDups(false);
  };

  const toggleDupSelect = (filePath: string) => {
    playClick('hover');
    setSelectedDuplicates(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const deleteSelectedDuplicates = async () => {
    if (selectedDuplicates.size === 0 || !window.api) return;
    playClick('click');
    addLog(`Deleting ${selectedDuplicates.size} duplicate files...`, 'info');

    let deletedCount = 0;
    for (const filePath of selectedDuplicates) {
      const result = await window.api.deleteFile(filePath);
      if (result.success) {
        deletedCount++;
      } else {
        addLog(`Failed to delete ${filePath}: ${result.error}`, 'error');
      }
    }

    addLog(`Successfully removed ${deletedCount} duplicate files.`, 'success');
    setSelectedDuplicates(new Set());
    handleFindDuplicates();
  };

  const autoSelectDuplicates = () => {
    playClick('click');
    const newSelected = new Set<string>();
    Object.values(duplicates).forEach(files => {
      if (files.length <= 1) return;
      for (let i = 1; i < files.length; i++) {
        newSelected.add(files[i].path);
      }
    });
    setSelectedDuplicates(newSelected);
    addLog(`Auto-selected ${newSelected.size} duplicate copies.`, 'info');
  };

  const handleDeleteAllDuplicates = async () => {
    playClick('click');
    const copiesToDelete: string[] = [];
    Object.values(duplicates).forEach(files => {
      if (files.length <= 1) return;
      for (let i = 1; i < files.length; i++) {
        copiesToDelete.push(files[i].path);
      }
    });

    if (copiesToDelete.length === 0) return;

    const confirmMsg = t.dupDeleteConfirm || 'Are you sure you want to delete all duplicates (leaving one original from each group)?';
    const confirmed = window.confirm(`${confirmMsg}\n\nTotal files to delete: ${copiesToDelete.length}`);
    if (!confirmed) return;

    addLog(`Deleting ${copiesToDelete.length} duplicate files in one click...`, 'info');

    let deletedCount = 0;
    for (const filePath of copiesToDelete) {
      const result = await window.api.deleteFile(filePath);
      if (result.success) {
        deletedCount++;
      } else {
        addLog(`Failed to delete ${filePath}: ${result.error}`, 'error');
      }
    }

    addLog(`Successfully removed ${deletedCount} duplicate files.`, 'success');
    setSelectedDuplicates(new Set());
    handleFindDuplicates();
  };

  // 4. Empty Folders Purger
  const handlePurgeEmptyFolders = async () => {
    if (isPurgingFolders || !window.api || !targetPath) return;
    playClick('click');
    setIsPurgingFolders(true);
    addLog(`Sweeping empty directories in ${targetPath}...`, 'info');

    const result = await window.api.purgeEmptyFolders(targetPath);
    if (result.success) {
      setPurgedCount(result.count);
      addLog(`Pruned ${result.count} empty directories.`, 'success');
    } else {
      addLog(`Folder purge failed: ${result.error}`, 'error');
    }
    setIsPurgingFolders(false);
  };

  // 5. Large Files Radar
  const handleScanLargeFiles = async () => {
    if (isScanningLarge || !window.api || !targetPath) return;
    playClick('click');
    setIsScanningLarge(true);
    addLog(`Scanning heavy files in ${targetPath}...`, 'info');

    const result = await window.api.getLargeFiles(targetPath);
    if (result.success && result.files) {
      setLargeFiles(result.files);
      addLog(`Radar returned top ${result.files.length} largest files.`, 'success');
    } else {
      addLog(`Big file radar scan error: ${result.error}`, 'error');
    }
    setIsScanningLarge(false);
  };

  const handleOpenFolder = async (filePath: string) => {
    if (!window.api) return;
    playClick('click');
    const pathParts = filePath.split(/[/\\]/);
    pathParts.pop();
    const dirPath = pathParts.join('\\');
    await window.api.openFolder(dirPath);
    addLog(`Opening directory: ${dirPath}`, 'info');
  };

  const handleDeleteLargeFile = async (filePath: string) => {
    if (!window.api) return;
    playClick('click');
    const confirmed = window.confirm(`Are you sure you want to delete this file?\n${filePath}`);
    if (!confirmed) return;

    const result = await window.api.deleteFile(filePath);
    if (result.success) {
      addLog(`Deleted file: ${filePath}`, 'success');
      handleScanLargeFiles();
    } else {
      addLog(`Failed to delete file: ${result.error}`, 'error');
    }
  };

  // 6. Clipboard Vault
  const handleReCopy = (text: string) => {
    playClick('click');
    navigator.clipboard.writeText(text);
    addLog('Copied item back to system clipboard.', 'success');
  };

  const handleClearClipVault = () => {
    playClick('click');
    setClipHistory([]);
    lastClipRef.current = '';
    addLog('Clipboard history cleared from Clarity memory.', 'info');
  };

  // 7. Startup Optimizer Toggle
  const handleToggleStartup = async (app: StartupApp) => {
    if (!window.api) return;
    playClick('click');
    const newStatus = !app.enabled;
    const result = await window.api.toggleStartupApp(app.name, app.path, newStatus);
    if (result.success) {
      setStartupApps(prev =>
        prev.map(item => (item.name === app.name ? { ...item, enabled: newStatus } : item))
      );
      addLog(`Startup configuration updated for '${app.name}'.`, 'success');
    } else {
      addLog(`Failed to update startup registry for ${app.name}: ${result.error}`, 'error');
    }
  };

  return (
    <div className="utilities-workspace">
      {/* Target Directory Panel */}
      {(!activeTool || ['duplicates', 'empty', 'radar'].includes(activeTool)) && (
      <div className="panel-card" style={{ marginBottom: '24px' }}>
        <span className="panel-card-title">{t.workingDir}</span>
        <div className="picker-container">
          <div className="folder-path-display">
            {targetPath || t.noneSelected}
          </div>
          <button className="action-btn-main" onClick={handleBrowseDir}>
            {t.chooseFolder}
          </button>
        </div>
      </div>
      )}

      {/* Back / reset tool button */}
      {activeTool && (
        <div style={{ marginBottom: '16px' }}>
          <button 
            className="btn"
            style={{ padding: '8px 16px', fontSize: '9px' }}
            onClick={() => { playClick('click'); setActiveTool(null); }}
          >
            {t.allUtilities || '← All Utilities'}
          </button>
        </div>
      )}

      {/* Main utilities grid split into 2 columns */}
      <div className="utilities-grid" style={activeTool ? { display: 'flex', justifyContent: 'center' } : {}}>
        
        {/* LEFT COLUMN */}
        <div className="utilities-column" style={{ display: (!activeTool || ['ram', 'sweeper', 'duplicates', 'empty'].includes(activeTool)) ? 'flex' : 'none', flex: 1 }}>
          
          {/* Card 1: RAM Optimizer (Task Manager visual) */}
          {(!activeTool || activeTool === 'ram') && (
          <div className="panel-card" id="ram-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                  <rect x="5" y="3" width="14" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 6H3M5 9H3M5 12H3M5 15H3M5 18H3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 6h2M19 9h2M19 12h2M19 15h2M19 18h2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 7h6v10H9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="panel-card-title" style={{ margin: 0 }}>{t.ramTitle}</span>
            </div>
            
            {/* Real-time Task Manager Performance Chart Grid */}
            <div className="taskmgr-performance-chart" style={{ position: 'relative', height: '120px', width: '100%', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
              <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 320 120" preserveAspectRatio="none">
                <defs>
                  <pattern id="perf-chart-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(var(--accent-rgb), 0.08)" strokeWidth="0.8" strokeDasharray="1 3" />
                  </pattern>
                  <linearGradient id="ram-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#perf-chart-grid)" />
                {(() => {
                  const points = ramHistory.map((val, i) => {
                    const x = (i / 39) * 320;
                    const y = 120 - (val / 100) * 110 - 5;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  const areaPoints = points ? `0,120 ${points} 320,120` : '';
                  return (
                    <>
                      {areaPoints && <polygon points={areaPoints} fill="url(#ram-chart-gradient)" />}
                      {points && <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" />}
                    </>
                  );
                })()}
              </svg>
              <div style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '12px', fontFamily: 'monospace', opacity: 0.6 }}>
                {ram.total.toFixed(1)} GB
              </div>
              <div style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '10px', fontFamily: 'monospace', opacity: 0.6 }}>
                {t.seconds60}
              </div>
              <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent)' }}>
                {ram.percent}{t.usedPercent}
              </div>
            </div>

            {/* Memory Structure Bar */}
            <div style={{ marginBottom: '14px' }}>
              <span className="panel-card-title" style={{ fontSize: '8px', marginBottom: '6px', display: 'block' }}>{t.memoryStructure}</span>
              <div className="memory-structure-bar" style={{ display: 'flex', height: '14px', width: '100%', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.4)' }}>
                <div style={{ width: `${ram.percent}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.4s ease' }} />
                <div style={{ width: `${100 - ram.percent}%`, height: '100%', background: 'transparent', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace', marginTop: '4px', textTransform: 'uppercase', opacity: 0.7 }}>
                <span>{t.usedRam} {(ram.total * ram.percent / 100).toFixed(2)} GB</span>
                <span>{t.availableRam} {ram.free.toFixed(2)} GB</span>
              </div>
            </div>

            <button
              className="action-btn-main"
              onClick={handlePurgeRam}
              disabled={isPurgingRam}
              style={{ width: '100%' }}
            >
              {isPurgingRam ? t.purging : t.ramOptimize}
            </button>
            {ramStatus && (
              <div className="status-label" style={{ marginTop: '10px', fontSize: '9px', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {ramStatus}
              </div>
            )}
          </div>
          )}

          {/* Card 2: System Sweeper */}
          {(!activeTool || activeTool === 'sweeper') && (
          <div className="panel-card" id="sweeper-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <span className="panel-card-title" style={{ margin: 0 }}>{t.trashTitle}</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0 16px 0' }}>
              {trashSize !== null ? formatBytes(trashSize) : 'Unscanned'}
            </div>
            <div className="stat-subvalue" style={{ marginBottom: '14px' }}>
              {t.trashSize} {t.inTempDirs}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="action-btn-main" 
                style={{ flex: 1 }} 
                onClick={scanTrash}
                disabled={isSweeping}
              >
                {t.scanCache}
              </button>
              <button 
                className="action-btn-main" 
                style={{ flex: 1 }} 
                onClick={handleCleanTrash}
                disabled={isSweeping || trashSize === 0}
              >
                {isSweeping ? t.sweeping : t.trashClean}
              </button>
            </div>
            {sweepStatus && (
              <div className="status-label" style={{ marginTop: '10px', fontSize: '9px', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {sweepStatus}
              </div>
            )}
          </div>
          )}

          {/* Card 3: Duplicate Finder */}
          {(!activeTool || activeTool === 'duplicates') && (
          <div className="panel-card" id="duplicates-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                  <rect x="8" y="8" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16V6a2 2 0 012-2h10" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11 12h6M11 16h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="panel-card-title" style={{ margin: 0 }}>{t.dupTitle}</span>
            </div>
            <button 
              className="action-btn-main" 
              onClick={handleFindDuplicates} 
              disabled={isSearchingDups || !targetPath}
              style={{ width: '100%', marginBottom: '16px' }}
            >
              {isSearchingDups ? t.searching : t.dupScan}
            </button>

            {Object.keys(duplicates).length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  className="action-btn-main"
                  onClick={autoSelectDuplicates}
                  style={{ flex: 1, fontSize: '9px', padding: '8px 4px' }}
                >
                  {t.selectCopies || 'Select Copies'}
                </button>
                <button
                  className="action-btn-main"
                  onClick={handleDeleteAllDuplicates}
                  style={{ flex: 1, fontSize: '9px', padding: '8px 4px', backgroundColor: '#ff3333', borderColor: '#ff3333', color: '#ffffff' }}
                >
                  {t.deleteAllDups || 'Delete All'}
                </button>
              </div>
            )}

            {Object.keys(duplicates).length > 0 ? (
              <div className="duplicates-wrapper" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px' }}>
                {Object.entries(duplicates).map(([hash, files]) => (
                  <div key={hash} className="duplicate-group" style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                      HASH: {hash}
                    </div>
                    {files.map(file => (
                      <div key={file.path} className="duplicate-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                        <input
                          type="checkbox"
                          checked={selectedDuplicates.has(file.path)}
                          onChange={() => toggleDupSelect(file.path)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: '8px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatBytes(file.size)} | {file.path}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                {t.noDupsLoaded}
              </div>
            )}

            {selectedDuplicates.size > 0 && (
              <button 
                className="action-btn-main" 
                onClick={deleteSelectedDuplicates}
                style={{ width: '100%', marginTop: '14px', backgroundColor: '#ff3333', borderColor: '#ff3333', color: '#ffffff' }}
              >
                {t.deleteSelected} ({selectedDuplicates.size})
              </button>
            )}
          </div>
          )}

          {/* Card 4: Empty Folder Purger */}
          {(!activeTool || activeTool === 'empty') && (
          <div className="panel-card" id="empty-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.884 2.223v6c0 1.243 1.007 2.25 2.25 2.25h15.812c1.243 0 2.25-1.007 2.25-2.25v-6a2.25 2.25 0 00-1.884-2.223m-16.5 0V6a2.25 2.25 0 012.25-2.25h5.378a2.25 2.25 0 011.59.66l2.09 2.09a2.25 2.25 0 001.59.66h5.378A2.25 2.25 0 0122 9.576" />
                  <path d="M9.75 14.25h4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="panel-card-title" style={{ margin: 0 }}>{t.emptyTitle}</span>
            </div>
            <button 
              className="action-btn-main" 
              onClick={handlePurgeEmptyFolders} 
              disabled={isPurgingFolders || !targetPath}
              style={{ width: '100%' }}
            >
              {isPurgingFolders ? t.sweeping : t.emptyPurge}
            </button>
            {purgedCount !== null && (
              <div className="status-label" style={{ marginTop: '10px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}>
                {t.emptySuccess} ({purgedCount})
              </div>
            )}
          </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="utilities-column" style={{ display: (!activeTool || ['radar', 'clipboard', 'startup'].includes(activeTool)) ? 'flex' : 'none', flex: 1 }}>

          {/* Card 5: Big File Radar */}
          {(!activeTool || activeTool === 'radar') && (
          <div className="panel-card" id="radar-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
                  <circle cx="12" cy="12" r="1" />
                  <path d="M12 12l5.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="panel-card-title" style={{ margin: 0 }}>{t.radarTitle}</span>
            </div>
            <button 
              className="action-btn-main" 
              onClick={handleScanLargeFiles} 
              disabled={isScanningLarge || !targetPath}
              style={{ width: '100%', marginBottom: '16px' }}
            >
              {isScanningLarge ? t.scanning : t.radarScan}
            </button>

            {largeFiles.length > 0 ? (
              <div className="large-files-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="vault-table" style={{ width: '100%', fontSize: '10px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px' }}>{t.file}</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t.size}</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {largeFiles.map((file, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{file.name}</span>
                          <div style={{ fontSize: '7px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.path}
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatBytes(file.size)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span className="action-link" onClick={() => handleOpenFolder(file.path)} style={{ marginRight: '8px' }}>
                            {t.open}
                          </span>
                          <span className="action-link" onClick={() => handleDeleteLargeFile(file.path)} style={{ color: '#ff3333' }}>
                            {t.del}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                {t.noLargeFiles}
              </div>
            )}
          </div>
          )}

          {/* Card 6: Clipboard Vault */}
          {(!activeTool || activeTool === 'clipboard') && (
          <div className="panel-card" id="clipboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="10" y="12" width="4" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="panel-card-title" style={{ margin: 0 }}>{t.clipTitle}</span>
              </div>
              <span className="action-link" style={{ fontSize: '8px' }} onClick={handleClearClipVault}>
                {t.clipClear}
              </span>
            </div>
            
            <div className="clipboard-vault-tape" style={{ height: '180px', overflowY: 'auto', border: '1px dashed var(--border-color)', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
              {clipHistory.length > 0 ? (
                clipHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="clip-item" 
                    style={{ 
                      padding: '8px', 
                      borderBottom: '1px solid rgba(255,255,255,0.03)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleReCopy(item)}
                  >
                    <div style={{ 
                      fontSize: '11px', 
                      fontFamily: 'monospace', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap', 
                      flex: 1, 
                      color: 'var(--text-primary)' 
                    }}>
                      {item}
                    </div>
                    <button 
                      className="btn" 
                      style={{ padding: '4px 8px', fontSize: '8px', flexShrink: 0, textTransform: 'uppercase' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReCopy(item);
                      }}
                    >
                      {t.clipCopy}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t.clipVaultEmpty}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Card 7: Startup Optimizer */}
          {(!activeTool || activeTool === 'startup') && (
          <div className="panel-card" id="startup-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="launcher-card-icon-wrapper" style={{ width: '32px', height: '32px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 5.84l-4.5 1.5 1.5-4.5a6 6 0 015.84-5.84h3v3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l3-3M18.5 9.5l3-3M9.5 14.5L5 19M14.5 9.5L19 5" />
                </svg>
              </div>
              <span className="panel-card-title" style={{ margin: 0 }}>{t.startupTitle}</span>
            </div>
            {loadingStartup ? (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '10px 0' }}>{t.loadingRegistry}</div>
            ) : startupApps.length > 0 ? (
              <div className="startup-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {startupApps.map((app, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{app.path}</div>
                    </div>
                    <button
                      className="btn"
                      onClick={() => handleToggleStartup(app)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        backgroundColor: app.enabled ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: app.enabled ? 'var(--bg-primary)' : 'var(--text-muted)',
                        border: `1px solid ${app.enabled ? 'var(--accent)' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {app.enabled ? t.on : t.off}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                {t.noStartupItems}
              </div>
            )}
          </div>
          )}
        </div>

      </div>

      {/* STARK LOG CONSOLE */}
      <div className="operations-log-container">
        <div className="console-panel">
          <div className="console-header">
            <span className="console-title">{t.consoleLogs}</span>
            <span className="action-link" style={{ fontSize: '9px' }} onClick={() => setConsoleLogs([])}>
              {t.clearLogs}
            </span>
          </div>
          <div className="console-body">
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, idx) => (
                <div key={idx} className={`console-line ${log.type}`}>
                  {log.text}
                </div>
              ))
            ) : (
              <div className="console-line">{t.noLogs}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Utilities;
