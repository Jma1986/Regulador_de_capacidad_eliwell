import React, { useRef } from 'react';

interface KeypadProps {
  onKeyPress: (key: string, type: 'short' | 'long') => void;
}

const Keypad: React.FC<KeypadProps> = ({ onKeyPress }) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleMouseDown = (key: string) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onKeyPress(key, 'long');
      // Feedback visual o háptico aquí si se desea
      console.log('Long press detected');
    }, 1000); // 1 segundo para simular en web (el manual dice 3s pero es mucho para UX web)
  };

  const handleMouseUp = (key: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (!isLongPress.current) {
      onKeyPress(key, 'short');
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Estilos base para los botones
  const btnBase = "bg-gray-800 text-white rounded-full shadow-lg active:bg-gray-600 transition-all active:scale-95 flex items-center justify-center font-bold select-none cursor-pointer";
  const btnF = "w-10 h-10 text-xs"; // Botones F pequeños
  const btnNav = "w-12 h-12"; // Botones de flecha

  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-md mx-auto">
      <div className="flex justify-between items-center gap-8">
        
        {/* Columna Izquierda: Teclas Función */}
        <div className="flex flex-col gap-4">
          <button 
            className={btnBase + " " + btnF}
            onMouseDown={() => handleMouseDown('F1')}
            onMouseUp={() => handleMouseUp('F1')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('F1')}
            onTouchEnd={() => handleMouseUp('F1')}
          >
            F1
          </button>
          <button 
            className={btnBase + " " + btnF}
            onMouseDown={() => handleMouseDown('F2')}
            onMouseUp={() => handleMouseUp('F2')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('F2')}
            onTouchEnd={() => handleMouseUp('F2')}
          >
            F2
          </button>
          <button 
            className={btnBase + " " + btnF}
            onMouseDown={() => handleMouseDown('F3')}
            onMouseUp={() => handleMouseUp('F3')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('F3')}
            onTouchEnd={() => handleMouseUp('F3')}
          >
            F3
          </button>
        </div>

        {/* Columna Derecha: Cruz de Navegación */}
        <div className="relative w-40 h-40">
          {/* UP */}
          <button 
            className={`${btnBase} ${btnNav} absolute top-0 left-1/2 -translate-x-1/2`}
            onMouseDown={() => handleMouseDown('UP')}
            onMouseUp={() => handleMouseUp('UP')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('UP')}
            onTouchEnd={() => handleMouseUp('UP')}
          >
            ▲
          </button>
          
          {/* DOWN */}
          <button 
            className={`${btnBase} ${btnNav} absolute bottom-0 left-1/2 -translate-x-1/2`}
            onMouseDown={() => handleMouseDown('DOWN')}
            onMouseUp={() => handleMouseUp('DOWN')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('DOWN')}
            onTouchEnd={() => handleMouseUp('DOWN')}
          >
            ▼
          </button>

          {/* LEFT / ESC */}
          <button 
            className={`${btnBase} ${btnNav} absolute left-0 top-1/2 -translate-y-1/2`}
            onMouseDown={() => handleMouseDown('ESC')}
            onMouseUp={() => handleMouseUp('ESC')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('ESC')}
            onTouchEnd={() => handleMouseUp('ESC')}
          >
            ◄
          </button>

          {/* RIGHT / ENTER */}
          <button 
            className={`${btnBase} ${btnNav} absolute right-0 top-1/2 -translate-y-1/2`}
            onMouseDown={() => handleMouseDown('RIGHT')} // Puede usarse para entrar submenús también
            onMouseUp={() => handleMouseUp('RIGHT')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('RIGHT')}
            onTouchEnd={() => handleMouseUp('RIGHT')}
          >
            ►
          </button>

          {/* OK / CENTER */}
          <button 
            className={`${btnBase} w-14 h-14 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-gray-700`}
            onMouseDown={() => handleMouseDown('OK')}
            onMouseUp={() => handleMouseUp('OK')}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleMouseDown('OK')}
            onTouchEnd={() => handleMouseUp('OK')}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default Keypad;