/**
 * src/hooks/useSimulationLoop.ts
 * Motor de física y regulación con soporte para I/O dinámica,
 * control manual y detección de alarmas.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { IOConfigurationResult } from './useIOConfiguration';

export interface SimulationState {
  suctionPressure: number; // Bar
  dischargeTemp: number;   // °C
  activeCompressors: number; // 0-100%
  activeFans: number;      // 0-100%
  digitalInputs: Record<string, boolean>; // Estado de las entradas digitales (ID -> Estado)
  systemOn: boolean;       // Sistema encendido/apagado
  // Contadores de horas (en segundos para precisión interna, mostrados como horas)
  hoursCompressor1: number;
  hoursCompressor2: number;
  hoursCompressor3: number;
  hoursFan1: number;
  hoursFan2: number;
  hoursFan3: number;
  hoursSystem: number;
  // Contadores de arranques
  startsCompressor1: number;
  startsCompressor2: number;
  startsCompressor3: number;
  // Reloj simulado
  simulatedDateTime: Date;
  // Estado de tiempos mínimos
  compressorLocked: boolean;   // Si está bloqueado por tiempo mínimo ON/OFF
  compressorState: boolean;    // Estado real del compresor (ON/OFF)
  // NUEVO: Estado de salidas digitales (OUT1-OUT19)
  digitalOutputStates: Record<string, boolean>;
  // NUEVO: Estado de salidas analógicas (AO1-AO2)
  analogOutputValues: Record<string, number>;
  // NUEVO: Valores de entradas analógicas
  analogInputValues: Record<string, number>;
}

export interface SimulationControls {
  setPressureOverride: (val: number | null) => void;
  setTempOverride: (val: number | null) => void;
  toggleDigitalInput: (id: string) => void;
  setDigitalInput: (id: string, value: boolean) => void;
  setAnalogInput: (id: string, value: number) => void;
  toggleSystem: () => void;
  setSimulatedDateTime: (date: Date) => void;
  resetCounters: () => void;
  overrides: {
    pressure: number | null;
    temp: number | null;
  };
}

// Callbacks para notificar condiciones de alarma
export interface AlarmCallbacks {
  onAlarmTrigger?: (code: number, index?: number) => void;
  onAlarmClear?: (code: number, index?: number) => void;
}

// Códigos de alarma
const ALARM_CODES = {
  LPr: 0,   // Baja presión aspiración
  HPr: 1,   // Alta presión aspiración
  HA: 2,    // Máxima sonda aspiración
  LA: 3,    // Mínima sonda aspiración
  HPd: 7,   // Alta presión impulsión
  HA_IMP: 8,  // Máxima sonda impulsión
  LA_IMP: 9,  // Mínima sonda impulsión
  tF: 10,   // Térmica ventilador
  tC: 18,   // Térmica compresor
  gA: 25,   // Alarma genérica
};

// Códigos de función para entradas digitales
const DI_FUNCTION_CODES = {
  GENERIC_ALARM: 1,
  THERMAL_COMPRESSOR_1: 52,
  THERMAL_COMPRESSOR_2: 53,
  THERMAL_COMPRESSOR_3: 54,
  THERMAL_FAN_1: 70,
  THERMAL_FAN_2: 71,
  THERMAL_FAN_3: 72,
  BLOCK_COMPRESSOR_1: 79,
  BLOCK_COMPRESSOR_2: 80,
  BLOCK_COMPRESSOR_3: 81,
  LP_COMPRESSOR_1: 40,
  HP_COMPRESSOR_1: 28,
  STANDBY: 97,
};

export const useSimulationLoop = (
  parameters: Record<string, number>,
  ioConfig: IOConfigurationResult,
  alarmCallbacks?: AlarmCallbacks
): [SimulationState, SimulationControls] => {
  // Estado visible para la UI
  const [simState, setSimState] = useState<SimulationState>({
    suctionPressure: 2.0,
    dischargeTemp: 35.0,
    activeCompressors: 0,
    activeFans: 0,
    digitalInputs: {},
    systemOn: true,
    // Contadores de horas (en segundos)
    hoursCompressor1: 0,
    hoursCompressor2: 0,
    hoursCompressor3: 0,
    hoursFan1: 0,
    hoursFan2: 0,
    hoursFan3: 0,
    hoursSystem: 0,
    // Contadores de arranques
    startsCompressor1: 0,
    startsCompressor2: 0,
    startsCompressor3: 0,
    // Reloj simulado
    simulatedDateTime: new Date(),
    // Estado de tiempos mínimos
    compressorLocked: false,
    compressorState: false,
    // NUEVO: Estados I/O
    digitalOutputStates: {},
    analogOutputValues: {},
    analogInputValues: {},
  });

  // Estado interno de "Overrides" (Manual vs Automático)
  const [overrides, setOverrides] = useState<{ pressure: number | null, temp: number | null }>({
    pressure: null,
    temp: null
  });

  // Referencias mutables para el bucle de física (evitan reinicios del intervalo)
  const physicsRef = useRef({
    pressure: 2.0,
    temp: 35.0,
    digitalInputs: {} as Record<string, boolean>,
    analogInputValues: {} as Record<string, number>,
    systemOn: true,
    // Contadores de tiempo (en segundos)
    hoursCompressor1: 0,
    hoursCompressor2: 0,
    hoursCompressor3: 0,
    hoursFan1: 0,
    hoursFan2: 0,
    hoursFan3: 0,
    hoursSystem: 0,
    // Contadores de arranques
    startsCompressor1: 0,
    startsCompressor2: 0,
    startsCompressor3: 0,
    // Estado anterior para detectar arranques
    prevCompressorActive: false,
    prevFanActive: false,
    // Reloj simulado
    simulatedDateTime: new Date(),
    // Tiempos mínimos ON/OFF - timestamps de último cambio de estado (en segundos simulados)
    lastCompressorOnTime: 0,    // Tiempo cuando se encendió
    lastCompressorOffTime: 0,   // Tiempo cuando se apagó
    compressorState: false,     // Estado actual del compresor (respetando tiempos mínimos)
    compressorLocked: false,    // Si está bloqueado por tiempo mínimo
    // Estado de salidas
    digitalOutputStates: {} as Record<string, boolean>,
    analogOutputValues: {} as Record<string, number>,
  });

  // Estado de alarmas activas (para evitar disparos repetidos)
  const activeAlarmsRef = useRef<Set<string>>(new Set());

  // Sincronizar overrides con refs para el loop
  const overridesRef = useRef(overrides);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);

  // Callbacks ref para evitar dependencias en el efecto
  const callbacksRef = useRef(alarmCallbacks);
  useEffect(() => { callbacksRef.current = alarmCallbacks; }, [alarmCallbacks]);

  // ioConfig ref para el loop
  const ioConfigRef = useRef(ioConfig);
  useEffect(() => { ioConfigRef.current = ioConfig; }, [ioConfig]);

  // Inicializar valores analógicos por defecto
  useEffect(() => {
    const analogDefaults: Record<string, number> = {};

    // Inicializar entradas de presión
    ioConfig.ioState.analogInputsPressure.forEach(io => {
      if (io.isEnabled) {
        analogDefaults[io.id] = 2.0; // Valor por defecto presión
      }
    });

    // Inicializar entradas de temperatura
    ioConfig.ioState.analogInputsTemp.forEach(io => {
      if (io.isEnabled) {
        analogDefaults[io.id] = 25.0; // Valor por defecto temperatura
      }
    });

    physicsRef.current.analogInputValues = {
      ...physicsRef.current.analogInputValues,
      ...analogDefaults
    };
  }, [ioConfig.ioState]);

  // --- CONTROLES EXTERNOS ---

  const setPressureOverride = useCallback((val: number | null) => {
    setOverrides(prev => ({ ...prev, pressure: val }));
    if (val !== null) physicsRef.current.pressure = val;
  }, []);

  const setTempOverride = useCallback((val: number | null) => {
    setOverrides(prev => ({ ...prev, temp: val }));
    if (val !== null) physicsRef.current.temp = val;
  }, []);

  const toggleDigitalInput = useCallback((id: string) => {
    physicsRef.current.digitalInputs = {
      ...physicsRef.current.digitalInputs,
      [id]: !physicsRef.current.digitalInputs[id]
    };
    setSimState(prev => ({
      ...prev,
      digitalInputs: physicsRef.current.digitalInputs
    }));
  }, []);

  const setDigitalInput = useCallback((id: string, value: boolean) => {
    physicsRef.current.digitalInputs = {
      ...physicsRef.current.digitalInputs,
      [id]: value
    };
    setSimState(prev => ({
      ...prev,
      digitalInputs: physicsRef.current.digitalInputs
    }));
  }, []);

  const setAnalogInput = useCallback((id: string, value: number) => {
    physicsRef.current.analogInputValues = {
      ...physicsRef.current.analogInputValues,
      [id]: value
    };

    // Si es una entrada de presión configurada como aspiración, sincronizar
    const suctionInput = ioConfigRef.current.getSuctionPressureInput();
    if (suctionInput && suctionInput.id === id) {
      physicsRef.current.pressure = value;
    }

    // Si es una entrada de temperatura configurada como impulsión, sincronizar
    const dischargeTempInput = ioConfigRef.current.getDischargeTempInput();
    if (dischargeTempInput && dischargeTempInput.id === id) {
      physicsRef.current.temp = value;
    }
  }, []);

  const toggleSystem = useCallback(() => {
    physicsRef.current.systemOn = !physicsRef.current.systemOn;
    setSimState(prev => ({
      ...prev,
      systemOn: physicsRef.current.systemOn
    }));
  }, []);

  const setSimulatedDateTime = useCallback((date: Date) => {
    physicsRef.current.simulatedDateTime = new Date(date);
    setSimState(prev => ({
      ...prev,
      simulatedDateTime: new Date(date)
    }));
  }, []);

  const resetCounters = useCallback(() => {
    physicsRef.current.hoursCompressor1 = 0;
    physicsRef.current.hoursCompressor2 = 0;
    physicsRef.current.hoursCompressor3 = 0;
    physicsRef.current.hoursFan1 = 0;
    physicsRef.current.hoursFan2 = 0;
    physicsRef.current.hoursFan3 = 0;
    physicsRef.current.hoursSystem = 0;
    physicsRef.current.startsCompressor1 = 0;
    physicsRef.current.startsCompressor2 = 0;
    physicsRef.current.startsCompressor3 = 0;
    setSimState(prev => ({
      ...prev,
      hoursCompressor1: 0,
      hoursCompressor2: 0,
      hoursCompressor3: 0,
      hoursFan1: 0,
      hoursFan2: 0,
      hoursFan3: 0,
      hoursSystem: 0,
      startsCompressor1: 0,
      startsCompressor2: 0,
      startsCompressor3: 0
    }));
  }, []);

  // --- HELPERS DE ALARMA ---

  const triggerAlarmIfNew = useCallback((code: number, index?: number) => {
    const key = `${code}-${index ?? 'none'}`;
    if (!activeAlarmsRef.current.has(key)) {
      activeAlarmsRef.current.add(key);
      callbacksRef.current?.onAlarmTrigger?.(code, index);
    }
  }, []);

  const clearAlarmIfActive = useCallback((code: number, index?: number) => {
    const key = `${code}-${index ?? 'none'}`;
    if (activeAlarmsRef.current.has(key)) {
      activeAlarmsRef.current.delete(key);
      callbacksRef.current?.onAlarmClear?.(code, index);
    }
  }, []);

  // --- BUCLE DE FÍSICA ---

  useEffect(() => {
    const tickRate = 100; // 10Hz

    const interval = setInterval(() => {
      const p = physicsRef.current;
      const ov = overridesRef.current;
      const io = ioConfigRef.current;

      // Si el sistema está apagado, no hay regulación
      if (!p.systemOn) {
        // Apagar todas las salidas
        const emptyOutputs: Record<string, boolean> = {};
        io.ioState.digitalOutputs.forEach(out => {
          emptyOutputs[out.id] = false;
        });

        setSimState(prev => ({
          ...prev,
          activeCompressors: 0,
          activeFans: 0,
          systemOn: false,
          digitalOutputStates: emptyOutputs,
          analogOutputValues: { AO1: 0, AO2: 0 }
        }));
        return;
      }

      // 1. Leer Parámetros
      const setpointAsp = parameters['143-SEt'] ?? 1.5;
      const bandAsp = parameters['144-Pbd'] ?? 1.0;
      const setpointImp = parameters['343-SEt'] ?? 35.0;
      const bandImp = parameters['344-Pbd'] ?? 5.0;

      // Umbrales de alarma
      const alarmHighAsp = parameters['151-HAL'] ?? (setpointAsp + bandAsp + 2);
      const alarmLowAsp = parameters['149-LAL'] ?? (setpointAsp - 2);
      const alarmHighImp = parameters['348-HAL'] ?? (setpointImp + bandImp + 5);
      const alarmLowImp = parameters['354-LAL'] ?? (setpointImp - 5);

      // 2. Detección de Alarmas por Entradas Digitales (Dinámico)

      // Buscar entradas configuradas como alarma genérica
      const genericAlarmActive = io.getDigitalInputState(
        DI_FUNCTION_CODES.GENERIC_ALARM,
        p.digitalInputs
      );
      if (genericAlarmActive) {
        triggerAlarmIfNew(ALARM_CODES.gA);
      } else {
        clearAlarmIfActive(ALARM_CODES.gA);
      }

      // Buscar entradas configuradas como térmicas de compresor
      for (let i = 1; i <= 3; i++) {
        const thermalActive = io.getDigitalInputState(
          DI_FUNCTION_CODES.THERMAL_COMPRESSOR_1 + i - 1,
          p.digitalInputs
        );
        if (thermalActive) {
          triggerAlarmIfNew(ALARM_CODES.tC, i);
        } else {
          clearAlarmIfActive(ALARM_CODES.tC, i);
        }
      }

      // Buscar entradas configuradas como térmicas de ventilador
      for (let i = 1; i <= 3; i++) {
        const thermalActive = io.getDigitalInputState(
          DI_FUNCTION_CODES.THERMAL_FAN_1 + i - 1,
          p.digitalInputs
        );
        if (thermalActive) {
          triggerAlarmIfNew(ALARM_CODES.tF, i);
        } else {
          clearAlarmIfActive(ALARM_CODES.tF, i);
        }
      }

      // Presostatos LP/HP
      const lpActive = io.getDigitalInputState(DI_FUNCTION_CODES.LP_COMPRESSOR_1, p.digitalInputs);
      if (lpActive) {
        triggerAlarmIfNew(ALARM_CODES.LPr);
      } else {
        clearAlarmIfActive(ALARM_CODES.LPr);
      }

      const hpActive = io.getDigitalInputState(DI_FUNCTION_CODES.HP_COMPRESSOR_1, p.digitalInputs);
      if (hpActive) {
        triggerAlarmIfNew(ALARM_CODES.HPr);
      } else {
        clearAlarmIfActive(ALARM_CODES.HPr);
      }

      // 3. Detección de Alarmas por Valores de Sonda

      if (p.pressure > alarmHighAsp) {
        triggerAlarmIfNew(ALARM_CODES.HA);
      } else {
        clearAlarmIfActive(ALARM_CODES.HA);
      }

      if (p.pressure < alarmLowAsp) {
        triggerAlarmIfNew(ALARM_CODES.LA);
      } else {
        clearAlarmIfActive(ALARM_CODES.LA);
      }

      if (p.temp > alarmHighImp) {
        triggerAlarmIfNew(ALARM_CODES.HA_IMP);
      } else {
        clearAlarmIfActive(ALARM_CODES.HA_IMP);
      }

      if (p.temp < alarmLowImp) {
        triggerAlarmIfNew(ALARM_CODES.LA_IMP);
      } else {
        clearAlarmIfActive(ALARM_CODES.LA_IMP);
      }

      // 4. Lógica de Regulación con Tiempos Mínimos ON/OFF

      const minOnTime = parameters['124-don'] ?? 120;
      const minOffTime = parameters['125-doF'] ?? 180;

      // Verificar bloqueos dinámicamente
      let hasBlockingAlarm = false;
      for (let i = 1; i <= 3; i++) {
        const blockActive = io.getDigitalInputState(
          DI_FUNCTION_CODES.BLOCK_COMPRESSOR_1 + i - 1,
          p.digitalInputs
        );
        const thermalActive = io.getDigitalInputState(
          DI_FUNCTION_CODES.THERMAL_COMPRESSOR_1 + i - 1,
          p.digitalInputs
        );
        if (blockActive || thermalActive) {
          hasBlockingAlarm = true;
          break;
        }
      }

      // Verificar stand-by
      const standbyActive = io.getDigitalInputState(DI_FUNCTION_CODES.STANDBY, p.digitalInputs);
      if (standbyActive) {
        hasBlockingAlarm = true;
      }

      // Calcular demanda teórica
      let theoreticalDemand = 0;

      if (hasBlockingAlarm) {
        theoreticalDemand = 0;
      } else {
        if (p.pressure > setpointAsp + bandAsp) theoreticalDemand = 100;
        else if (p.pressure < setpointAsp) theoreticalDemand = 0;
        else theoreticalDemand = ((p.pressure - setpointAsp) / bandAsp) * 100;
      }

      // Determinar si el compresor DEBERÍA estar encendido
      const shouldBeOn = theoreticalDemand > 10 && !hasBlockingAlarm;

      // Tiempo actual simulado
      const currentSimTime = p.hoursSystem;

      // Aplicar tiempos mínimos ON/OFF
      let compDemand = theoreticalDemand;

      if (p.compressorState) {
        const timeOn = currentSimTime - p.lastCompressorOnTime;

        if (!shouldBeOn && timeOn >= minOnTime) {
          p.compressorState = false;
          p.lastCompressorOffTime = currentSimTime;
          p.compressorLocked = false;
          compDemand = 0;
        } else if (!shouldBeOn && timeOn < minOnTime) {
          p.compressorLocked = true;
          compDemand = Math.max(theoreticalDemand, 33);
        } else {
          p.compressorLocked = false;
          compDemand = theoreticalDemand;
        }
      } else {
        const timeOff = currentSimTime - p.lastCompressorOffTime;

        if (shouldBeOn && timeOff >= minOffTime) {
          p.compressorState = true;
          p.lastCompressorOnTime = currentSimTime;
          p.compressorLocked = false;
          compDemand = theoreticalDemand;
        } else if (shouldBeOn && timeOff < minOffTime) {
          p.compressorLocked = true;
          compDemand = 0;
        } else {
          p.compressorLocked = false;
          compDemand = 0;
        }
      }

      // Regulación de ventiladores
      let fanDemand = 0;
      let fanBlocked = false;

      for (let i = 1; i <= 3; i++) {
        const thermalActive = io.getDigitalInputState(
          DI_FUNCTION_CODES.THERMAL_FAN_1 + i - 1,
          p.digitalInputs
        );
        if (thermalActive) {
          fanBlocked = true;
          break;
        }
      }

      if (fanBlocked) {
        fanDemand = 0;
      } else {
        if (p.temp > setpointImp + bandImp) fanDemand = 100;
        else if (p.temp < setpointImp) fanDemand = 0;
        else fanDemand = ((p.temp - setpointImp) / bandImp) * 100;
      }

      // 5. Actualizar salidas digitales (Dinámico)

      const newDigitalOutputs: Record<string, boolean> = {};
      const hasAlarm = activeAlarmsRef.current.size > 0;

      io.ioState.digitalOutputs.forEach(output => {
        if (!output.isEnabled) {
          newDigitalOutputs[output.id] = false;
          return;
        }

        const funcCode = Math.abs(output.functionCode);
        let shouldBeActive = false;

        // Compresores (19-30)
        if (funcCode >= 19 && funcCode <= 30) {
          const compIndex = funcCode - 18; // 1-12
          const compThreshold = (compIndex - 1) * (100 / 3); // Escalonamiento
          shouldBeActive = compDemand > compThreshold && p.compressorState;
        }
        // Ventiladores (10-17)
        else if (funcCode >= 10 && funcCode <= 17) {
          const fanIndex = funcCode - 9; // 1-8
          const fanThreshold = (fanIndex - 1) * (100 / 3);
          shouldBeActive = fanDemand > fanThreshold && !fanBlocked;
        }
        // Alarma acumulativa (9)
        else if (funcCode === 9) {
          shouldBeActive = hasAlarm;
        }
        // Relé de seguridad (8)
        else if (funcCode === 8) {
          shouldBeActive = !hasAlarm && p.systemOn;
        }

        // Aplicar polaridad inversa si corresponde
        newDigitalOutputs[output.id] = output.isInverted ? !shouldBeActive : shouldBeActive;
      });

      p.digitalOutputStates = newDigitalOutputs;

      // 6. Actualizar salidas analógicas

      const newAnalogOutputs: Record<string, number> = {};

      io.ioState.analogOutputs.forEach(output => {
        if (!output.isEnabled) {
          newAnalogOutputs[output.id] = 0;
          return;
        }

        const funcCode = Math.abs(output.functionCode);

        // Inverter ventilador (1)
        if (funcCode === 1) {
          newAnalogOutputs[output.id] = fanBlocked ? 0 : fanDemand;
        }
        // Inverter compresor C1 (2)
        else if (funcCode === 2) {
          newAnalogOutputs[output.id] = hasBlockingAlarm ? 0 : compDemand;
        }
        // Inverter compresor C2 (3)
        else if (funcCode === 3) {
          newAnalogOutputs[output.id] = hasBlockingAlarm ? 0 : compDemand;
        }
        // Regulador configurable (4)
        else if (funcCode === 4) {
          newAnalogOutputs[output.id] = 0; // TODO: Implementar regulador configurable
        }
        else {
          newAnalogOutputs[output.id] = 0;
        }
      });

      p.analogOutputValues = newAnalogOutputs;

      // 7. Física Mejorada con Inercia Térmica

      const PRESSURE_INERTIA = 0.15;
      const TEMP_INERTIA = 0.08;
      const ambientTemp = 25 + Math.sin(Date.now() / 60000) * 3;

      if (ov.pressure === null) {
        const baseLoad = 0.03;
        const tempEffect = (p.temp - 30) * 0.002;
        const compressorEffect = (compDemand / 100) * 0.08;
        const targetPressure = p.pressure + baseLoad + tempEffect - compressorEffect;
        const pressureDelta = (targetPressure - p.pressure) * PRESSURE_INERTIA;
        p.pressure = Math.max(0, Math.min(30, p.pressure + pressureDelta));
      } else {
        p.pressure = ov.pressure;
      }

      if (ov.temp === null) {
        const compressionHeat = (compDemand / 100) * 0.5;
        const fanCooling = (fanDemand / 100) * 0.8;
        const ambientExchange = (ambientTemp - p.temp) * 0.03;
        const targetTemp = p.temp + compressionHeat - fanCooling + ambientExchange;
        const tempDelta = (targetTemp - p.temp) * TEMP_INERTIA;
        p.temp = Math.max(-20, Math.min(100, p.temp + tempDelta));
      } else {
        p.temp = ov.temp;
      }

      // 8. Sincronizar valores analógicos con las entradas correspondientes

      // Actualizar el valor de la entrada de presión de aspiración
      const suctionInput = io.getSuctionPressureInput();
      if (suctionInput) {
        p.analogInputValues[suctionInput.id] = p.pressure;
      }

      // Actualizar el valor de la entrada de temperatura de impulsión
      const dischargeTempInput = io.getDischargeTempInput();
      if (dischargeTempInput) {
        p.analogInputValues[dischargeTempInput.id] = p.temp;
      }

      // 9. Contadores de Horas y Arranques

      const tickSeconds = tickRate / 1000;

      if (p.systemOn) {
        p.hoursSystem += tickSeconds;
      }

      const compressorActive = compDemand > 10;
      const fanActive = fanDemand > 10;

      if (compressorActive) {
        p.hoursCompressor1 += tickSeconds;
        if (compDemand > 33) p.hoursCompressor2 += tickSeconds;
        if (compDemand > 66) p.hoursCompressor3 += tickSeconds;
      }

      if (fanActive) {
        p.hoursFan1 += tickSeconds;
        if (fanDemand > 33) p.hoursFan2 += tickSeconds;
        if (fanDemand > 66) p.hoursFan3 += tickSeconds;
      }

      if (compressorActive && !p.prevCompressorActive) {
        p.startsCompressor1++;
        if (compDemand > 33) p.startsCompressor2++;
        if (compDemand > 66) p.startsCompressor3++;
      }
      p.prevCompressorActive = compressorActive;
      p.prevFanActive = fanActive;

      // Avanzar reloj simulado
      const timeAcceleration = 600;
      p.simulatedDateTime = new Date(p.simulatedDateTime.getTime() + tickSeconds * 1000 * timeAcceleration);

      // 10. Emitir Estado

      setSimState({
        suctionPressure: parseFloat(p.pressure.toFixed(2)),
        dischargeTemp: parseFloat(p.temp.toFixed(1)),
        activeCompressors: Math.round(compDemand),
        activeFans: Math.round(fanDemand),
        digitalInputs: { ...p.digitalInputs },
        systemOn: p.systemOn,
        hoursCompressor1: p.hoursCompressor1,
        hoursCompressor2: p.hoursCompressor2,
        hoursCompressor3: p.hoursCompressor3,
        hoursFan1: p.hoursFan1,
        hoursFan2: p.hoursFan2,
        hoursFan3: p.hoursFan3,
        hoursSystem: p.hoursSystem,
        startsCompressor1: p.startsCompressor1,
        startsCompressor2: p.startsCompressor2,
        startsCompressor3: p.startsCompressor3,
        simulatedDateTime: new Date(p.simulatedDateTime),
        compressorLocked: p.compressorLocked,
        compressorState: p.compressorState,
        digitalOutputStates: { ...p.digitalOutputStates },
        analogOutputValues: { ...p.analogOutputValues },
        analogInputValues: { ...p.analogInputValues },
      });

    }, tickRate);

    return () => clearInterval(interval);
  }, [parameters, triggerAlarmIfNew, clearAlarmIfActive]);

  return [
    simState,
    {
      setPressureOverride,
      setTempOverride,
      toggleDigitalInput,
      setDigitalInput,
      setAnalogInput,
      toggleSystem,
      setSimulatedDateTime,
      resetCounters,
      overrides
    }
  ];
};
