import React, { useState, useEffect } from 'react';
import { playClick } from '../utils/audio';
import { TRANSLATIONS, Language, CATEGORY_TRANSLATIONS, CATEGORY_KEYS, UTILITY_TRANSLATIONS } from '../utils/translations';
import Utilities from './Utilities';

interface PreScanStats {
  stats: Record<string, number>;
  totalFiles: number;
  totalSize: number;
}

interface LogEntry {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface DashboardProps {
  folderPath: string | null;
  onSelectFolder: (path: string) => void;
  folderStats: PreScanStats | null;
  isRecursive: boolean;
  setIsRecursive: (val: boolean) => void;
  isSorting: boolean;
  setIsSorting: (val: boolean) => void;
  progress: { total: number; processed: number };
  setProgress: (val: { total: number; processed: number }) => void;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  updateStats: () => void;
  lang: Language;
  categories: Record<string, string[]>;
  setCategories: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  customFallbackName: string | null;
  setCustomFallbackName: (name: string | null) => void;
  activeSubTab: 'hub' | 'sorter' | 'utilities';
  setActiveSubTab: (val: 'hub' | 'sorter' | 'utilities') => void;
  focusTool: string | null;
  setFocusTool: (val: string | null) => void;
  theme: 'dark' | 'light';
}

const Dashboard: React.FC<DashboardProps> = ({
  folderPath,
  onSelectFolder,
  folderStats,
  isRecursive,
  setIsRecursive,
  isSorting,
  setIsSorting,
  progress,
  setProgress,
  logs,
  setLogs,
  updateStats,
  lang,
  categories,
  setCategories,
  customFallbackName,
  setCustomFallbackName,
  activeSubTab,
  setActiveSubTab,
  focusTool,
  setFocusTool,
  theme
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('Images');
  const [newExtension, setNewExtension] = useState<string>('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const fallbackName = customFallbackName || CATEGORY_TRANSLATIONS.misc[lang];

  useEffect(() => {
    // If activeCategory matches a default translation, update it on lang change
    const order = ['images', 'video', 'documents', 'archives', 'audio', 'programs'];
    for (const type of order) {
      const translations = Object.values(CATEGORY_TRANSLATIONS[type as keyof typeof CATEGORY_TRANSLATIONS]);
      if (translations.some(t => t.toLowerCase() === activeCategory.toLowerCase())) {
        setActiveCategory(CATEGORY_TRANSLATIONS[type as keyof typeof CATEGORY_TRANSLATIONS][lang]);
        break;
      }
    }
  }, [lang]);

  useEffect(() => {
    const keys = Object.keys(categories);
    if (keys.length > 0 && !keys.includes(activeCategory)) {
      const imagesKey = keys.find(key => {
        const translations = Object.values(CATEGORY_TRANSLATIONS.images);
        return translations.some(t => t.toLowerCase() === key.toLowerCase());
      });
      setActiveCategory(imagesKey || keys[0]);
    }
  }, [categories]);

  const getOrderedCategories = () => {
    const keys = Object.keys(categories);
    const order = ['images', 'video', 'documents', 'archives', 'audio', 'programs'];
    const ordered: string[] = [];
    
    for (const defaultType of order) {
      const match = keys.find(key => {
        const translations = Object.values(CATEGORY_TRANSLATIONS[defaultType as keyof typeof CATEGORY_TRANSLATIONS]);
        return translations.some(t => t.toLowerCase() === key.toLowerCase());
      });
      if (match) {
        ordered.push(match);
      }
    }
    
    for (const key of keys) {
      if (!ordered.includes(key)) {
        ordered.push(key);
      }
    }
    
    return ordered;
  };

  const startEditing = (key: string) => {
    playClick('click');
    setEditingKey(key);
    setEditingValue(key === '__fallback__' ? fallbackName : key);
  };

  const saveEditing = () => {
    if (!editingValue.trim()) {
      setEditingKey(null);
      return;
    }
    
    const newVal = editingValue.trim();
    playClick('click');
    
    if (editingKey === '__fallback__') {
      setCustomFallbackName(newVal);
      localStorage.setItem('clarity-custom-fallback', newVal);
      setEditingKey(null);
      return;
    }
    
    if (editingKey && editingKey !== newVal) {
      if (categories[newVal]) {
        alert(TRANSLATIONS[lang].alreadyExists || 'Category name already exists!');
        setEditingKey(null);
        return;
      }
      
      const updated = { ...categories };
      updated[newVal] = updated[editingKey];
      delete updated[editingKey];
      
      setCategories(updated);
      if (window.api) {
        window.api.updateCategories(updated);
      }
      
      if (activeCategory === editingKey) {
        setActiveCategory(newVal);
      }
    }
    
    setEditingKey(null);
  };

  const handleSelectFolder = async () => {
    playClick('click');
    if (!window.api) {
      alert("API не найдено. Запустите приложение через Electron.");
      return;
    }
    const path = await window.api.selectFolder();
    if (path) {
      onSelectFolder(path);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    playClick('click');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const path = (file as any).path;
      if (path) {
        onSelectFolder(path);
      }
    }
  };

  const handleStartSorting = async () => {
    playClick('click');
    if (!folderPath || !window.api) return;
    setIsSorting(true);
    setProgress({ total: 0, processed: 0 });
    setLogs([{ type: 'info', text: `[Начало] Сканирование: ${folderPath}` }]);

    try {
      const result = await window.api.startSorting(folderPath, isRecursive, fallbackName);
      if (result.success) {
        setLogs((prev) => [...prev, { type: 'success', text: `[Завершено] ${result.message}` }]);
        updateStats();
      } else {
        setLogs((prev) => [...prev, { type: 'error', text: `[Ошибка] ${result.error}` }]);
      }
    } catch (e: any) {
      setLogs((prev) => [...prev, { type: 'error', text: `[Ошибка] ${e.message}` }]);
    } finally {
      setIsSorting(false);
    }
  };

  const handleToggleRecursive = (val: boolean) => {
    playClick('click');
    setIsRecursive(val);
  };

  const handleOpenFolder = async (categoryName: string) => {
    playClick('click');
    if (!folderPath || !window.api) return;
    const folder = categoryName === '__fallback__' ? fallbackName : categoryName;
    const targetPath = `${folderPath}/${folder}`;
    await window.api.openFolder(targetPath);
  };

  const handleSaveChanges = async (updatedCategories: Record<string, string[]>) => {
    if (!window.api) return;
    await window.api.updateCategories(updatedCategories);
  };

  const handleAddExtension = (e: React.FormEvent) => {
    e.preventDefault();
    playClick('click');
    if (!newExtension.trim()) return;

    let ext = newExtension.trim().toLowerCase();
    if (!ext.startsWith('.')) {
      ext = '.' + ext;
    }

    const t = TRANSLATIONS[lang];
    if (categories[activeCategory]?.includes(ext)) {
      alert(t.alreadyExists || "Format already exists!");
      return;
    }

    const updated = {
      ...categories,
      [activeCategory]: [...(categories[activeCategory] || []), ext]
    };
    setCategories(updated);
    setNewExtension('');
    handleSaveChanges(updated);
  };

  const handleRemoveExtension = (ext: string) => {
    playClick('click');
    const updated = {
      ...categories,
      [activeCategory]: (categories[activeCategory] || []).filter((e) => e !== ext)
    };
    setCategories(updated);
    handleSaveChanges(updated);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const numBlocks = 30;
  const filledBlocks = Math.round((percent / 100) * numBlocks);

  const getChartPoints = () => {
    const categoriesList = ['Изображения', 'Видео', 'Документы', 'Архивы', 'Аудио', 'Программы', 'Разное'];
    if (!folderStats) {
      return categoriesList.map((_, i) => `${10 + i * 40},100`).join(' ');
    }
    const maxVal = Math.max(...categoriesList.map(c => folderStats.stats[c] || 0), 1);
    return categoriesList.map((cat, index) => {
      const x = 10 + index * 40;
      const count = folderStats.stats[cat] || 0;
      const y = 100 - (count / maxVal) * 80;
      return `${x},${y}`;
    }).join(' ');
  };

  const chartPoints = getChartPoints();
  const chartAreaPoints = chartPoints ? `10,110 ${chartPoints} 250,110` : "";

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'success') return log.type === 'success';
    if (logFilter === 'error') return log.type === 'error';
    return true;
  });

  const t = TRANSLATIONS[lang];
  const ut = UTILITY_TRANSLATIONS[lang] || UTILITY_TRANSLATIONS['en'];

  // Breadcrumbs Component
  const renderBreadcrumbs = (currentTitle: string) => (
    <div className="breadcrumb-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <span 
        className="breadcrumb-link" 
        onClick={() => { playClick('click'); setActiveSubTab('hub'); }}
        style={{ cursor: 'pointer', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}
      >
        {ut.controlPanelTitle}
      </span>
      <span className="breadcrumb-separator" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/</span>
      <span className="breadcrumb-current" style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.5px' }}>
        {currentTitle}
      </span>
    </div>
  );

  if (activeSubTab === 'utilities') {
    return (
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="top-header" style={{ marginBottom: 0 }}>
          <div className="top-header-left">
            {renderBreadcrumbs(ut.utilities)}
            <h1 style={{ marginTop: '4px' }}>{ut.utilities}</h1>
          </div>
          <div className="top-header-right">
            {folderPath && (
              <div className="profile-card" style={{ padding: '8px 16px', background: 'rgba(var(--accent-rgb), 0.03)', borderColor: 'var(--border-color)' }}>
                <span className="profile-name" style={{ color: 'var(--accent)' }}>{t.activeFolder}</span>
                <span className="profile-id" style={{ color: 'var(--text-primary)', marginLeft: 8, fontFamily: 'monospace' }}>
                  {folderPath}
                </span>
              </div>
            )}
          </div>
        </div>
        <Utilities folderPath={folderPath} onSelectFolder={onSelectFolder} lang={lang} theme={theme} focusTool={focusTool} setFocusTool={setFocusTool} />
      </div>
    );
  }

  if (activeSubTab === 'sorter') {
    return (
      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="top-header" style={{ marginBottom: 0 }}>
          <div className="top-header-left">
            {renderBreadcrumbs(ut.sorterTitle)}
            <h1 style={{ marginTop: '4px' }}>{ut.sorterTitle}</h1>
          </div>
          <div className="top-header-right">
            {folderPath && (
              <div className="profile-card" style={{ padding: '8px 16px', background: 'rgba(var(--accent-rgb), 0.03)', borderColor: 'var(--border-color)' }}>
                <span className="profile-name" style={{ color: 'var(--accent)' }}>{t.activeFolder}</span>
                <span className="profile-id" style={{ color: 'var(--text-primary)', marginLeft: 8, fontFamily: 'monospace' }}>
                  {folderPath}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left Side: Directory Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="panel-card" style={{ flex: 1 }}>
              <span className="panel-card-title">{t.workingDir}</span>
              <div 
                className="drag-zone"
                onClick={handleSelectFolder}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragOver ? '2px dashed var(--accent)' : '2px dashed var(--border-color)',
                  borderRadius: 'var(--border-radius-lg)',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragOver ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.01)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <svg 
                  style={{ width: '36px', height: '36px', stroke: isDragOver ? 'var(--accent)' : 'var(--text-muted)', fill: 'none', strokeWidth: 1.5 }} 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t.dragHere}
                  </p>
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {t.clickSelect}
                  </p>
                </div>
              </div>

              {/* Recursion toggler & Stats */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span className="panel-card-title" style={{ marginBottom: 8, display: 'block' }}>{t.scanMethod}</span>
                  <div className="switcher-segment" style={{ marginBottom: 0 }}>
                    <div 
                      className={`switcher-option ${!isRecursive ? 'active' : ''}`}
                      onClick={() => handleToggleRecursive(false)}
                      onMouseEnter={() => playClick('hover')}
                    >
                      {t.root}
                    </div>
                    <div 
                      className={`switcher-option ${isRecursive ? 'active' : ''}`}
                      onClick={() => handleToggleRecursive(true)}
                      onMouseEnter={() => playClick('hover')}
                    >
                      {t.recursive}
                    </div>
                    <div className={`switcher-bg ${isRecursive ? 'right' : ''}`}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                  <span className="panel-card-title" style={{ marginBottom: 8, display: 'block' }}>{t.filesWeight}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '38px', paddingLeft: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      {folderStats ? `${folderStats.totalFiles} ${t.files}` : `0 ${t.files}`}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 2 }}>
                      {folderStats ? formatBytes(folderStats.totalSize) : "0 KB"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organize Button */}
              <button 
                className="action-btn-main" 
                style={{ width: '100%', marginTop: '24px' }}
                onClick={handleStartSorting}
                disabled={!folderPath || isSorting}
                onMouseEnter={() => !isSorting && folderPath && playClick('hover')}
              >
                {isSorting ? t.sorting : t.startSort}
              </button>
            </div>

            {/* Progress Tracker Widget */}
            <div className="panel-card" style={{ padding: '20px 24px' }}>
              <div className="blocky-progress-label">
                <span className="panel-card-title" style={{ marginBottom: 0 }}>{t.progress}</span>
                <span className="blocky-progress-percent">{percent}% ({progress.processed} / {progress.total})</span>
              </div>
              <div className="blocky-progress-blocks">
                {Array.from({ length: numBlocks }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`progress-block ${i < filledBlocks ? 'filled' : ''}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Graph & Logs Terminal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Category distribution curve chart */}
            <div className="panel-card" style={{ flex: 1, padding: '20px 24px' }}>
              <span className="panel-card-title">{t.formatsDist}</span>
              <div className="chart-container" style={{ height: '90px', marginTop: 'auto' }}>
                <svg className="chart-svg" viewBox="0 0 260 120" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {chartAreaPoints && (
                    <polygon points={chartAreaPoints} fill="url(#chart-gradient)" />
                  )}
                  {chartPoints && (
                    <polyline points={chartPoints} className="chart-line" />
                  )}
                </svg>
              </div>
            </div>

            {/* Console Log Terminal */}
            <div className="console-panel" style={{ flex: 2, height: 'auto' }}>
              <div className="console-header">
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span 
                    onClick={() => { playClick('click'); setLogFilter('all'); }}
                    style={{ fontSize: 9, cursor: 'pointer', fontWeight: logFilter === 'all' ? 700 : 400, textDecoration: logFilter === 'all' ? 'underline' : 'none' }}
                  >
                    {t.all} ({logs.length})
                  </span>
                  <span 
                    onClick={() => { playClick('click'); setLogFilter('success'); }}
                    style={{ fontSize: 9, cursor: 'pointer', fontWeight: logFilter === 'success' ? 700 : 400, textDecoration: logFilter === 'success' ? 'underline' : 'none' }}
                  >
                    {t.success} ({logs.filter(l => l.type === 'success').length})
                  </span>
                  <span 
                    onClick={() => { playClick('click'); setLogFilter('error'); }}
                    style={{ fontSize: 9, cursor: 'pointer', fontWeight: logFilter === 'error' ? 700 : 400, textDecoration: logFilter === 'error' ? 'underline' : 'none' }}
                  >
                    {t.errors} ({logs.filter(l => l.type === 'error').length})
                  </span>
                </div>
                <span 
                  style={{ fontSize: 9, cursor: 'pointer', opacity: 0.6, textDecoration: 'underline' }}
                  onClick={() => { playClick('click'); setLogs([]); }}
                >
                  {t.clear}
                </span>
              </div>
              
              <div className="console-body" style={{ maxHeight: '200px' }}>
                {filteredLogs.length === 0 ? (
                  <div className="console-line info">{t.logsEmpty}</div>
                ) : (
                  filteredLogs.slice(-40).map((log, idx) => (
                    <div key={idx} className={`console-line ${log.type}`}>
                      {log.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Categories configuration row */}
        <div className="table-panel" style={{ marginTop: '24px' }}>
          <div className="table-header">
            <span className="table-title">{t.folderCategories}</span>
          </div>
          <div className="table-container">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>{t.category}</th>
                  <th>{t.formats}</th>
                  <th>{t.found}</th>
                  <th>{t.explorer}</th>
                </tr>
              </thead>
              <tbody>
                {getOrderedCategories().map((catName) => {
                  const count = folderStats?.stats[catName] || 0;
                  const isSelected = activeCategory === catName;
                  const isEditing = editingKey === catName;

                  return (
                    <tr 
                      key={catName} 
                      style={{ 
                        cursor: 'pointer', 
                        backgroundColor: isSelected ? 'rgba(var(--accent-rgb), 0.03)' : 'transparent',
                        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent'
                      }}
                      onClick={() => { playClick('click'); setActiveCategory(catName); }}
                    >
                      <td>
                        <div className="vault-info">
                          <div className="vault-icon" style={{ background: isSelected ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.1)', color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
                            {catName[0]}
                          </div>
                          <div>
                            {isEditing ? (
                              <input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing();
                                  if (e.key === 'Escape') setEditingKey(null);
                                }}
                                onBlur={saveEditing}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--accent)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  outline: 'none'
                                }}
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="vault-name">/{catName}</span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(catName);
                                  }}
                                  style={{ cursor: 'pointer', opacity: 0.3, fontSize: '10px' }}
                                  title="Rename"
                                >
                                  ✎
                                </span>
                              </div>
                            )}
                            <div className="vault-desc">{t.category}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="vault-stat" style={{ color: '#B5B5B5', fontSize: '11px' }}>
                          {categories[catName]?.join(', ')}
                        </span>
                      </td>
                      <td>
                        <span className="vault-stat">{count}</span>
                      </td>
                      <td>
                        {folderPath ? (
                          <span 
                            className="action-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick('click');
                              if (window.api) {
                                window.api.openFolder(folderPath + '/' + catName);
                              }
                            }}
                            onMouseEnter={() => playClick('hover')}
                          >
                            {t.open}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>{t.unavailable}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                
                {/* Fallback category row */}
                {(() => {
                  const count = folderStats?.stats[fallbackName] || 0;
                  const isSelected = activeCategory === fallbackName;
                  const isEditing = editingKey === '__fallback__';
                  
                  return (
                    <tr 
                      onClick={() => setActiveCategory(fallbackName)}
                      style={{ 
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                      }}
                    >
                      <td>
                        <div className="vault-info">
                          <div className="vault-icon" style={{ background: isSelected ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.1)', color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
                            {fallbackName[0]}
                          </div>
                          <div>
                            {isEditing ? (
                              <input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing();
                                  if (e.key === 'Escape') setEditingKey(null);
                                }}
                                onBlur={saveEditing}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--accent)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)',
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  outline: 'none'
                                }}
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="vault-name">/{fallbackName}</span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing('__fallback__');
                                  }}
                                  style={{ cursor: 'pointer', opacity: 0.3, fontSize: '10px' }}
                                  title="Rename"
                                >
                                  ✎
                                </span>
                              </div>
                            )}
                            <div className="vault-desc">{t.category}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="vault-stat" style={{ color: '#B5B5B5', fontSize: '11px' }}>
                          {t.unsupported}
                        </span>
                      </td>
                      <td>
                        <span className="vault-stat">{count}</span>
                      </td>
                      <td>
                        {folderPath ? (
                          <span 
                            className="action-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick('click');
                              if (window.api) {
                                window.api.openFolder(folderPath + '/' + fallbackName);
                              }
                            }}
                            onMouseEnter={() => playClick('hover')}
                          >
                            {t.open}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>{t.unavailable}</span>
                        )}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extensions configuration Panel (relocated from Settings) */}
        {activeCategory && (
          <div className="table-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <span className="table-title">{t.allowedFormats} /{activeCategory}</span>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px', 
                margin: '12px 0',
                background: 'rgba(255, 255, 255, 0.01)',
                padding: '12px',
                borderRadius: 'var(--border-radius-md)',
                minHeight: '120px',
                alignContent: 'flex-start',
                border: '1px solid var(--border-color)',
                overflowY: 'auto'
              }}
            >
              {categories[activeCategory]?.length === 0 ? (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', margin: 'auto' }}>
                  {t.noExtensions}
                </span>
              ) : (
                categories[activeCategory]?.map((ext) => (
                  <div
                    key={ext}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span>{ext}</span>
                    <span 
                      style={{ cursor: 'pointer', opacity: 0.7, fontSize: 9 }}
                      onClick={() => handleRemoveExtension(ext)}
                      onMouseEnter={() => playClick('hover')}
                    >
                      ✕
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Add format inline form */}
            <form onSubmit={handleAddExtension} style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
              <input
                type="text"
                placeholder={`${t.example}: .heic`}
                value={newExtension}
                onChange={(e) => setNewExtension(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '11px'
                }}
              />
              <button 
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0 16px', fontSize: 10, borderRadius: 'var(--border-radius-md)' }}
                onMouseEnter={() => playClick('hover')}
              >
                +
              </button>
            </form>
          </div>
        )}

    </div>
    );
  }

  // Default Hub View (activeSubTab === 'hub')
  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="top-header" style={{ marginBottom: 0 }}>
        <div className="top-header-left">
          <h1>{ut.controlPanelTitle}</h1>
        </div>
        <div className="top-header-right">
          {folderPath && (
            <div className="profile-card" style={{ padding: '8px 16px', background: 'rgba(var(--accent-rgb), 0.03)', borderColor: 'var(--border-color)' }}>
              <span className="profile-name" style={{ color: 'var(--accent)' }}>{t.activeFolder}</span>
              <span className="profile-id" style={{ color: 'var(--text-primary)', marginLeft: 8, fontFamily: 'monospace' }}>
                {folderPath}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Directory Selector */}
      <div className="panel-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
          <span className="panel-card-title" style={{ margin: 0, fontSize: '8px' }}>{t.workingDir}</span>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: folderPath ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folderPath || t.noFolder}
          </div>
        </div>
        <button 
          className="action-btn-main" 
          style={{ padding: '10px 20px', flexShrink: 0, fontSize: '10px' }}
          onClick={handleSelectFolder}
          onMouseEnter={() => playClick('hover')}
        >
          {lang === 'ru' ? 'ВЫБРАТЬ ПАПКУ' : 'CHOOSE FOLDER'}
        </button>
      </div>

      {/* Launcher Grid */}
      <div className="launcher-grid">
        {/* Card 1: File Sorter */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('sorter'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.884 2.223v6c0 1.243 1.007 2.25 2.25 2.25h15.812c1.243 0 2.25-1.007 2.25-2.25v-6a2.25 2.25 0 00-1.884-2.223m-16.5 0V6a2.25 2.25 0 012.25-2.25h5.378a2.25 2.25 0 011.59.66l2.09 2.09a2.25 2.25 0 001.59.66h5.378A2.25 2.25 0 0122 9.576" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25v5.25M9 13.5l3-3 3 3" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.sorterTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescSorter}</span>
          </div>
        </div>

        {/* Card 2: RAM Optimizer */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('ram'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <rect x="5" y="3" width="14" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 6H3M5 9H3M5 12H3M5 15H3M5 18H3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6h2M19 9h2M19 12h2M19 15h2M19 18h2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 7h6v10H9z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.ramTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescRam}</span>
          </div>
        </div>

        {/* Card 3: System Sweeper */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('sweeper'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.trashTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescTrash}</span>
          </div>
        </div>

        {/* Card 4: Duplicate Finder */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('duplicates'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <rect x="8" y="8" width="12" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16V6a2 2 0 012-2h10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 12h6M11 16h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.dupTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescDup}</span>
          </div>
        </div>

        {/* Card 5: Empty Folder Purger */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('empty'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.884 2.223v6c0 1.243 1.007 2.25 2.25 2.25h15.812c1.243 0 2.25-1.007 2.25-2.25v-6a2.25 2.25 0 00-1.884-2.223m-16.5 0V6a2.25 2.25 0 012.25-2.25h5.378a2.25 2.25 0 011.59.66l2.09 2.09a2.25 2.25 0 001.59.66h5.378A2.25 2.25 0 0122 9.576" />
              <path d="M9.75 14.25h4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.emptyTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescEmpty}</span>
          </div>
        </div>

        {/* Card 6: Big File Radar */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('radar'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
              <circle cx="12" cy="12" r="1" />
              <path d="M12 12l5.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.radarTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescRadar}</span>
          </div>
        </div>

        {/* Card 7: Clipboard Vault */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('clipboard'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="10" y="12" width="4" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.clipTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescClip}</span>
          </div>
        </div>

        {/* Card 8: Startup Optimizer */}
        <div 
          className="launcher-card" 
          onClick={() => { playClick('click'); setActiveSubTab('utilities'); setFocusTool('startup'); }}
          onMouseEnter={() => playClick('hover')}
        >
          <div className="launcher-card-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="launcher-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 5.84l-4.5 1.5 1.5-4.5a6 6 0 015.84-5.84h3v3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l3-3M18.5 9.5l3-3M9.5 14.5L5 19M14.5 9.5L19 5" />
            </svg>
          </div>
          <div className="launcher-card-info">
            <span className="launcher-card-title">{ut.startupTitle}</span>
            <span className="launcher-card-desc">{ut.launcherDescStartup}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
