import React from 'react';

interface BackgroundLogoProps {
  theme: 'dark' | 'light';
}

const BackgroundLogo: React.FC<BackgroundLogoProps> = () => {
  return (
    <div className="bg-logo-container">
      <div className="orbital-system">
        <div className="orbit orbit-1"></div>
        <div className="orbit orbit-2"></div>
        <div className="orbit orbit-3"></div>
        <div className="orbit-core"></div>
      </div>
    </div>
  );
};

export default BackgroundLogo;
