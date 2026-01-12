/**
 * src/components/InputSimulator.tsx
 * Consola de simulación con I/O dinámica basada en la configuración del controlador
 */

import React, { useState } from 'react';
import { SimulationState, SimulationControls } from '../hooks/useSimulationLoop';
import { IOSystemState, IOState } from '../types/io';
import { exportConfiguration, importConfiguration } from '../utils/configExport';

interface InputSimulatorProps {
  simState: SimulationState;
  controls: SimulationControls;
  ioState: IOSystemState;
  parameters: Record<string, number>;
  onImportParameters: (params: Record<string, number>) => void;
}

// Componente para sección colapsable
const IOSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}> = ({ title, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-blue-300 text-xs font-bold uppercase tracking-wider mb-2 hover:text-blue-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          {title}
          {count !== undefined && (
            <span className="text-gray-500 font-normal">({count})</span>
          )}
        </span>
      </button>
      {isOpen && (
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
          {children}
        </div>
      )}
    </div>
  );
};

// Slider para entradas analógicas
const AnalogInputSlider: React.FC<{
  io: IOState;
  value: number;
  onChange: (val: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  accentColor?: string;
}> = ({ io, value, onChange, unit, min, max, step = 0.1, accentColor = 'blue' }) => {
  const colorClasses = {
    blue: 'accent-blue-500',
    red: 'accent-red-500',
    green: 'accent-green-500',
    yellow: 'accent-yellow-500',
  };

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm ${io.isEnabled ? 'text-gray-300' : 'text-gray-500'}`}>
          <span className="font-mono text-xs text-gray-500 mr-1">{io.id}:</span>
          {io.label}
        </span>
        <span className="text-white font-mono text-sm bg-slate-900 px-2 rounded">
          {value.toFixed(unit === '°C' ? 1 : 2)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={!io.isEnabled}
        className={`w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer ${colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.blue} disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

// Toggle para entradas digitales
const DigitalInputToggle: React.FC<{
  io: IOState;
  value: boolean;
  onChange: () => void;
}> = ({ io, value, onChange }) => {
  // Considerar polaridad inversa para display
  const effectiveValue = io.isInverted ? !value : value;

  if (!io.isEnabled) {
    return (
      <div className="flex items-center justify-between p-2 rounded opacity-40">
        <span className="text-xs text-gray-500 truncate flex-1 mr-2" title={io.label}>
          <span className="font-mono text-gray-600 mr-1">{io.id}:</span>
          {io.label}
        </span>
        <div className="w-3 h-3 rounded-full bg-gray-700" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-slate-600/50 transition-colors"
      onClick={onChange}
    >
      <span className={`text-xs truncate flex-1 mr-2 ${effectiveValue ? 'text-yellow-300' : 'text-gray-400'}`} title={io.label}>
        <span className="font-mono text-gray-500 mr-1">{io.id}:</span>
        {io.label.length > 20 ? io.label.substring(0, 20) + '...' : io.label}
      </span>
      <div className={`w-3 h-3 rounded-full transition-all ${
        effectiveValue
          ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
          : 'bg-gray-600'
      }`} />
    </div>
  );
};

// LED para salidas digitales
const DigitalOutputLED: React.FC<{
  io: IOState;
  active: boolean;
}> = ({ io, active }) => {
  // Determinar color según función
  const funcCode = Math.abs(io.functionCode);
  let ledColor = 'green';
  if (funcCode === 9 || funcCode === 93) ledColor = 'red'; // Alarmas
  else if (funcCode >= 10 && funcCode <= 17) ledColor = 'blue'; // Ventiladores
  else if (funcCode >= 19 && funcCode <= 30) ledColor = 'green'; // Compresores

  const colorClasses = {
    green: active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]' : 'bg-gray-700',
    red: active ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 'bg-gray-700',
    blue: active ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]' : 'bg-gray-700',
    yellow: active ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.7)]' : 'bg-gray-700',
  };

  const borderClasses = {
    green: active ? 'border-green-500' : 'border-slate-600',
    red: active ? 'border-red-500' : 'border-slate-600',
    blue: active ? 'border-blue-500' : 'border-slate-600',
    yellow: active ? 'border-yellow-500' : 'border-slate-600',
  };

  const textClasses = {
    green: active ? 'text-green-400' : 'text-gray-500',
    red: active ? 'text-red-400' : 'text-gray-500',
    blue: active ? 'text-blue-400' : 'text-gray-500',
    yellow: active ? 'text-yellow-400' : 'text-gray-500',
  };

  return (
    <div className={`p-2 rounded text-center border transition-all ${
      active ? 'bg-slate-800/80' : 'bg-slate-800'
    } ${borderClasses[ledColor as keyof typeof borderClasses]}`}>
      <div className={`w-4 h-4 rounded-full mx-auto mb-1 transition-all ${
        colorClasses[ledColor as keyof typeof colorClasses]
      }`} />
      <span className={`text-[10px] font-mono ${textClasses[ledColor as keyof typeof textClasses]}`}>
        {io.id}
      </span>
      <div className="text-[8px] text-gray-400 truncate" title={io.label}>
        {io.isEnabled ? (io.label.length > 14 ? io.label.substring(0, 14) + '..' : io.label) : '---'}
      </div>
    </div>
  );
};

