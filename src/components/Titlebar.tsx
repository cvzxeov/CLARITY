import React, { useState } from 'react';
import { playClick } from '../utils/audio';
import logoWhite from '../img/logo_white.png';
import logoBlack from '../img/logo_black.png';

interface TitlebarProps {
  theme: 'dark' | 'light';
}

const Titlebar: React.FC<TitlebarProps> = ({ theme }) => {
  const [soundOn, setSoundOn] = useState(() => {
    return typeof window !== 'undefined' && (window as any).soundEnabled !== false;
  });

  const handleMinimize = () => {
    playClick('click');
    if (window.api) window.api.minimizeWindow();
  };

  const handleMaximize = () => {
    playClick('click');
    if (window.api) window.api.maximizeWindow();
  };

  const handleClose = () => {
    playClick('click');
    if (window.api) window.api.closeWindow();
  };

  const toggleSound = () => {
    const nextState = !soundOn;
    if (typeof window !== 'undefined') {
      (window as any).soundEnabled = nextState;
    }
    setSoundOn(nextState);
    if (nextState) {
      setTimeout(() => playClick('click'), 50);
    }
  };

  const currentLogo = theme === 'dark' ? logoWhite : logoBlack;

  return (
    <div className="titlebar">
      <div className="titlebar-drag-area">
        <div className="titlebar-left">
          <img src={currentLogo} alt="Clarity" className="titlebar-logo" />
          <span className="titlebar-title">Clarity</span>
        </div>
      </div>
      
      <div className="titlebar-controls">
        {/* Sound Toggle Switch */}
        <button 
          className={`titlebar-btn sound-toggle ${!soundOn ? 'muted' : ''}`}
          onClick={toggleSound}
          onMouseEnter={() => playClick('hover')}
          title={soundOn ? "Выключить звук интерфейса" : "Включить звук интерфейса"}
        >
          {soundOn ? (
            <svg viewBox="0 0 24 24" style={{ strokeWidth: 2 }}>
              <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" style={{ strokeWidth: 2 }}>
              <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke="#ff3333" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          )}
        </button>

        <button 
          className="titlebar-btn" 
          onClick={handleMinimize}
          onMouseEnter={() => playClick('hover')}
          title="Свернуть"
        >
          <svg viewBox="0 0 10.2 1">
            <rect y="0.2" width="10.2" height="0.6"></rect>
          </svg>
        </button>
        <button 
          className="titlebar-btn" 
          onClick={handleMaximize}
          onMouseEnter={() => playClick('hover')}
          title="Развернуть"
        >
          <svg viewBox="0 0 10 10">
            <path d="M0,0v10h10V0H0z M9,9H1V1h8V9z"></path>
          </svg>
        </button>
        <button 
          className="titlebar-btn close" 
          onClick={handleClose}
          onMouseEnter={() => playClick('hover')}
          title="Закрыть"
        >
          <svg viewBox="0 0 10 10">
            <polygon points="10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Titlebar;
