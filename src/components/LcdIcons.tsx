import React from 'react';

export const IconCompressor = ({ className = "w-4 h-4", fill = false }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    {/* Forma de matraz/compresor estilizado del manual */}
    <path d="M6 22h12a2 2 0 002-2V10l-4-6H8L4 10v10a2 2 0 002 2z" />
    <path d="M10 4h4" />
    <circle cx="12" cy="14" r="3" />
  </svg>
);

export const IconFan = ({ className = "w-4 h-4", animate = false }) => (
  <svg viewBox="0 0 24 24" className={`${className} ${animate ? 'animate-spin-slow' : ''}`} fill="currentColor">
    {/* Aspas de ventilador */}
    <path d="M12 12c0-3 2.5-5 5-5 1 0 3 1 3 4s-4 4-5 4h-3z" transform="rotate(0 12 12)" />
    <path d="M12 12c0-3 2.5-5 5-5 1 0 3 1 3 4s-4 4-5 4h-3z" transform="rotate(120 12 12)" />
    <path d="M12 12c0-3 2.5-5 5-5 1 0 3 1 3 4s-4 4-5 4h-3z" transform="rotate(240 12 12)" />
    <circle cx="12" cy="12" r="2" fill="white" />
  </svg>
);

export const IconMenuParams = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
    {/* L invertida y puntos (Icono Zona A - Menú) */}
    <path d="M4 4v16h16" />
    <circle cx="9" cy="9" r="2" fill="currentColor" stroke="none"/>
    <circle cx="14" cy="14" r="2" fill="currentColor" stroke="none"/>
  </svg>
);

export const IconThermometer = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
  </svg>
);

export const IconPlug = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 8v10a2 2 0 01-2 2h-2a2 2 0 01-2-2V8m-2 0h10M10 4v4m4-4v4" />
  </svg>
);

export const IconLock = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 118 0v4" />
  </svg>
);

// Gráfico de barras pequeño para el Inverter (Zona E)
export const BarGraph = ({ value, className = "h-4 w-8" }: { value: number, className?: string }) => {
  // 5 barras
  const bars = [20, 40, 60, 80, 100];
  return (
    <div className={`flex items-end gap-[1px] ${className}`}>
      {bars.map((limit, i) => (
        <div 
          key={i} 
          className={`flex-1 ${value >= limit ? 'bg-black' : 'bg-transparent border border-black/20'}`}
          style={{ height: `${20 + (i * 20)}%` }} // Altura escalonada (20%, 40%...)
        ></div>
      ))}
    </div>
  );
};