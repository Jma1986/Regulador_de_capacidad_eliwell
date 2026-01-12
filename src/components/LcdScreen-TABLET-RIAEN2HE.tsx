import React from 'react';
import { MenuNode, EwcmParameter } from '../types/ewcm';
import { getUnitLabel, pressureToTempSimulation, tempToPressureSimulation } from '../utils/ewcmUtils';
import paramsDb from '../data/parameters.json';
import { AlarmSystemState, AlarmSystemControls } from '../hooks/useAlarmSystem';
import {
  IconCompressor,
  IconFan,
  IconMenuParams,
  IconThermometer,
  IconPlug,
  IconLock,
  BarGraph
} from './LcdIcons';

interface LcdScreenProps {
  currentMenuId: string;
  menuNode: any;
  menuItems: any[];
  cursorIndex: number;
  editMode: boolean;
  tempValue: number | null;
  parameters: Record<string, number>;
  liveValues?: {
    suctionPressure: number;
    dischargeTemp: number;
    activeCompressors: number; // 0-100%
    activeFans: number;      // 0-100%
    digitalInputs?: Record<number, boolean>;
    systemOn?: boolean;
    // Contadores de horas (en segundos)
    hoursCompressor1?: number;
    hoursCompressor2?: number;
    hoursCompressor3?: number;
    hoursFan1?: number;
    hoursFan2?: number;
    hoursFan3?: number;
    hoursSystem?: number;
    // Contadores de arranques
    startsCompressor1?: number;
    startsCompressor2?: number;
    startsCompressor3?: number;
    // Reloj simulado
    simulatedDateTime?: Date;
  };
  alarmState?: AlarmSystemState;
  alarmControls?: AlarmSystemControls;
  // Control de acceso
  passwordMode?: boolean;
  passwordBuffer?: string;
  // Edición de fecha/hora
  dateTimeEditMode?: boolean;
  dateTimeTemp?: number[];
  dateTimeFieldIndex?: number;
}

