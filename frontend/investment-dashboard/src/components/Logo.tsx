import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 40, showText = true, className = '' }) => {
  return (
    <div className={`logo-container ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Background Circle */}
        <circle cx="32" cy="32" r="30" fill="url(#logoGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
        
        {/* Stack Layers representing wealth building */}
        <rect x="16" y="44" width="32" height="5" rx="2.5" fill="rgba(255,255,255,0.95)"/>
        <rect x="18" y="37" width="28" height="5" rx="2.5" fill="rgba(255,255,255,0.85)"/>
        <rect x="20" y="30" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.75)"/>
        <rect x="22" y="23" width="20" height="5" rx="2.5" fill="rgba(255,255,255,0.65)"/>
        
        {/* Smart Brain/Circuit Symbol */}
        <circle cx="32" cy="16" r="3.5" fill="rgba(255,255,255,0.95)"/>
        <path d="M28.5 16 L30 17.5 L34 17.5 L35.5 16" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="none"/>
        <circle cx="29.5" cy="17.5" r="0.8" fill="rgba(255,255,255,0.9)"/>
        <circle cx="34.5" cy="17.5" r="0.8" fill="rgba(255,255,255,0.9)"/>
        
        {/* Upward Arrow/Growth Symbol */}
        <path d="M32 50 L32 42 M29 45 L32 42 L35 45" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#667eea', stopOpacity: 1}} />
            <stop offset="50%" style={{stopColor: '#764ba2', stopOpacity: 1}} />
            <stop offset="100%" style={{stopColor: '#667eea', stopOpacity: 1}} />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ 
            fontSize: size > 30 ? '1.5rem' : '1.2rem', 
            fontWeight: 700, 
            color: 'inherit',
            letterSpacing: '-0.5px'
          }}>
            SmartWealthStack
          </span>
          {size > 30 && (
            <span style={{ 
              fontSize: '0.75rem', 
              opacity: 0.8, 
              color: 'inherit',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Intelligent Investment Tracking
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;