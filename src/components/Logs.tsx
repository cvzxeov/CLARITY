import React, { useState } from 'react';
import { playClick } from '../utils/audio';

interface LogEntry {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface LogsProps {
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

const Logs: React.FC<LogsProps> = ({ logs, setLogs }) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'success') return log.type === 'success';
    if (filter === 'error') return log.type === 'error';
    return true;
  });

  const handleClearLogs = () => {
    playClick('click');
    setLogs([]);
  };

  const handleFilterClick = (type: 'all' | 'success' | 'error') => {
    playClick('click');
    setFilter(type);
  };

  return (
    <div className="logs-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Header */}
      <div className="top-header">
        <div className="top-header-left">
          <h1>Журнал операций</h1>
        </div>
        <div className="top-header-right">
          <button 
            className="btn btn-primary" 
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', fontSize: 11, borderRadius: 'var(--border-radius-md)' }}
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            onMouseEnter={() => logs.length > 0 && playClick('hover')}
          >
            Очистить журнал
          </button>
        </div>
      </div>

      <div className="table-panel" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
        {/* Log Filter tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button 
            onClick={() => handleFilterClick('all')}
            onMouseEnter={() => playClick('hover')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--border-radius-md)',
              border: filter === 'all' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.05)',
              background: filter === 'all' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.02)',
              color: filter === 'all' ? '#030303' : 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Все ({logs.length})
          </button>
          <button 
            onClick={() => handleFilterClick('success')}
            onMouseEnter={() => playClick('hover')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--border-radius-md)',
              border: filter === 'success' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.05)',
              background: filter === 'success' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.02)',
              color: filter === 'success' ? '#030303' : 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Успешные ({logs.filter(l => l.type === 'success').length})
          </button>
          <button 
            onClick={() => handleFilterClick('error')}
            onMouseEnter={() => playClick('hover')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--border-radius-md)',
              border: filter === 'error' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.05)',
              background: filter === 'error' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.02)',
              color: filter === 'error' ? '#030303' : 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Ошибки ({logs.filter(l => l.type === 'error').length})
          </button>
        </div>

        {/* Console Box */}
        <div className="console-panel" style={{ flex: 1, height: '100%' }}>
          <div className="console-body" style={{ maxHeight: '100%' }}>
            {filteredLogs.length === 0 ? (
              <div className="console-line info" style={{ textAlign: 'center', marginTop: 40 }}>
                Логи отсутствуют по выбранному фильтру
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className={`console-line ${log.type}`}>
                  {log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