// Indicador para salidas analógicas
const AnalogOutputGauge: React.FC<{
  io: IOState;
  value: number;
}> = ({ io, value }) => {
  const percentage = Math.min(100, Math.max(0, value));

  // Determinar color según función
  const funcCode = Math.abs(io.functionCode);
  let barColor = 'bg-green-500';
  if (funcCode === 1) barColor = 'bg-blue-500'; // Inverter ventilador
  else if (funcCode === 2 || funcCode === 3) barColor = 'bg-green-500'; // Inverter compresor

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm ${io.isEnabled ? 'text-gray-300' : 'text-gray-500'}`}>
          <span className="font-mono text-xs text-gray-500 mr-1">{io.id}:</span>
          {io.label}
        </span>
        <span className="text-white font-mono text-sm bg-slate-900 px-2 rounded">
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-3 bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-200`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Componente principal
const InputSimulator: React.FC<InputSimulatorProps> = ({
  simState,
  controls,
  ioState,
  parameters,
  onImportParameters
}) => {
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Contar I/O habilitadas
  const enabledDIH = ioState.digitalInputsHV.filter(io => io.isEnabled).length;
  const enabledDIL = ioState.digitalInputsLV.filter(io => io.isEnabled).length;
  const enabledDO = ioState.digitalOutputs.filter(io => io.isEnabled).length;
  const enabledAIP = ioState.analogInputsPressure.filter(io => io.isEnabled).length;
  const enabledAIT = ioState.analogInputsTemp.filter(io => io.isEnabled).length;
  const enabledAO = ioState.analogOutputs.filter(io => io.isEnabled).length;

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-600 shadow-xl w-full text-sm">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-blue-500 rounded-sm"></span>
        CONSOLA DE SIMULACIÓN
        <span className="text-xs font-normal text-gray-400 ml-2">
          Modelo {ioState.model}
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUMNA 1: ENTRADAS */}
        <div className="space-y-2">
          <h4 className="text-green-400 text-xs font-bold uppercase tracking-wider border-b border-slate-600 pb-1 mb-3">
            ENTRADAS
          </h4>

          {/* Entradas Analógicas de Presión */}
          <IOSection title="Presión (Transductores)" count={enabledAIP}>
            {ioState.analogInputsPressure.map(io => (
              <AnalogInputSlider
                key={io.id}
                io={io}
                value={simState.analogInputValues[io.id] ?? 2.0}
                onChange={(val) => controls.setAnalogInput(io.id, val)}
                unit="Bar"
                min={-1}
                max={30}
                step={0.1}
                accentColor="blue"
              />
            ))}
          </IOSection>

          {/* Entradas Analógicas de Temperatura */}
          <IOSection title="Temperatura (Sondas)" count={enabledAIT}>
            {ioState.analogInputsTemp.map(io => (
              <AnalogInputSlider
                key={io.id}
                io={io}
                value={simState.analogInputValues[io.id] ?? 25.0}
                onChange={(val) => controls.setAnalogInput(io.id, val)}
                unit="°C"
                min={-50}
                max={120}
                step={0.5}
                accentColor="red"
              />
            ))}
          </IOSection>

          {/* Entradas Digitales HV */}
          <IOSection title="Digitales HV" count={enabledDIH} defaultOpen={enabledDIH > 0}>
            <div className="grid grid-cols-2 gap-1">
              {ioState.digitalInputsHV.map(io => (
                <DigitalInputToggle
                  key={io.id}
                  io={io}
                  value={simState.digitalInputs[io.id] ?? false}
                  onChange={() => controls.toggleDigitalInput(io.id)}
                />
              ))}
            </div>
          </IOSection>

          {/* Entradas Digitales LV (solo si hay alguna) */}
          {ioState.digitalInputsLV.length > 0 && (
            <IOSection title="Digitales LV" count={enabledDIL} defaultOpen={enabledDIL > 0}>
              <div className="grid grid-cols-2 gap-1">
                {ioState.digitalInputsLV.map(io => (
                  <DigitalInputToggle
                    key={io.id}
                    io={io}
                    value={simState.digitalInputs[io.id] ?? false}
                    onChange={() => controls.toggleDigitalInput(io.id)}
                  />
                ))}
              </div>
            </IOSection>
          )}
        </div>

        {/* COLUMNA 2: SALIDAS */}
        <div className="space-y-2">
          <h4 className="text-orange-400 text-xs font-bold uppercase tracking-wider border-b border-slate-600 pb-1 mb-3">
            SALIDAS
          </h4>

          {/* Salidas Digitales */}
          <IOSection title="Digitales (Relés)" count={enabledDO}>
            <div className="grid grid-cols-4 gap-2">
              {ioState.digitalOutputs.map(io => (
                <DigitalOutputLED
                  key={io.id}
                  io={io}
                  active={simState.digitalOutputStates[io.id] ?? false}
                />
              ))}
            </div>
          </IOSection>

          {/* Salidas Analógicas */}
          <IOSection title="Analógicas (0-10V / 4-20mA)" count={enabledAO}>
            {ioState.analogOutputs.map(io => (
              <AnalogOutputGauge
                key={io.id}
                io={io}
                value={simState.analogOutputValues[io.id] ?? 0}
              />
            ))}
          </IOSection>

          {/* Monitor de Estado Rápido */}
          <IOSection title="Monitor de Regulación" defaultOpen={true}>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded text-center border ${
                simState.activeCompressors > 0
                  ? 'bg-green-900/50 border-green-500'
                  : 'bg-slate-800 border-slate-600'
              }`}>
                <div className="text-[10px] uppercase font-bold flex items-center justify-center gap-1 text-gray-400">
                  Compresores
                  {simState.compressorLocked && (
                    <span className="text-yellow-400 animate-pulse" title="Tiempo mínimo activo">🔒</span>
                  )}
                </div>
                <div className={`text-2xl font-bold ${simState.activeCompressors > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                  {simState.activeCompressors}%
                </div>
                <div className="text-[9px] text-gray-500">
                  {simState.compressorState ? 'ON' : 'OFF'}
                  {simState.compressorLocked && ' (bloqueado)'}
                </div>
              </div>

              <div className={`p-3 rounded text-center border ${
                simState.activeFans > 0
                  ? 'bg-blue-900/50 border-blue-500'
                  : 'bg-slate-800 border-slate-600'
              }`}>
                <div className="text-[10px] uppercase font-bold text-gray-400">
                  Ventiladores
                </div>
                <div className={`text-2xl font-bold ${simState.activeFans > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                  {simState.activeFans}%
                </div>
                <div className="text-[9px] text-gray-500">
                  {simState.activeFans > 0 ? 'Enfriando' : 'Inactivo'}
                </div>
              </div>
            </div>

            {/* Valores actuales */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2 rounded flex justify-between">
                <span className="text-gray-400">P. Aspiración:</span>
                <span className="text-white font-mono">{simState.suctionPressure.toFixed(2)} Bar</span>
              </div>
              <div className="bg-slate-900 p-2 rounded flex justify-between">
                <span className="text-gray-400">T. Impulsión:</span>
                <span className="text-white font-mono">{simState.dischargeTemp.toFixed(1)} °C</span>
              </div>
            </div>
          </IOSection>
        </div>
      </div>

      {/* SECCIÓN: EXPORTAR/IMPORTAR CONFIGURACIÓN */}
      <div className="mt-6 pt-4 border-t border-slate-600">
        <div className="flex gap-3">
          <button
            onClick={() => exportConfiguration(parameters)}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg border border-slate-500 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Exportar JSON
          </button>

          <button
            onClick={async () => {
              setImportStatus(null);
              try {
                const params = await importConfiguration();
                onImportParameters(params);
                setImportStatus({ type: 'success', message: 'Configuración importada correctamente' });
                setTimeout(() => setImportStatus(null), 3000);
              } catch (err) {
                setImportStatus({ type: 'error', message: (err as Error).message });
                setTimeout(() => setImportStatus(null), 5000);
              }
            }}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg border border-slate-500 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Importar JSON
          </button>
        </div>

        {/* Mensaje de estado */}
        {importStatus && (
          <div className={`mt-3 p-2 rounded text-sm text-center ${
            importStatus.type === 'success'
              ? 'bg-green-900/50 text-green-400 border border-green-600'
              : 'bg-red-900/50 text-red-400 border border-red-600'
          }`}>
            {importStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputSimulator;
