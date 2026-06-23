import React, { useState } from 'react';
import { playClick } from '../utils/audio';

interface SorterProps {
  folderPath: string | null;
  onSelectFolder: (path: string) => void;
  isRecursive: boolean;
  setIsRecursive: (val: boolean) => void;
  isSorting: boolean;
  setIsSorting: (val: boolean) => void;
  progress: { total: number; processed: number };
  setProgress: (val: { total: number; processed: number }) => void;
  logs: { type: 'success' | 'error' | 'info'; text: string }[];
  setLogs: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error' | 'info'; text: string }[]>>;
  updateStats: () => void;
}

const Sorter: React.FC<SorterProps> = ({
  folderPath,
  onSelectFolder,
  isRecursive,
  setIsRecursive,
  isSorting,
  setIsSorting,
  progress,
  setProgress,
  logs,
  setLogs,
  updateStats
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

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
      const result = await window.api.startSorting(folderPath, isRecursive);
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

  return (
    <div className="sorter-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Header */}
      <div className="top-header">
        <div className="top-header-left">
          <h1>Сортировщик</h1>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '32px', flex: 1 }}>
        {/* Left Side: Controls & Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="panel-card" style={{ flex: 1, justifyContent: 'center' }}>
            <span className="panel-card-title">Выбор директории</span>

            {/* Drag & Drop Zone */}
            <div 
              className="drag-drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectFolder}
              onMouseEnter={() => playClick('hover')}
              style={{
                border: isDragOver ? '1px dashed var(--accent)' : '1px dashed var(--border-color)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragOver ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                margin: '20px 0'
              }}
            >
              <svg 
                style={{ width: '48px', height: '48px', stroke: isDragOver ? 'var(--accent)' : 'var(--text-muted)', fill: 'none', strokeWidth: 1.5 }} 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Перетащите папку сюда
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  или кликните, чтобы выбрать папку
                </p>
              </div>
            </div>

            {folderPath && (
              <div className="folder-path-display" style={{ marginBottom: '20px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                {folderPath}
              </div>
            )}

            {/* Segment Switcher */}
            <span className="panel-card-title">Режим сканирования</span>
            <div className="switcher-segment">
              <div 
                className={`switcher-option ${!isRecursive ? 'active' : ''}`}
                onClick={() => handleToggleRecursive(false)}
                onMouseEnter={() => playClick('hover')}
              >
                Поверхностно
              </div>
              <div 
                className={`switcher-option ${isRecursive ? 'active' : ''}`}
                onClick={() => handleToggleRecursive(true)}
                onMouseEnter={() => playClick('hover')}
              >
                Рекурсивно
              </div>
              <div className={`switcher-bg ${isRecursive ? 'right' : ''}`}></div>
            </div>

            <button 
              className="action-btn-main" 
              style={{ width: '100%', marginTop: '20px' }}
              onClick={handleStartSorting}
              disabled={!folderPath || isSorting}
              onMouseEnter={() => !isSorting && folderPath && playClick('hover')}
            >
              {isSorting ? "Выполнение сортировки..." : "Запустить сортировку"}
            </button>
          </div>
        </div>

        {/* Right Side: Mini Log Console */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="console-panel" style={{ flex: 1, height: 'auto' }}>
            <div className="console-header">
              <span className="console-title">
                <span className="console-dot"></span>
                Текущие операции
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>В реальном времени</span>
            </div>
            
            <div className="console-body" style={{ maxHeight: '420px' }}>
              {logs.length === 0 ? (
                <div className="console-line info">Ожидание выбора папки и запуска...</div>
              ) : (
                logs.slice(-30).map((log, idx) => (
                  <div key={idx} className={`console-line ${log.type}`}>
                    {log.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sorter;
