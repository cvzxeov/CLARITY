import React from 'react';
import logoWhite from '../img/logo_white.png';
import logoBlack from '../img/logo_black.png';
import { playClick } from '../utils/audio';
import { TRANSLATIONS, Language, UTILITY_TRANSLATIONS } from '../utils/translations';

const SUPPORT_LABELS: Record<string, string> = {
  en: 'Support', ru: 'Поддержать', zh: '支持', es: 'Apoyar', de: 'Unterstützen',
  ja: 'サポート', pt: 'Apoiar', bn: 'সমর্থন', hi: 'समर्थन', it: 'Supporta',
  sw: 'Kusaidia', id: 'Dukung'
};

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'dark' | 'light';
  lang: Language;
  onSupportClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, lang, onSupportClick }) => {
  const handleNavClick = (tab: string) => {
    playClick('click');
    setActiveTab(tab);
  };

  const currentLogo = theme === 'dark' ? logoWhite : logoBlack;
  const t = TRANSLATIONS[lang];

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <img src={currentLogo} alt="Clarity" className="brand-logo" />
          <span className="brand-text">Clarity</span>
        </div>

        <div className="nav-menu">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
            onMouseEnter={() => playClick('hover')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            {t.manage}
          </div>

          <div
            className={`nav-item ${activeTab === 'utilities' ? 'active' : ''}`}
            onClick={() => handleNavClick('utilities')}
            onMouseEnter={() => playClick('hover')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" style={{ fill: 'none', strokeWidth: '2.5' }}>
              <path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 6 8.5" stroke="currentColor" strokeLinecap="round" />
              <path d="M15 20.5a9 9 0 0 0 6-8.5 9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" />
              <line x1="12" y1="12" x2="16" y2="8" stroke="currentColor" strokeLinecap="round" />
            </svg>
            {(UTILITY_TRANSLATIONS[lang] || UTILITY_TRANSLATIONS['en']).utilities}
          </div>

          <div
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
            onMouseEnter={() => playClick('hover')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
            </svg>
            {t.settings}
          </div>

          <div
            className="nav-item"
            onClick={() => { playClick('click'); onSupportClick(); }}
            onMouseEnter={() => playClick('hover')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {SUPPORT_LABELS[lang] || 'Support'}
          </div>
        </div>
      </div>

      <div className="sidebar-footer" style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.6 }}>
        Clarity v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;
