import React, { useState, useEffect } from 'react';
import { playClick } from '../utils/audio';
import { TRANSLATIONS, Language } from '../utils/translations';
import { DASHBOARD_TRANSLATIONS } from '../utils/dashboard_translations';

interface HomeViewProps {
  lang: Language;
  theme: 'dark' | 'light';
}

interface SystemStats {
  cpuName: string;
  cpu: number;
  cpuSpeed: number; // in GHz
  cpuBaseSpeed: number; // in GHz
  cores: number;
  logical: number;
  l3Cache: number; // in MB
  uptime: number; // in seconds
  virt: string; // 'Включено' | 'Отключено'
  cpuCores: string; // comma-separated loads (e.g. '12,5,8,...')
  
  ramUsed: number; // in MB
  ramTotal: number; // in MB
  ramSpeed: number; // in MHz
  ramSlots: number;
  ramSlotsTotal: number;
  
  netName: string;
  netSent: number; // Bytes/sec
  netRecv: number; // Bytes/sec
  ipv4: string;
  ipv6: string;
  
  gpu: number;
  gpuName: string;
  gpuTemp: number; // in °C
  vramUsed: number; // in MB
  vramTotal: number; // in MB
  gpuDriver: string;
  gpuDriverDate: string;
}

const HomeView: React.FC<HomeViewProps> = ({ lang, theme }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  const dt = DASHBOARD_TRANSLATIONS[lang] || DASHBOARD_TRANSLATIONS['en'];
  
  const lHome = t.home || (lang === 'ru' ? 'Главная' : 'Home');

  const labelCpu = t.cpuLoad?.replace(' Load', '')?.replace('Нагрузка ', '') || 'CPU';
  const labelMemory = t.ramLoad || 'RAM';
  const labelNetwork = lang === 'ru' ? 'Сеть' : 'Network';
  const labelGpu = t.gpuLoad?.replace(' Load', '')?.replace('Нагрузка ', '') || 'GPU';

  const [stats, setStats] = useState<SystemStats>({
    cpuName: 'CPU',
    cpu: 0,
    cpuSpeed: 3.5,
    cpuBaseSpeed: 3.5,
    cores: 6,
    logical: 12,
    l3Cache: 24,
    uptime: 3600,
    virt: 'Включено',
    cpuCores: '0,0,0,0,0,0,0,0,0,0,0,0',
    ramUsed: 0,
    ramTotal: 16384,
    ramSpeed: 3200,
    ramSlots: 2,
    ramSlotsTotal: 4,
    netName: 'Ethernet',
    netSent: 0,
    netRecv: 0,
    ipv4: '192.168.1.100',
    ipv6: 'fe80::1',
    gpu: 0,
    gpuName: 'GPU',
    gpuTemp: 40,
    vramUsed: 0,
    vramTotal: 8192,
    gpuDriver: '555.55',
    gpuDriverDate: '19.05.2026',
  });

  // History logs for main graphs
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0));
  const [ramHistory, setRamHistory] = useState<number[]>(Array(30).fill(0));
  const [gpuHistory, setGpuHistory] = useState<number[]>(Array(30).fill(0));
  const [netSentHistory, setNetSentHistory] = useState<number[]>(Array(30).fill(0));
  const [netRecvHistory, setNetRecvHistory] = useState<number[]>(Array(30).fill(0));

  // Core sparkline history (dynamically sized)
  const [coresHistory, setCoresHistory] = useState<number[][]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (window.api && window.api.getSystemStats) {
        const result = await window.api.getSystemStats();
        if (result.success && result.stats) {
          const s = result.stats;
          setStats(s);

          // Standard stats
          const rPercent = s.ramTotal > 0 ? Math.round((s.ramUsed / s.ramTotal) * 100) : 0;
          setCpuHistory(prev => [...prev.slice(1), s.cpu]);
          setGpuHistory(prev => [...prev.slice(1), s.gpu]);
          setRamHistory(prev => [...prev.slice(1), rPercent]);

          // Network traffic histories
          setNetSentHistory(prev => [...prev.slice(1), s.netSent]);
          setNetRecvHistory(prev => [...prev.slice(1), s.netRecv]);

          // CPU Cores parser
          const coreLoads = s.cpuCores ? s.cpuCores.split(',').map(Number) : [];
          setCoresHistory(prev => {
            if (prev.length === 0 || prev.length !== coreLoads.length) {
              return coreLoads.map((val: number) => Array(15).fill(val));
            }
            return prev.map((arr, idx) => [...arr.slice(1), coreLoads[idx] || 0]);
          });
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Format Helper functions
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 bps';
    const bits = bytes * 8;
    if (bits < 1000) return `${bits.toFixed(0)} bps`;
    if (bits < 1000 * 1000) return `${(bits / 1000).toFixed(1)} Kbps`;
    return `${(bits / (1000 * 1000)).toFixed(1)} Mbps`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d}:${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // SVGs Wave drawings
  const drawAreaPath = (width: number, height: number, points: number[], maxVal = 100) => {
    if (points.length === 0) return '';
    const max = maxVal || 1;
    const step = width / (points.length - 1);
    let path = `M 0 ${height - (points[0] / max) * height}`;
    for (let i = 1; i < points.length; i++) {
      const x = i * step;
      const y = height - (points[i] / max) * height;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  const drawFillPath = (width: number, height: number, points: number[], maxVal = 100) => {
    const linePath = drawAreaPath(width, height, points, maxVal);
    if (!linePath) return '';
    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  };

  return (
    <div className="home-content" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2vw, 32px)', height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
      {/* Top Header */}
      <div className="top-header" style={{ marginBottom: 0, flexShrink: 0 }}>
        <div className="top-header-left">
          <h1 style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}>{lHome}</h1>
        </div>
      </div>

      {/* Changed to minmax(45%, 1fr) to force max 2 columns and scale up cards when fullscreen */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(45%, 1fr))', gap: 'clamp(16px, 2vw, 32px)', paddingBottom: '24px' }}>
        
        {/* CPU Card */}
        <div className="panel-card" style={{ padding: 'clamp(16px, 2vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 24px)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(0, 229, 255, 0.02)', border: '1px solid rgba(0, 229, 255, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700, color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }} />
                {labelCpu}
              </h2>
              <span style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>{stats.cpuName}</span>
            </div>
            <span style={{ fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, color: '#00e5ff', fontFamily: 'monospace' }}>{stats.cpu}%</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(60px, 6vw, 90px), 1fr))',
            gap: '8px',
            flex: 1,
            maxHeight: 'clamp(140px, 15vw, 240px)',
            overflowY: 'auto',
            border: '1px solid rgba(0, 229, 255, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--card-bg)'
          }}>
            {coresHistory.map((coreHist, idx) => (
              <div key={idx} style={{
                border: '1px solid rgba(0, 229, 255, 0.05)',
                borderRadius: '4px',
                padding: '6px',
                background: 'rgba(128,128,128,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 'clamp(40px, 4vw, 56px)'
              }}>
                <div style={{ fontSize: 'clamp(6px, 0.6vw, 9px)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>CORE {idx}</div>
                <svg width="100%" height="100%" viewBox="0 0 60 20" preserveAspectRatio="none" style={{ overflow: 'visible', flex: 1, minHeight: 0 }}>
                  <path d={drawAreaPath(60, 20, coreHist)} fill="none" stroke="#00e5ff" strokeWidth="1.2" />
                </svg>
                <div style={{ fontSize: 'clamp(7px, 0.7vw, 10px)', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{coreHist[coreHist.length - 1]}%</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: 'clamp(9px, 0.9vw, 12px)', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.speed}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.cpuSpeed.toFixed(2)} GHz</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.base}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.cpuBaseSpeed.toFixed(2)} GHz</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.coresLogic}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.cores} / {stats.logical}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.l3Cache}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.l3Cache} MB</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.virt}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.virt}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.uptime}</span> <strong style={{ color: 'var(--text-primary)' }}>{formatUptime(stats.uptime)}</strong></div>
          </div>
        </div>

        {/* RAM Card */}
        <div className="panel-card" style={{ padding: 'clamp(16px, 2vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 24px)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(124, 77, 255, 0.02)', border: '1px solid rgba(124, 77, 255, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700, color: '#7c4dff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c4dff', boxShadow: '0 0 8px #7c4dff' }} />
                {labelMemory}
              </h2>
              <span style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>{(stats.ramTotal / 1024).toFixed(1)} GB {dt.physicalMemory}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, color: '#7c4dff', fontFamily: 'monospace' }}>{(stats.ramUsed / 1024).toFixed(1)} GB</span>
              <div style={{ fontSize: 'clamp(12px, 1.5vw, 18px)', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 700 }}>{stats.ramTotal > 0 ? Math.round(stats.ramUsed / stats.ramTotal * 100) : 0}%</div>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', border: '1px solid rgba(124, 77, 255, 0.1)', borderRadius: '8px', background: 'var(--card-bg)', overflow: 'hidden', minHeight: 'clamp(100px, 12vw, 160px)' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ display: 'block' }}>
              <path d={drawFillPath(500, 150, ramHistory)} fill="rgba(124, 77, 255, 0.1)" />
              <path d={drawAreaPath(500, 150, ramHistory)} fill="none" stroke="#7c4dff" strokeWidth="2" />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', height: 'clamp(18px, 2vw, 32px)', width: '100%', border: '1px solid rgba(124, 77, 255, 0.2)', borderRadius: '4px', overflow: 'hidden', background: 'rgba(128,128,128,0.2)' }}>
              <div style={{ width: `${stats.ramTotal > 0 ? stats.ramUsed / stats.ramTotal * 100 : 0}%`, height: '100%', backgroundColor: '#7c4dff', transition: 'width 0.3s ease' }} />
              <div style={{ width: `${stats.ramTotal > 0 ? (stats.ramTotal - stats.ramUsed) / stats.ramTotal * 100 : 100}%`, height: '100%', backgroundColor: 'transparent' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: 'clamp(9px, 0.9vw, 12px)', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.inUse}</span> <strong style={{ color: 'var(--text-primary)' }}>{(stats.ramUsed / 1024).toFixed(1)} GB</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.available}</span> <strong style={{ color: 'var(--text-primary)' }}>{((stats.ramTotal - stats.ramUsed) / 1024).toFixed(1)} GB</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.speed}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.ramSpeed} MHz</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.slots}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.ramSlots} / {stats.ramSlotsTotal}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.cached}</span> <strong style={{ color: 'var(--text-primary)' }}>{(((stats.ramTotal - stats.ramUsed) * 0.4) / 1024).toFixed(1)} GB</strong></div>
          </div>
        </div>

        {/* GPU Card */}
        <div className="panel-card" style={{ padding: 'clamp(16px, 2vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 24px)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(255, 145, 0, 0.02)', border: '1px solid rgba(255, 145, 0, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ maxWidth: '70%' }}>
              <h2 style={{ fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700, color: '#ff9100', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff9100', boxShadow: '0 0 8px #ff9100' }} />
                {labelGpu}
              </h2>
              <span style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: 'var(--text-muted)', display: 'block', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.gpuName}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, color: '#ff9100', fontFamily: 'monospace' }}>{stats.gpu}%</span>
              <div style={{ fontSize: 'clamp(12px, 1.5vw, 18px)', color: '#ff5252', fontFamily: 'monospace', fontWeight: 700 }}>{stats.gpuTemp} °C</div>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', border: '1px solid rgba(255, 145, 0, 0.1)', borderRadius: '8px', background: 'var(--card-bg)', overflow: 'hidden', minHeight: 'clamp(100px, 12vw, 160px)' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ display: 'block' }}>
              <path d={drawFillPath(500, 150, gpuHistory)} fill="rgba(255, 145, 0, 0.1)" />
              <path d={drawAreaPath(500, 150, gpuHistory)} fill="none" stroke="#ff9100" strokeWidth="2" />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(8px, 0.8vw, 11px)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'monospace' }}>
              <span>{dt.vramUsage}</span>
              <span>{(stats.vramUsed / 1024).toFixed(1)} / {(stats.vramTotal / 1024).toFixed(1)} GB</span>
            </div>
            <div style={{ display: 'flex', height: 'clamp(10px, 1vw, 18px)', width: '100%', border: '1px solid rgba(255, 145, 0, 0.2)', borderRadius: '4px', overflow: 'hidden', background: 'rgba(128,128,128,0.2)' }}>
              <div style={{ width: `${stats.vramTotal > 0 ? (stats.vramUsed / stats.vramTotal * 100) : 0}%`, height: '100%', backgroundColor: '#ff9100', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: 'clamp(9px, 0.9vw, 12px)', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.driverVer}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.gpuDriver || 'N/A'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.driverDate}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.gpuDriverDate || 'N/A'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.directx}</span> <strong style={{ color: 'var(--text-primary)' }}>12 (FL 12.2)</strong></div>
          </div>
        </div>

        {/* Network Card */}
        <div className="panel-card" style={{ padding: 'clamp(16px, 2vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 24px)', borderRadius: 'var(--border-radius-lg)', background: 'rgba(255, 23, 68, 0.02)', border: '1px solid rgba(255, 23, 68, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ maxWidth: '60%' }}>
              <h2 style={{ fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700, color: '#ff1744', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff1744', boxShadow: '0 0 8px #ff1744' }} />
                {labelNetwork}
              </h2>
              <span style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: 'var(--text-muted)', display: 'block', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.netName}</span>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              <div style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: '#ff1744', fontWeight: 700 }}>↓ {formatBytes(stats.netRecv)}</div>
              <div style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: '#00e5ff', fontWeight: 700 }}>↑ {formatBytes(stats.netSent)}</div>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', border: '1px solid rgba(255, 23, 68, 0.1)', borderRadius: '8px', background: 'var(--card-bg)', overflow: 'hidden', minHeight: 'clamp(100px, 12vw, 160px)' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ display: 'block' }}>
              {/* Receive wave */}
              <path d={drawFillPath(500, 150, netRecvHistory, Math.max(...netRecvHistory, ...netSentHistory, 1024))} fill="rgba(255, 23, 68, 0.1)" />
              <path d={drawAreaPath(500, 150, netRecvHistory, Math.max(...netRecvHistory, ...netSentHistory, 1024))} fill="none" stroke="#ff1744" strokeWidth="2" />
              
              {/* Send wave */}
              <path d={drawAreaPath(500, 150, netSentHistory, Math.max(...netRecvHistory, ...netSentHistory, 1024))} fill="none" stroke="#00e5ff" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '8px', fontSize: 'clamp(9px, 0.9vw, 12px)', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.connection}</span> <strong style={{ color: 'var(--text-primary)' }}>Ethernet</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.ipv4}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.ipv4}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{color:'var(--text-muted)'}}>{dt.ipv6}</span> <strong style={{ color: 'var(--text-primary)' }}>{stats.ipv6}</strong></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomeView;
