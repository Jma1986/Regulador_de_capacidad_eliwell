import React, { useEffect } from 'react';
import { useEwcmController } from './hooks/useEwcmController';
import { useSimulationLoop } from './hooks/useSimulationLoop';
import { useAlarmSystem } from './hooks/useAlarmSystem';
import { useIOConfiguration } from './hooks/useIOConfiguration';
import LcdScreen from './components/LcdScreen';
import InputSimulator from './components/InputSimulator';
import { HardwareModel } from './types/io';

export default function Simulator() {
  const {
    display,
    parameters,
    currentMenuNode,
    currentMenuItems,
    handleKeyPress,
    setActionCallbacks,
    resetSimulator,
    importParameters
  } = useEwcmController();

  // Sistema de alarmas
  const [alarmState, alarmControls] = useAlarmSystem();

  // Configuración dinámica de I/O basada en parámetros
  // Por defecto usamos modelo 9900 (el más completo)
  const hardwareModel: HardwareModel = '8900';
  const ioConfig = useIOConfiguration(parameters, hardwareModel);

  // Loop de simulación con I/O dinámica y callbacks de alarma
  const [simState, simControls] = useSimulationLoop(parameters, ioConfig, {
    onAlarmTrigger: alarmControls.triggerAlarm,
    onAlarmClear: alarmControls.clearAlarm
  });

  // Conectar callbacks de acciones del menú con los sistemas
  useEffect(() => {
    setActionCallbacks({
      onToggleSystem: simControls.toggleSystem,
      onResetAlarms: alarmControls.resetManualAlarms,
      onFactoryReset: resetSimulator,
      onSetDateTime: simControls.setSimulatedDateTime,
      onResetCounters: simControls.resetCounters
    });
  }, [setActionCallbacks, simControls.toggleSystem, simControls.setSimulatedDateTime, simControls.resetCounters, alarmControls.resetManualAlarms, resetSimulator]);

  // Funciones wrapper para pasar al Keypad (simulando los eventos)
  const onKey = (k: string, t: 'short' | 'long' = 'short') => handleKeyPress(k, t);

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#121212] p-6 font-sans text-gray-200 selection:bg-blue-500 selection:text-white">

      <div className="mb-8 text-center space-y-1">
        <h1 className="text-2xl font-light tracking-[0.3em] text-white">ELIWELL <strong className="font-bold">EWCM EO</strong></h1>
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Simulador Digital de Centrales Frigoríficas</p>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl items-center">

        {/* === CONTROLADOR === */}
        <div className="flex justify-center w-full">
          {/* Carcasa plástica */}
          <div className="bg-[#18181b] p-2 rounded-[6px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-[#333] w-[700px] aspect-[2.5/1] relative flex flex-col">

            {/* Panel Frontal (Etiqueta) */}
            <div className="bg-[#27272a] flex-1 rounded-[4px] border-2 border-[#111] relative grid grid-cols-[80px_1fr_160px] gap-2 p-4 items-center">

              {/* --- COLUMNA IZQ: BOTONES F --- */}
              <div className="flex flex-col justify-center gap-4 h-full py-4">
                {['F1', 'F2', 'F3'].map((key) => (
                  <FunctionButton key={key} label={key} onClick={() => onKey(key, 'short')} />
                ))}
              </div>

              {/* --- COLUMNA CENTRAL: PANTALLA LCD --- */}
              <div className="h-full flex flex-col">
                {/* Logo y LEDs */}
                <div className="flex justify-between items-end mb-2 px-1">
                  <span className="text-white font-bold italic text-lg tracking-tight">eliwell</span>

                  {/* LEDs */}
                  <div className="flex gap-4 mb-1">
                    <StatusLed color="red" label="Alarm" active={alarmState.hasUnacknowledged || alarmState.hasFatalAlarm} icon="((•))" />
                    <StatusLed color="yellow" label="Prg" active={display.currentMenuId !== 'root_home'} text="PRG" />
                    <StatusLed color="green" label="Eco" active={parameters['556-ESFn'] > 0} text="S" />
                  </div>
                </div>

                {/* Cristal LCD */}
                <div className="w-full aspect-[2/1] bg-[#8899a6] rounded-sm border-[6px] border-[#3f3f46] shadow-inner overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10 pointer-events-none z-10 mix-blend-multiply"></div>
                  <LcdScreen
                    currentMenuId={display.currentMenuId}
                    menuNode={currentMenuNode}
                    menuItems={currentMenuItems}
                    cursorIndex={display.cursorIndex}
                    editMode={display.editMode}
                    tempValue={display.tempValue}
                    parameters={parameters}
                    liveValues={simState}
                    alarmState={alarmState}
                    alarmControls={alarmControls}
                    passwordMode={display.passwordMode}
                    passwordBuffer={display.passwordBuffer}
                    dateTimeEditMode={display.dateTimeEditMode}
                    dateTimeTemp={display.dateTimeTemp}
                    dateTimeFieldIndex={display.dateTimeFieldIndex}
                    quickStartEnabled={display.quickStartEnabled}
                    quickStartManual={display.quickStartManual}
                  />
                </div>

                <div className="text-right mt-1">
                  <span className="text-xs font-bold text-gray-500">EWCM <span className="text-white">eo</span></span>
                </div>
              </div>

              {/* --- COLUMNA DERECHA: CRUZ DE NAVEGACIÓN --- */}
              <div className="flex items-center justify-center h-full relative">
                {/* Botonera Circular */}
                <div className="w-32 h-32 bg-[#202023] rounded-full border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative">

                  {/* OK (Centro) */}
                  <NavButton
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full z-20"
                    label="OK"
                    onClick={() => onKey('OK', 'short')}
                    onLongClick={() => onKey('OK', 'long')}
                  />

                  {/* Flechas (Segmentos) */}
                  <NavButtonSegment dir="up" onClick={() => onKey('UP')} />
                  <NavButtonSegment dir="down" onClick={() => onKey('DOWN')} />
                  <NavButtonSegment dir="left" label="ESC" onClick={() => onKey('ESC')} />
                  <NavButtonSegment dir="right" label=">" onClick={() => onKey('RIGHT')} />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* === CONSOLA DE INGENIERÍA (DEBAJO) === */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden shadow-2xl w-full">
          <div className="bg-[#252525] px-4 py-3 border-b border-[#333] flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Simulación de Planta
            </h3>
            <span className="text-[10px] text-gray-500">v1.0.0</span>
          </div>
          <div className="p-4">
            <InputSimulator
              simState={simState}
              controls={simControls}
              ioState={ioConfig.ioState}
              parameters={parameters}
              onImportParameters={importParameters}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// --- SUBCOMPONENTES DE UI PARA EL LAYOUT ---

const StatusLed = ({ color, label, active, icon, text }: any) => {
  const colors: any = {
    red: active ? 'bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]' : 'bg-[#450a0a]',
    yellow: active ? 'bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.6)]' : 'bg-[#422006]',
    green: active ? 'bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]' : 'bg-[#052e16]',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-2 h-2 rounded-full transition-all duration-200 ${colors[color]}`}></div>
      <span className="text-[9px] text-gray-400 font-bold leading-none">{icon || text || label}</span>
    </div>
  );
};

// Botón de función F1/F2/F3 con soporte táctil correcto
const FunctionButton = ({ label, onClick }: { label: string; onClick: () => void }) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const touchedRef = React.useRef(false);

  React.useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchedRef.current = true;
      onClick();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (touchedRef.current) {
        touchedRef.current = false;
        return;
      }
      e.preventDefault();
      onClick();
    };

    button.addEventListener('touchstart', handleTouchStart, { passive: false });
    button.addEventListener('mousedown', handleMouseDown);

    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClick]);

  return (
    <button
      ref={buttonRef}
      className="w-12 h-8 bg-[#333] rounded-sm border-b-4 border-[#111] active:border-b-0 active:translate-y-1 text-[10px] font-bold text-gray-400 shadow-md flex items-center justify-center hover:text-white hover:bg-[#444] transition-colors touch-none"
    >
      {label}
    </button>
  );
};

// Botón central OK con soporte long-press y táctil
const NavButton = ({ className, label, onClick, onLongClick }: any) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const timer = React.useRef<any>(null);
  const countInterval = React.useRef<any>(null);
  const isLong = React.useRef(false);
  const touchedRef = React.useRef(false);
  const [pressing, setPressing] = React.useState(false);
  const [pressTime, setPressTime] = React.useState(0);

  const startPress = React.useCallback(() => {
    isLong.current = false;
    setPressing(true);
    setPressTime(0);

    countInterval.current = setInterval(() => {
      setPressTime(t => t + 0.1);
    }, 100);

    timer.current = setTimeout(() => {
      if (countInterval.current) clearInterval(countInterval.current);
      isLong.current = true;
      setPressing(false);
      setPressTime(0);
      if (onLongClick) onLongClick();
    }, 1000);
  }, [onLongClick]);

  const cancelPress = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (countInterval.current) {
      clearInterval(countInterval.current);
      countInterval.current = null;
    }
    setPressing(false);
    setPressTime(0);
  }, []);

  const endPress = React.useCallback(() => {
    const wasLong = isLong.current;
    cancelPress();
    if (!wasLong && onClick) onClick();
  }, [cancelPress, onClick]);

  React.useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchedRef.current = true;
      startPress();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endPress();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (touchedRef.current) {
        touchedRef.current = false;
        return;
      }
      e.preventDefault();
      startPress();
    };

    const handleMouseUp = () => {
      if (!touchedRef.current) {
        endPress();
      }
    };

    const handleMouseLeave = () => {
      if (!touchedRef.current) {
        cancelPress();
      }
    };

    button.addEventListener('touchstart', handleTouchStart, { passive: false });
    button.addEventListener('touchend', handleTouchEnd, { passive: false });
    button.addEventListener('mousedown', handleMouseDown);
    button.addEventListener('mouseup', handleMouseUp);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('touchend', handleTouchEnd);
      button.removeEventListener('mousedown', handleMouseDown);
      button.removeEventListener('mouseup', handleMouseUp);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [startPress, endPress, cancelPress]);

  return (
    <div className={`${className} relative`}>
      <button
        ref={buttonRef}
        className="w-full h-full bg-[#333] text-white border-b-2 border-black active:border-b-0 active:translate-y-[2px] shadow-sm flex items-center justify-center hover:bg-[#444] rounded-full touch-none"
      >
        <span className="text-[10px] font-bold">{label}</span>
      </button>
      {pressing && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-30">
          {pressTime.toFixed(1)}s / 1.0s
        </div>
      )}
    </div>
  );
};

// Botones de navegación (flechas y ESC) con soporte táctil
const NavButtonSegment = ({ dir, label, onClick }: any) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const touchedRef = React.useRef(false);

  const positions: any = {
    up: "top-1 left-1/2 -translate-x-1/2 w-8 h-10 rounded-t-lg rounded-b-sm",
    down: "bottom-1 left-1/2 -translate-x-1/2 w-8 h-10 rounded-b-lg rounded-t-sm",
    left: "left-1 top-1/2 -translate-y-1/2 h-8 w-10 rounded-l-lg rounded-r-sm",
    right: "right-1 top-1/2 -translate-y-1/2 h-8 w-10 rounded-r-lg rounded-l-sm"
  };

  const arrows: any = { up: '▲', down: '▼', left: '◄', right: '►' };

  React.useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchedRef.current = true;
      if (onClick) onClick();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (touchedRef.current) {
        touchedRef.current = false;
        return;
      }
      e.preventDefault();
      if (onClick) onClick();
    };

    button.addEventListener('touchstart', handleTouchStart, { passive: false });
    button.addEventListener('mousedown', handleMouseDown);

    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClick]);

  return (
    <button
      ref={buttonRef}
      className={`absolute ${positions[dir]} bg-[#333] text-gray-300 active:bg-[#222] active:scale-95 transition-transform flex items-center justify-center hover:text-white shadow-sm border border-black/30 touch-none`}
    >
      <span className="text-[10px] font-bold">{label || arrows[dir]}</span>
    </button>
  );
};