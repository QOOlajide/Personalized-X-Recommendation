interface LogoIconProps {
  size?: number;
  showBackground?: boolean;
  style?: 'flat' | '3d';
}

export function LogoIcon({ size = 128, showBackground = true, style = '3d' }: LogoIconProps) {
  const renderSymbol = () => {
    return (
      <g>
        {/* Pivot point */}
        <circle cx="64" cy="64" r="8" fill="#3B82F6" />
        {/* Left weight - higher */}
        <rect x="24" y="40" width="24" height="16" rx="3" fill="white" />
        {/* Right weight - lower */}
        <rect x="80" y="72" width="24" height="16" rx="3" fill="white" />
        {/* Balance beam */}
        <rect x="30" y="60" width="68" height="8" rx="4" fill="white" opacity="0.4" />
      </g>
    );
  };

  if (!showBackground) {
    return (
      <svg width={size} height={size} viewBox="0 0 128 128">
        {renderSymbol()}
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 128 128">
      <defs>
        {style === '3d' && (
          <>
            {/* Radial gradient for background - lighter toward upper-right */}
            <radialGradient id="bg-grad" cx="75%" cy="25%">
              <stop offset="0%" stopColor="#1F1F1F" />
              <stop offset="100%" stopColor="#0A0A0A" />
            </radialGradient>
            
            <filter id="shadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </>
        )}
      </defs>
      
      {/* Background */}
      <rect
        x="4"
        y="4"
        width="120"
        height="120"
        rx="26"
        fill={style === '3d' ? 'url(#bg-grad)' : '#0A0A0A'}
      />
      
      {/* Symbol */}
      <g filter={style === '3d' ? 'url(#shadow)' : undefined}>
        {renderSymbol()}
      </g>
      
      {/* Subtle highlight overlay on white rectangles */}
      {style === '3d' && (
        <g opacity="0.3">
          <rect x="24" y="40" width="24" height="4" rx="2" fill="white" />
          <rect x="80" y="72" width="24" height="4" rx="2" fill="white" />
        </g>
      )}
    </svg>
  );
}
