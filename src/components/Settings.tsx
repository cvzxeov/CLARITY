import React, { useState } from 'react';
import { playClick } from '../utils/audio';
import { TRANSLATIONS, Language } from '../utils/translations';

interface SettingsProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

const Settings: React.FC<SettingsProps> = ({ theme, setTheme, lang, setLang }) => {
  const t = TRANSLATIONS[lang];

  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('clarity-zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const handleZoomChange = (factor: number) => {
    playClick('click');
    setZoomLevel(factor);
    localStorage.setItem('clarity-zoom', factor.toString());
    if (window.api && window.api.setZoomFactor) {
      window.api.setZoomFactor(factor);
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    playClick('click');
    setTheme(newTheme);
  };

  const handleLangChange = (newLang: Language) => {
    playClick('click');
    setLang(newLang);
  };

  // Flag components drawn inline with clean, geometric SVGs
  const renderFlag = (code: Language) => {
    switch (code) {
      case 'en': // UK/US Hybrid
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="20" height="14" fill="#00247d"/>
            <path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="2.5"/>
            <path d="M0 0l20 14M20 0L0 14" stroke="#cf142b" strokeWidth="1.2"/>
            <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4.5"/>
            <path d="M10 0v14M0 7h20" stroke="#cf142b" strokeWidth="2.5"/>
          </svg>
        );
      case 'ru':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <rect width="20" height="4.6" fill="#fff"/>
            <rect y="4.6" width="20" height="4.8" fill="#0039a6"/>
            <rect y="9.4" width="20" height="4.6" fill="#d52b1e"/>
          </svg>
        );
      case 'zh':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="20" height="14" fill="#ee1c25"/>
            <polygon points="5,4 6,7 4,5 7,5 5,7" fill="#ffff00"/>
          </svg>
        );
      case 'es':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="20" height="3.5" fill="#c60b1e"/>
            <rect y="3.5" width="20" height="7" fill="#ffc400"/>
            <rect y="10.5" width="20" height="3.5" fill="#c60b1e"/>
          </svg>
        );
      case 'de':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="20" height="4.6" fill="#000"/>
            <rect y="4.6" width="20" height="4.8" fill="#dd0000"/>
            <rect y="9.4" width="20" height="4.6" fill="#ffcc00"/>
          </svg>
        );
      case 'ja':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <rect width="20" height="14" fill="#fff"/>
            <circle cx="10" cy="7" r="4" fill="#bc002d"/>
          </svg>
        );
      case 'pt':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="8" height="14" fill="#006600"/>
            <rect x="8" width="12" height="14" fill="#ff0000"/>
            <circle cx="8" cy="7" r="1.5" fill="#ffff00"/>
          </svg>
        );
      case 'bn':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="20" height="14" fill="#006a4e"/>
            <circle cx="9" cy="7" r="3.8" fill="#f42a41"/>
          </svg>
        );
      case 'hi':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="20" height="4.6" fill="#ff9933"/>
            <rect y="4.6" width="20" height="4.8" fill="#fff"/>
            <rect y="9.4" width="20" height="4.6" fill="#138808"/>
            <circle cx="10" cy="7" r="1" fill="#000080"/>
          </svg>
        );
      case 'it':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <rect width="6.6" height="14" fill="#009246"/>
            <rect x="6.6" width="6.8" height="14" fill="#fff"/>
            <rect x="13.4" width="6.6" height="14" fill="#ce2b37"/>
          </svg>
        );
      case 'sw': // Tanzania Diagonal Design
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2 }}>
            <polygon points="0,0 20,0 0,14" fill="#1eb53a"/>
            <polygon points="20,0 20,14 0,14" fill="#00a3dd"/>
            <line x1="0" y1="14" x2="20" y2="0" stroke="#fcd116" strokeWidth="3.5"/>
            <line x1="0" y1="14" x2="20" y2="0" stroke="#000" strokeWidth="2"/>
          </svg>
        );
      case 'id':
        return (
          <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <rect width="20" height="7" fill="#ff0000"/>
            <rect y="7" width="20" height="7" fill="#fff"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const languagesList: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ja', name: '日本語' },
    { code: 'pt', name: 'Português' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'it', name: 'Italiano' },
    { code: 'sw', name: 'Kiswahili' },
    { code: 'id', name: 'Bahasa Indonesia' }
  ];

  const lUiScale = t.uiScale || (lang === 'ru' ? 'Масштаб интерфейса' : 'UI Scaling');

  const zoomOptions = [
    { label: '75%', value: 0.75 },
    { label: '90%', value: 0.90 },
    { label: '100%', value: 1.00 },
    { label: '110%', value: 1.10 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.50 },
  ];

  return (
    <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header */}
      <div className="top-header">
        <div className="top-header-left">
          <h1>{t.settings}</h1>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
        
        {/* Left Column: Theme and Scaling */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Theme Switcher */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <span className="panel-card-title">{t.theme}</span>
            <div className="switcher-segment" style={{ marginTop: '12px' }}>
              <div 
                className={`switcher-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
                onMouseEnter={() => playClick('hover')}
              >
                {t.light}
              </div>
              <div 
                className={`switcher-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                onMouseEnter={() => playClick('hover')}
              >
                {t.dark}
              </div>
              <div className={`switcher-bg ${theme === 'dark' ? 'right' : ''}`}></div>
            </div>
          </div>

          {/* Card 3: UI Scaling */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <span className="panel-card-title" style={{ marginBottom: '16px', display: 'block' }}>{lUiScale}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {zoomOptions.map((opt) => {
                const isSelected = Math.abs(zoomLevel - opt.value) < 0.01;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleZoomChange(opt.value)}
                    onMouseEnter={() => playClick('hover')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--border-radius-md)',
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span style={{ color: 'var(--accent)', fontSize: '10px' }}>●</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Language Switcher Grid */}
        <div className="panel-card" style={{ padding: '24px' }}>
          <span className="panel-card-title">{t.language}</span>
          
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
              gap: '12px', 
              marginTop: '16px' 
            }}
          >
            {languagesList.map((langItem) => {
              const isSelected = lang === langItem.code;
              return (
                <div
                  key={langItem.code}
                  onClick={() => handleLangChange(langItem.code)}
                  onMouseEnter={() => playClick('hover')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: 'var(--border-radius-md)',
                    background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {renderFlag(langItem.code)}
                  <span>{langItem.name}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
