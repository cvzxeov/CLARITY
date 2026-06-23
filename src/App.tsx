import React, { useState, useEffect, useRef } from 'react';
import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Utilities from './components/Utilities';
import BackgroundLogo from './components/BackgroundLogo';
import HomeView from './components/HomeView';
import { Language, translateCategories, CATEGORY_TRANSLATIONS } from './utils/translations';

interface LogEntry {
  type: 'success' | 'error' | 'info';
  text: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeSubTab, setActiveSubTab] = useState<'hub' | 'sorter' | 'utilities'>('hub');
  const [focusTool, setFocusTool] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleSetActiveTab = (tab: string) => {
    if (tab === 'dashboard') {
      setActiveTab('dashboard');
      setActiveSubTab('hub');
      setFocusTool(null);
    } else if (tab === 'utilities') {
      setActiveTab('dashboard');
      setActiveSubTab('utilities');
      setFocusTool(null);
    } else {
      setActiveTab(tab);
    }
  };

  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [isRecursive, setIsRecursive] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, processed: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [folderStats, setFolderStats] = useState<any>(null);

  // Theme & Language states
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('clarity-theme') as 'dark' | 'light') || 'dark';
  });
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('clarity-lang') as Language) || 'en';
  });

  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [customFallbackName, setCustomFallbackName] = useState<string | null>(() => {
    return localStorage.getItem('clarity-custom-fallback') || null;
  });

  // Apply theme class to document body or root
  useEffect(() => {
    document.body.className = `${theme}-theme`;
    localStorage.setItem('clarity-theme', theme);
  }, [theme]);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      if (window.api) {
        const loaded = await window.api.getCategories();
        setCategories(loaded);
      }
    };
    loadCategories();
  }, []);

  // Load and apply persisted zoom factor on mount
  useEffect(() => {
    const saved = localStorage.getItem('clarity-zoom');
    if (saved && window.api && window.api.setZoomFactor) {
      window.api.setZoomFactor(parseFloat(saved));
    }
  }, []);

  const prevLangRef = useRef<Language>(lang);

  useEffect(() => {
    const oldLang = prevLangRef.current;
    if (oldLang !== lang && Object.keys(categories).length > 0) {
      const updated = translateCategories(categories, oldLang, lang);
      setCategories(updated);
      if (window.api) {
        window.api.updateCategories(updated);
      }
    }
    localStorage.setItem('clarity-lang', lang);
    prevLangRef.current = lang;
  }, [lang, categories]);

  const updateStats = async (path: string, recursive: boolean) => {
    if (!window.api) return;
    const fallbackName = customFallbackName || CATEGORY_TRANSLATIONS.misc[lang];
    const result = await window.api.getFolderStats(path, recursive, fallbackName);
    if (result.success && result.stats) {
      setFolderStats({
        stats: result.stats,
        totalFiles: result.totalFiles || 0,
        totalSize: result.totalSize || 0
      });
    }
  };

  const handleSelectFolder = (path: string) => {
    setFolderPath(path);
    setProgress({ total: 0, processed: 0 });
    setLogs([]);
    updateStats(path, isRecursive);
  };

  const handleOpenExternal = (url: string) => {
    if ((window as any).api && (window as any).api.openExternalUrl) {
      (window as any).api.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText('TRNWjg616ZDhc6gNiEmzeCwr1TYMBSFavM');
  };

  // Support modal translations per language
  const SUPPORT_PROJECT_LABELS: Record<string, string> = {
    en: 'Support Project', ru: 'Поддержать проект', zh: '支持项目', es: 'Apoyar Proyecto',
    de: 'Projekt Unterstützen', ja: 'プロジェクトを支援', pt: 'Apoiar Projeto',
    bn: 'প্রকল্প সমর্থন', hi: 'प्रोजेक्ट को सहयोग', it: 'Supporta il Progetto',
    sw: 'Kuunga Mkono Mradi', id: 'Dukung Proyek'
  };
  const SUPPORT_DESC_LABELS: Record<string, string> = {
    en: 'If you like Clarity, support development. USDT TRC20 key:',
    ru: 'Если вам нравится Clarity, поддержите развитие. Ключ USDT TRC20:',
    zh: '如果您喜欢Clarity，请支持开发。USDT TRC20地址：',
    es: 'Si te gusta Clarity, apoya el desarrollo. Clave USDT TRC20:',
    de: 'Wenn dir Clarity gefällt, unterstütze die Entwicklung. USDT TRC20-Schlüssel:',
    ja: 'Clarityが好きならば、開発をサポートしてください。USDT TRC20キー：',
    pt: 'Se você gosta do Clarity, apoie o desenvolvimento. Chave USDT TRC20:',
    bn: 'আপনি যদি Clarity পছন্দ করেন, উন্নয়নকে সমর্থন করুন। USDT TRC20 কী:',
    hi: 'यदि आप Clarity पसंद करते हैं, विकास का समर्थन करें। USDT TRC20 कुंजी:',
    it: 'Se ti piace Clarity, supporta lo sviluppo. Chiave USDT TRC20:',
    sw: 'Ukipenda Clarity, saidia maendeleo. Ufunguo wa USDT TRC20:',
    id: 'Jika Anda menyukai Clarity, dukung pengembangan. Kunci USDT TRC20:'
  };
  const COPY_LABELS: Record<string, string> = {
    en: 'Copy', ru: 'Копировать', zh: '复制', es: 'Copiar', de: 'Kopieren',
    ja: 'コピー', pt: 'Copiar', bn: 'কপি', hi: 'कॉपी करें', it: 'Copia',
    sw: 'Nakili', id: 'Salin'
  };
  const EXCHANGES_LABELS: Record<string, string> = {
    en: 'Exchanges for deposit:', ru: 'Биржи для пополнения:', zh: '充值交易所：',
    es: 'Exchanges para depósito:', de: 'Börsen zum Einzahlen:', ja: '入金取引所：',
    pt: 'Exchanges para depósito:', bn: 'জমার এক্সচেঞ্জ:', hi: 'डिपॉजिट के लिए एक्सचेंज:',
    it: 'Exchange per deposito:', sw: 'Masoko ya kuweka:', id: 'Bursa untuk deposit:'
  };

  return (
    <div className={`app-root ${theme}-theme lang-${lang}`}>
      <Titlebar theme={theme} />
      <div className="app-container">
        <BackgroundLogo theme={theme} />
        <Sidebar 
          activeTab={activeTab === 'dashboard' && activeSubTab === 'utilities' ? 'utilities' : activeTab} 
          setActiveTab={handleSetActiveTab} 
          theme={theme} 
          lang={lang}
          onSupportClick={() => setShowSupportModal(true)}
        />
        <div className="main-content">
          {activeTab === 'home' && (
            <HomeView 
              lang={lang}
              theme={theme}
            />
          )}
          {activeTab === 'dashboard' && (
            <Dashboard 
              folderPath={folderPath} 
              onSelectFolder={handleSelectFolder}
              folderStats={folderStats} 
              isRecursive={isRecursive}
              setIsRecursive={setIsRecursive}
              isSorting={isSorting}
              setIsSorting={setIsSorting}
              progress={progress}
              setProgress={setProgress}
              logs={logs}
              setLogs={setLogs}
              updateStats={() => folderPath && updateStats(folderPath, isRecursive)}
              lang={lang}
              categories={categories}
              setCategories={setCategories}
              customFallbackName={customFallbackName}
              setCustomFallbackName={setCustomFallbackName}
              activeSubTab={activeSubTab}
              setActiveSubTab={setActiveSubTab}
              focusTool={focusTool}
              setFocusTool={setFocusTool}
              theme={theme}
            />
          )}
          {activeTab === 'settings' && (
            <Settings 
              theme={theme} 
              setTheme={setTheme} 
              lang={lang} 
              setLang={setLang} 
            />
          )}
        </div>
      </div>

      {/* Support Modal - rendered at app level so it covers full screen */}
      {showSupportModal && (
        <div 
          onClick={() => setShowSupportModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div 
            className="panel-card" 
            onClick={e => e.stopPropagation()}
            style={{ width: '440px', padding: '36px', textAlign: 'center', position: 'relative', border: '1px solid var(--accent)', boxShadow: '0 0 60px rgba(var(--accent-rgb), 0.15)' }}
          >
            <button 
              onClick={() => setShowSupportModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div style={{ marginBottom: '24px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {SUPPORT_PROJECT_LABELS[lang] || 'Support Project'}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {SUPPORT_DESC_LABELS[lang] || 'If you like Clarity, support development. USDT TRC20 key:'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', gap: '12px', overflow: 'hidden' }}>
              <code style={{ flex: 1, color: 'var(--accent)', fontSize: '10px', userSelect: 'all', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', textAlign: 'left' }}>TRNWjg616ZDhc6gNiEmzeCwr1TYMBSFavM</code>
              <button className="action-btn-main" style={{ padding: '8px 14px', fontSize: '9px', minWidth: 'auto', flexShrink: 0, width: 'auto' }} onClick={handleCopyKey}>
                {COPY_LABELS[lang] || 'Copy'}
              </button>
            </div>

            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {EXCHANGES_LABELS[lang] || 'Exchanges for deposit:'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button className="btn" style={{ padding: '12px' }} onClick={() => handleOpenExternal('https://www.binance.com')}>Binance</button>
              <button className="btn" style={{ padding: '12px' }} onClick={() => handleOpenExternal('https://www.bybit.com')}>Bybit</button>
              <button className="btn" style={{ padding: '12px' }} onClick={() => handleOpenExternal('https://www.okx.com')}>OKX</button>
              <button className="btn" style={{ padding: '12px' }} onClick={() => handleOpenExternal('https://www.htx.com')}>HTX</button>
              <button className="btn" style={{ padding: '12px', gridColumn: '1 / -1' }} onClick={() => handleOpenExternal('https://www.kucoin.com')}>KuCoin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