const LcdScreen: React.FC<LcdScreenProps> = ({
  currentMenuId,
  menuNode,
  menuItems,
  cursorIndex,
  editMode,
  tempValue,
  parameters,
  liveValues,
  alarmState,
  alarmControls,
  passwordMode,
  passwordBuffer,
  dateTimeEditMode,
  dateTimeTemp,
  dateTimeFieldIndex
}) => {

  const getParamData = (paramId: string) => {
    return paramsDb.find((p: any) => p.id === paramId) as EwcmParameter | undefined;
  };

  // --- RENDER: PANTALLA DE INTRODUCCIÓN DE PASSWORD ---
  if (passwordMode) {
    const displayPassword = passwordBuffer || '';
    const maskedPassword = displayPassword.slice(0, -1).replace(/./g, '*') +
      (displayPassword.length > 0 ? displayPassword.slice(-1) : '_');

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-yellow-600 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide flex items-center gap-2">
            <IconLock className="w-3 h-3" /> ACCESO RESTRINGIDO
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-sm mb-4 text-center text-black/70">
            Introduzca contraseña
          </div>

          {/* Display de password */}
          <div className="bg-black text-white px-6 py-3 rounded text-2xl font-bold tracking-[0.5em] min-w-[120px] text-center">
            {maskedPassword || '___'}
          </div>

          {/* Indicador de dígito actual */}
          <div className="mt-4 flex gap-1">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full ${idx < displayPassword.length
                  ? 'bg-green-500'
                  : idx === displayPassword.length
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-gray-300'
                  }`}
              />
            ))}
          </div>

          <div className="mt-4 text-[10px] text-black/50 text-center">
            ▲▼: Cambiar dígito<br />
            ►: Siguiente dígito<br />
            OK: Confirmar
          </div>
        </div>

        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Cancelar
        </div>
      </div>
    );
  }

  // --- RENDER: PANTALLA PRINCIPAL (HOME - Pág 24) ---
  if (currentMenuId === 'root_home') {
    const suctionP = liveValues?.suctionPressure ?? 0.00;
    const dischargeT = liveValues?.dischargeTemp ?? 0.0;
    const compLoad = liveValues?.activeCompressors ?? 0;
    const fanLoad = liveValues?.activeFans ?? 0;

    const suctionSet = parameters['143-SEt'] || 2.0;
    const dischargeSet = parameters['343-SEt'] || 35.0;

    // Calcular cuántos iconos encender (Simulación visual de escalones)
    // Suponemos 3 compresores y 3 ventiladores configurados
    const totalComps = 3;
    const activeCompsCount = Math.ceil((compLoad / 100) * totalComps);

    const totalFans = 3;
    const activeFansCount = Math.ceil((fanLoad / 100) * totalFans);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex select-none relative shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]">

        {/* ZONA A: BARRA LATERAL IZQUIERDA (Iconos de estado) */}
        <div className="w-6 border-r border-black/20 flex flex-col items-center justify-start pt-2 gap-3 text-black/60">
          <IconMenuParams /> {/* Menú */}
          <IconLock className="w-3 h-3 opacity-20" /> {/* Bloqueo (inactivo) */}
          <IconThermometer /> {/* Regulación activa */}
          <div className="mt-auto pb-2">
            <IconPlug /> {/* Red */}
          </div>
        </div>

        {/* ZONA PRINCIPAL (B, C, D, E) */}
        <div className="flex-1 flex flex-col">

          {/* ZONA B: SUPERIOR (Estado Dispositivos) */}
          <div className="h-1/4 border-b border-black/10 flex px-2 items-center justify-between">
            {/* Compresores */}
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {[...Array(totalComps)].map((_, i) => (
                  <IconCompressor
                    key={i}
                    className="w-5 h-5 text-black"
                    fill={i < activeCompsCount} // Relleno si está activo
                  />
                ))}
              </div>
              <span className="text-sm font-bold ml-1">{activeCompsCount}</span>
            </div>

            {/* Ventiladores */}
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {[...Array(totalFans)].map((_, i) => (
                  <IconFan
                    key={i}
                    className={`w-5 h-5 ${i < activeFansCount ? 'text-black' : 'text-black/30'}`}
                    animate={i < activeFansCount}
                  />
                ))}
              </div>
              <span className="text-sm font-bold ml-1">{activeFansCount}</span>
            </div>
          </div>

          {/* ZONA C y D: VALORES CENTRALES */}
          <div className="flex-1 flex">
            {/* ZONA C: ASPIRACIÓN (LP) */}
            <div className="w-1/2 border-r border-black/10 p-1 flex flex-col justify-center relative">
              <div className="flex items-baseline gap-1">
                {/* 547-UMCP: 1=Bar (Presión), 0=°C (Temp Saturación) */}
                <span className="text-3xl font-bold tracking-tighter">
                  {(parameters['547-UMCP'] === 0)
                    ? pressureToTempSimulation(suctionP, parameters['641-FtyP'] || 3).toFixed(1)
                    : suctionP.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold">
                  {(parameters['547-UMCP'] === 0) ? '°C' : 'Bar'}
                </span>
              </div>
              <div className="flex justify-between items-end w-full px-1 mt-1">
                <span className="text-xs font-bold">LP</span>
                <span className="text-xs font-mono">
                  {(parameters['547-UMCP'] === 0)
                    ? pressureToTempSimulation(suctionSet, parameters['641-FtyP'] || 3).toFixed(1)
                    : suctionSet.toFixed(2)}
                </span>
              </div>
            </div>

            {/* ZONA D: IMPULSIÓN (HP) */}
            <div className="w-1/2 p-1 flex flex-col justify-center relative pl-2">
              <div className="flex items-baseline gap-1">
                {/* 548-UMFn: 0=°C (Temp real), 1=Bar (Presión Saturación) */}
                <span className="text-3xl font-bold tracking-tighter">
                  {(parameters['548-UMFn'] === 1)
                    ? tempToPressureSimulation(dischargeT, parameters['641-FtyP'] || 3).toFixed(2)
                    : dischargeT.toFixed(1)}
                </span>
                <span className="text-[10px] font-bold">
                  {(parameters['548-UMFn'] === 1) ? 'Bar' : '°C'}
                </span>
              </div>
              <div className="flex justify-between items-end w-full px-1 mt-1">
                <span className="text-xs font-bold">HP</span>
                <span className="text-xs font-mono">
                  {(parameters['548-UMFn'] === 1)
                    ? tempToPressureSimulation(dischargeSet, parameters['641-FtyP'] || 3).toFixed(2)
                    : dischargeSet.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* ZONA E: INFERIOR (INVERTERS) */}
          <div className="h-1/4 border-t border-black/10 bg-black/5 flex items-center justify-around px-2">

            {/* Inverter Compresor */}
            <div className="flex items-center gap-2">
              <div className="text-[9px] flex flex-col leading-none">
                <span className="font-bold">out</span>
                <span>(Comp)</span>
              </div>
              <BarGraph value={compLoad} />
              <span className="text-xs font-bold min-w-[2.5em] text-right">{compLoad}%</span>
            </div>

            {/* Inverter Ventilador */}
            <div className="flex items-center gap-2 border-l border-black/10 pl-2">
              <div className="text-[9px] flex flex-col leading-none">
                <span className="font-bold">out</span>
                <span>(Fan)</span>
              </div>
              <BarGraph value={fanLoad} />
              <span className="text-xs font-bold min-w-[2.5em] text-right">{fanLoad}%</span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: PANTALLA DE ALARMAS ACTIVAS ---
  if (currentMenuId === 'alarm_list' && alarmState) {
    const { activeAlarms } = alarmState;
    const pageSize = 4;
    const currentPage = Math.floor(cursorIndex / pageSize);
    const startIdx = currentPage * pageSize;
    const visibleAlarms = activeAlarms.slice(startIdx, startIdx + pageSize);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        {/* HEADER */}
        <div className="bg-red-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide flex items-center gap-2">
            <span className="animate-pulse">⚠</span> ALARMAS ACTIVAS
          </span>
          <span className="font-mono bg-white text-red-700 px-1 rounded-[1px] text-[10px]">
            {activeAlarms.length > 0 ? `${String(cursorIndex + 1).padStart(2, '0')}/${String(activeAlarms.length).padStart(2, '0')}` : '00/00'}
          </span>
        </div>

        {/* LISTA DE ALARMAS */}
        <div className="flex-1 overflow-hidden p-1 space-y-[1px]">
          {activeAlarms.length === 0 ? (
            <div className="flex items-center justify-center h-full text-black/50 text-sm">
              No hay alarmas activas
            </div>
          ) : (
            visibleAlarms.map((alarm, idx) => {
              const realIdx = startIdx + idx;
              const isActive = realIdx === cursorIndex;
              const timeStr = new Date(alarm.activatedAt).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={`${alarm.code}-${alarm.index ?? 'none'}`}
                  className={`
                    px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/5 last:border-0
                    ${isActive ? 'bg-black text-white' : alarm.isFatal ? 'bg-red-200 text-red-900' : 'text-black'}
                  `}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isActive && <span className="text-[10px]">▶</span>}
                    {!alarm.acknowledged && <span className="text-red-500 animate-pulse">●</span>}
                    <span className={`truncate ${isActive ? 'font-bold' : ''}`}>
                      {alarm.label}{alarm.index ? ` (${alarm.index})` : ''}
                    </span>
                  </div>
                  <span className="font-mono ml-2 text-[10px]">
                    {timeStr}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER CON INSTRUCCIONES */}
        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          OK: Reconocer | ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: HISTORIAL DE ALARMAS ---
  if (currentMenuId === 'alarm_history' && alarmState) {
    const { history } = alarmState;
    const pageSize = 4;
    const currentPage = Math.floor(cursorIndex / pageSize);
    const startIdx = currentPage * pageSize;
    const visibleHistory = history.slice(startIdx, startIdx + pageSize);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        {/* HEADER */}
        <div className="bg-gray-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">
            HISTORIAL ALARMAS
          </span>
          <span className="font-mono bg-white text-gray-700 px-1 rounded-[1px] text-[10px]">
            {history.length > 0 ? `${String(cursorIndex + 1).padStart(2, '0')}/${String(history.length).padStart(2, '0')}` : '00/00'}
          </span>
        </div>

        {/* LISTA DE HISTORIAL */}
        <div className="flex-1 overflow-hidden p-1 space-y-[1px]">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-black/50 text-sm">
              Sin registros
            </div>
          ) : (
            visibleHistory.map((event, idx) => {
              const realIdx = startIdx + idx;
              const isActive = realIdx === cursorIndex;
              const timeStr = new Date(event.activatedAt).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              });
              const cleared = event.clearedAt ? '✓' : '...';

              return (
                <div
                  key={`${event.code}-${event.activatedAt}`}
                  className={`
                    px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/5 last:border-0
                    ${isActive ? 'bg-black text-white' : 'text-black'}
                  `}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isActive && <span className="text-[10px]">▶</span>}
                    <span className={`truncate ${isActive ? 'font-bold' : ''}`}>
                      {event.label}{event.index ? ` (${event.index})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px]">{timeStr}</span>
                    <span className={`text-[10px] ${event.clearedAt ? 'text-green-600' : 'text-yellow-600'}`}>
                      {cleared}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: DIAGNÓSTICO DE SONDAS ---
  if (currentMenuId === 'diag_probes') {
    const probes = [
      { id: 'PB1', label: 'Aspiración', value: liveValues?.suctionPressure ?? 0, unit: 'Bar' },
      { id: 'PB2', label: 'Impulsión', value: liveValues?.dischargeTemp ?? 0, unit: '°C' },
      { id: 'PB3', label: 'Ambiente', value: 25.0, unit: '°C' },
      { id: 'PB4', label: 'Reserva', value: '--', unit: '' },
    ];

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-blue-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">SONDAS</span>
          <span className="text-[10px]">DIAG</span>
        </div>
        <div className="flex-1 overflow-hidden p-1">
          {probes.map((probe, idx) => (
            <div
              key={probe.id}
              className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${idx === cursorIndex ? 'bg-black text-white' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold w-8">{probe.id}</span>
                <span className="truncate">{probe.label}</span>
              </div>
              <span className="font-mono">
                {typeof probe.value === 'number' ? probe.value.toFixed(1) : probe.value} {probe.unit}
              </span>
            </div>
          ))}
        </div>
        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: DIAGNÓSTICO DE ENTRADAS DIGITALES ---
  if (currentMenuId === 'diag_inputs') {
    const inputs = [
      { id: 79, label: 'Bloqueo Comp.', state: liveValues?.digitalInputs?.[79] ?? false },
      { id: 80, label: 'Presost. Baja', state: liveValues?.digitalInputs?.[80] ?? false },
      { id: 81, label: 'Presost. Alta', state: liveValues?.digitalInputs?.[81] ?? false },
      { id: 82, label: 'Alarma Ext.', state: liveValues?.digitalInputs?.[82] ?? false },
      { id: 83, label: 'Térm. Comp.', state: liveValues?.digitalInputs?.[83] ?? false },
      { id: 84, label: 'Térm. Vent.', state: liveValues?.digitalInputs?.[84] ?? false },
    ];

    const pageSize = 4;
    const startIdx = Math.floor(cursorIndex / pageSize) * pageSize;
    const visibleInputs = inputs.slice(startIdx, startIdx + pageSize);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-blue-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">ENTRADAS DI</span>
          <span className="font-mono bg-white text-blue-700 px-1 rounded-[1px] text-[10px]">
            {String(cursorIndex + 1).padStart(2, '0')}/{String(inputs.length).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1 overflow-hidden p-1">
          {visibleInputs.map((input, idx) => {
            const realIdx = startIdx + idx;
            const isActive = realIdx === cursorIndex;
            return (
              <div
                key={input.id}
                className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${isActive ? 'bg-black text-white' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {isActive && <span className="text-[10px]">▶</span>}
                  <span className="font-bold w-8">DI{input.id - 78}</span>
                  <span className="truncate">{input.label}</span>
                </div>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${input.state ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {input.state ? 'ON' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: DIAGNÓSTICO DE SALIDAS ---
  if (currentMenuId === 'diag_outputs') {
    const outputs = [
      { id: 1, label: 'Compresor 1', value: (liveValues?.activeCompressors ?? 0) > 0, type: 'digital' },
      { id: 2, label: 'Compresor 2', value: (liveValues?.activeCompressors ?? 0) > 33, type: 'digital' },
      { id: 3, label: 'Compresor 3', value: (liveValues?.activeCompressors ?? 0) > 66, type: 'digital' },
      { id: 4, label: 'Ventilador 1', value: (liveValues?.activeFans ?? 0) > 0, type: 'digital' },
      { id: 5, label: 'Ventilador 2', value: (liveValues?.activeFans ?? 0) > 33, type: 'digital' },
      { id: 6, label: 'Ventilador 3', value: (liveValues?.activeFans ?? 0) > 66, type: 'digital' },
      { id: 'AO1', label: 'Inv. Comp.', value: liveValues?.activeCompressors ?? 0, type: 'analog' },
      { id: 'AO2', label: 'Inv. Vent.', value: liveValues?.activeFans ?? 0, type: 'analog' },
    ];

    const pageSize = 4;
    const startIdx = Math.floor(cursorIndex / pageSize) * pageSize;
    const visibleOutputs = outputs.slice(startIdx, startIdx + pageSize);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-blue-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">SALIDAS</span>
          <span className="font-mono bg-white text-blue-700 px-1 rounded-[1px] text-[10px]">
            {String(cursorIndex + 1).padStart(2, '0')}/{String(outputs.length).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1 overflow-hidden p-1">
          {visibleOutputs.map((output, idx) => {
            const realIdx = startIdx + idx;
            const isActive = realIdx === cursorIndex;
            return (
              <div
                key={output.id}
                className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${isActive ? 'bg-black text-white' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {isActive && <span className="text-[10px]">▶</span>}
                  <span className="font-bold w-8">{typeof output.id === 'number' ? `DO${output.id}` : output.id}</span>
                  <span className="truncate">{output.label}</span>
                </div>
                {output.type === 'digital' ? (
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${output.value ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {output.value ? 'ON' : 'OFF'}
                  </span>
                ) : (
                  <span className="font-mono">{output.value}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: EDITOR DE FECHA/HORA ---
  if (currentMenuId === 'clock_datetime') {
    // Usar reloj simulado dinámico o fecha actual como fallback
    const simDateTime = liveValues?.simulatedDateTime ?? new Date();

    // Si estamos en modo edición, usar valores temporales
    const isEditing = dateTimeEditMode && dateTimeTemp && dateTimeTemp.length === 5;
    const displayValues = isEditing ? dateTimeTemp : [
      simDateTime.getDate(),
      simDateTime.getMonth() + 1,
      simDateTime.getFullYear(),
      simDateTime.getHours(),
      simDateTime.getMinutes()
    ];

    const fields = [
      { label: 'Día', value: displayValues[0].toString().padStart(2, '0') },
      { label: 'Mes', value: displayValues[1].toString().padStart(2, '0') },
      { label: 'Año', value: displayValues[2].toString() },
      { label: 'Hora', value: displayValues[3].toString().padStart(2, '0') },
      { label: 'Min', value: displayValues[4].toString().padStart(2, '0') },
    ];

    const fieldIdx = dateTimeFieldIndex ?? 0;

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className={`${isEditing ? 'bg-orange-600' : 'bg-purple-700'} text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0`}>
          <span className="uppercase font-bold tracking-wide">FECHA / HORA</span>
          <span className="text-[10px]">{isEditing ? 'EDITANDO' : 'RTC (x600)'}</span>
        </div>

        {/* Display grande de fecha/hora */}
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="text-2xl font-bold tracking-wider mb-2">
            <span className={isEditing && fieldIdx === 0 ? 'bg-yellow-300 text-black px-1' : ''}>
              {fields[0].value}
            </span>/
            <span className={isEditing && fieldIdx === 1 ? 'bg-yellow-300 text-black px-1' : ''}>
              {fields[1].value}
            </span>/
            <span className={isEditing && fieldIdx === 2 ? 'bg-yellow-300 text-black px-1' : ''}>
              {fields[2].value}
            </span>
          </div>
          <div className="text-3xl font-bold tracking-widest">
            <span className={isEditing && fieldIdx === 3 ? 'bg-yellow-300 text-black px-1' : ''}>
              {fields[3].value}
            </span>:
            <span className={isEditing && fieldIdx === 4 ? 'bg-yellow-300 text-black px-1' : ''}>
              {fields[4].value}
            </span>:
            <span className="text-xl">{simDateTime.getSeconds().toString().padStart(2, '0')}</span>
          </div>

          {/* Campos editables */}
          <div className="mt-4 flex gap-2">
            {fields.map((field, idx) => (
              <div
                key={field.label}
                className={`text-center px-2 py-1 rounded ${isEditing && idx === fieldIdx
                  ? 'bg-orange-500 text-white animate-pulse'
                  : idx === fieldIdx
                    ? 'bg-black text-white'
                    : 'bg-black/10'
                  }`}
              >
                <div className="text-[8px] uppercase">{field.label}</div>
                <div className="font-bold">{field.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          {isEditing ? 'OK: Guardar | ESC: Cancelar' : 'OK: Editar | ▲▼: Campo | ESC: Volver'}
        </div>
      </div>
    );
  }

  // --- RENDER: EDITOR DE PROGRAMACIONES ---
  if (currentMenuId === 'schedule_economy' || currentMenuId === 'schedule_onoff') {
    const isEconomy = currentMenuId === 'schedule_economy';
    const title = isEconomy ? 'HORARIO ECONOMY' : 'HORARIO ON/OFF';

    // Programación ejemplo (7 días)
    const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const schedules = days.map((day, i) => ({
      day,
      on: '08:00',
      off: '20:00',
      enabled: i < 5 // L-V habilitados
    }));

    const pageSize = 4;
    const startIdx = Math.floor(cursorIndex / pageSize) * pageSize;
    const visibleSchedules = schedules.slice(startIdx, startIdx + pageSize);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className={`${isEconomy ? 'bg-green-700' : 'bg-orange-600'} text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0`}>
          <span className="uppercase font-bold tracking-wide">{title}</span>
          <span className="font-mono bg-white text-black px-1 rounded-[1px] text-[10px]">
            {String(cursorIndex + 1).padStart(2, '0')}/{String(schedules.length).padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1 overflow-hidden p-1">
          {visibleSchedules.map((sched, idx) => {
            const realIdx = startIdx + idx;
            const isActive = realIdx === cursorIndex;
            return (
              <div
                key={sched.day}
                className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${isActive ? 'bg-black text-white' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {isActive && <span className="text-[10px]">▶</span>}
                  <span className={`font-bold w-8 ${!sched.enabled ? 'opacity-50' : ''}`}>{sched.day}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${!sched.enabled ? 'opacity-50' : ''}`}>
                    {sched.on} - {sched.off}
                  </span>
                  <span className={`text-[10px] px-1 rounded ${sched.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                    {sched.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          OK: Editar | ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: HORAS DE FUNCIONAMIENTO ---
  if (currentMenuId === 'hours_comp' || currentMenuId === 'hours_fans') {
    const isComp = currentMenuId === 'hours_comp';
    const title = isComp ? 'HORAS COMPRESORES' : 'HORAS VENTILADORES';

    // Helper para convertir segundos a formato horas:minutos
    const formatHours = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours.toLocaleString()}:${mins.toString().padStart(2, '0')}`;
    };

    // Datos dinámicos de horas de funcionamiento
    const items = isComp ? [
      { id: 'C1', label: 'Compresor 1', hours: liveValues?.hoursCompressor1 ?? 0 },
      { id: 'C2', label: 'Compresor 2', hours: liveValues?.hoursCompressor2 ?? 0 },
      { id: 'C3', label: 'Compresor 3', hours: liveValues?.hoursCompressor3 ?? 0 },
      { id: 'SYS', label: 'Sistema Total', hours: liveValues?.hoursSystem ?? 0 },
    ] : [
      { id: 'V1', label: 'Ventilador 1', hours: liveValues?.hoursFan1 ?? 0 },
      { id: 'V2', label: 'Ventilador 2', hours: liveValues?.hoursFan2 ?? 0 },
      { id: 'V3', label: 'Ventilador 3', hours: liveValues?.hoursFan3 ?? 0 },
      { id: 'SYS', label: 'Sistema Total', hours: liveValues?.hoursSystem ?? 0 },
    ];

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-teal-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">{title}</span>
          <span className="text-[10px]">LIVE</span>
        </div>

        <div className="flex-1 overflow-hidden p-1">
          {items.map((item, idx) => {
            const isActive = idx === cursorIndex;
            return (
              <div
                key={item.id}
                className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${isActive ? 'bg-black text-white' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {isActive && <span className="text-[10px]">▶</span>}
                  <span className="font-bold w-8">{item.id}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="font-mono font-bold">
                  {formatHours(item.hours)} h
                </span>
              </div>
            );
          })}
        </div>

        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: CONTADORES ---
  if (currentMenuId === 'service_counters') {
    // Datos dinámicos de contadores
    const counters = [
      { label: 'Arranques C1', value: liveValues?.startsCompressor1 ?? 0 },
      { label: 'Arranques C2', value: liveValues?.startsCompressor2 ?? 0 },
      { label: 'Arranques C3', value: liveValues?.startsCompressor3 ?? 0 },
      { label: 'Alarmas Activas', value: alarmState?.activeAlarms.length ?? 0 },
      { label: 'Historial Alarmas', value: alarmState?.history.length ?? 0 },
    ];

    const pageSize = 4;
    const startIdx = Math.floor(cursorIndex / pageSize) * pageSize;
    const visibleCounters = counters.slice(startIdx, startIdx + pageSize);

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-teal-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">CONTADORES</span>
          <span className="font-mono bg-white text-teal-700 px-1 rounded-[1px] text-[10px]">
            {String(cursorIndex + 1).padStart(2, '0')}/{String(counters.length).padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1 overflow-hidden p-1">
          {visibleCounters.map((counter, idx) => {
            const realIdx = startIdx + idx;
            const isActive = realIdx === cursorIndex;
            return (
              <div
                key={counter.label}
                className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${isActive ? 'bg-black text-white' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {isActive && <span className="text-[10px]">▶</span>}
                  <span className="truncate">{counter.label}</span>
                </div>
                <span className="font-mono font-bold">
                  {counter.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: ESTADO DEL SISTEMA ---
  if (currentMenuId === 'diag_status') {
    const statusItems = [
      { label: 'Sistema', value: liveValues?.systemOn ? 'ENCENDIDO' : 'APAGADO' },
      { label: 'Dem. Comp.', value: `${liveValues?.activeCompressors ?? 0}%` },
      { label: 'Dem. Vent.', value: `${liveValues?.activeFans ?? 0}%` },
      { label: 'Alarmas', value: alarmState?.activeAlarms.length ?? 0 },
    ];

    return (
      <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
        <div className="bg-blue-700 text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
          <span className="uppercase font-bold tracking-wide">ESTADO SISTEMA</span>
          <span className="text-[10px]">INFO</span>
        </div>
        <div className="flex-1 overflow-hidden p-1">
          {statusItems.map((item, idx) => (
            <div
              key={item.label}
              className={`px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/10 ${idx === cursorIndex ? 'bg-black text-white' : ''}`}
            >
              <span className="font-bold">{item.label}</span>
              <span className="font-mono">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="h-6 bg-black/10 flex items-center justify-center text-[9px] text-black/60">
          ESC: Volver
        </div>
      </div>
    );
  }

  // --- RENDER: MENÚS Y NAVEGACIÓN (Pág 28) ---
  return (
    <div className="w-full h-full bg-[#c8d4e0] text-black font-mono flex flex-col">
      {/* HEADER DE MENÚ (Estilo invertido negro) */}
      <div className="bg-black text-white px-2 py-1 flex justify-between items-center text-xs h-7 shrink-0">
        <span className="uppercase font-bold tracking-wide truncate max-w-[70%]">
          {menuNode?.label || 'MENU'}
        </span>
        <span className="font-mono bg-white text-black px-1 rounded-[1px] text-[10px]">
          {String(cursorIndex + 1).padStart(2, '0')}/{String(menuItems.length).padStart(2, '0')}
        </span>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="flex-1 overflow-hidden p-1 space-y-[1px]">
        {menuItems.slice(Math.floor(cursorIndex / 4) * 4, (Math.floor(cursorIndex / 4) * 4) + 4).map((item, idx) => {
          // Lógica de paginación simple (mostrar de 4 en 4)
          const realIdx = menuItems.indexOf(item);
          const isActive = realIdx === cursorIndex;
          let valueDisplay = '';

          if (item.type === 'parameter_link' && item.parameterId) {
            const val = (editMode && isActive && tempValue !== null) ? tempValue : parameters[item.parameterId];
            const paramData = getParamData(item.parameterId);
            const unit = paramData ? getUnitLabel(paramData.unitType as any) : '';

            if (paramData?.type === 'enum' && paramData.options) {
              const option = paramData.options.find(o => o.value === Number(val));
              valueDisplay = option ? option.label : String(val);
            } else {
              // Formateo decimal si es float
              valueDisplay = Number(val) % 1 !== 0 ? Number(val).toFixed(1) : String(val);
              valueDisplay += ` ${unit}`;
            }
          }

          return (
            <div
              key={item.id}
              className={`
                px-2 py-1.5 text-xs flex justify-between items-center border-b border-black/5 last:border-0
                ${isActive ? 'bg-black text-white' : 'text-black'}
              `}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Flecha selectora */}
                {isActive && <span className="text-[10px]">▶</span>}
                <span className={`truncate ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </div>

              {/* Valor del parámetro */}
              {item.type === 'parameter_link' && (
                <span className={`font-mono ml-2 ${isActive && editMode ? 'animate-pulse bg-white text-black px-1' : ''}`}>
                  {valueDisplay}
                </span>
              )}

              {/* Indicador de carpeta */}
              {item.type === 'folder' && <span className="text-[10px]">►</span>}
            </div>
          );
        })}
      </div>

      {/* SCROLLBAR SIMULADA (Si hay más items) */}
      {menuItems.length > 4 && (
        <div className="absolute right-0.5 top-8 bottom-1 w-1 bg-black/10 rounded-full">
          <div
            className="w-full bg-black rounded-full transition-all duration-200"
            style={{
              height: `${(4 / menuItems.length) * 100}%`,
              top: `${(cursorIndex / menuItems.length) * 100}%`,
              position: 'absolute'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LcdScreen;