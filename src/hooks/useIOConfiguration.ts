/**
 * src/hooks/useIOConfiguration.ts
 * Hook para gestionar la configuración dinámica de I/O del EWCM EO
 * Resuelve nombres de funciones desde io_mapping.json basándose en los parámetros actuales
 */

import { useMemo, useCallback } from 'react';
import ioMapping from '../data/io_mapping.json';
import {
  IOType,
  IOState,
  IOSystemState,
  HardwareModel,
  HardwareConfig,
  HARDWARE_CONFIGS,
  ANALOG_RANGES
} from '../types/io';

// Mapeo de categorías de I/O a sus configuraciones de parámetros
const IO_CATEGORIES = {
  digitalOutputs: {
    startParam: 584,
    paramPrefix: 'H2',
    physicalPrefix: 'OUT',
    maxCount: 19,
    ioType: 'digital_output' as IOType,
    mappingKey: 'digital_outputs' as keyof typeof ioMapping
  },
  digitalInputsHV: {
    startParam: 603,
    paramPrefix: 'H1',
    physicalPrefix: 'DIH',
    maxCount: 14,
    ioType: 'digital_input_hv' as IOType,
    mappingKey: 'digital_inputs' as keyof typeof ioMapping
  },
  digitalInputsLV: {
    startParam: 617,
    paramPrefix: 'H3',
    physicalPrefix: 'DI',
    maxCount: 6,
    ioType: 'digital_input_lv' as IOType,
    mappingKey: 'digital_inputs' as keyof typeof ioMapping
  },
  analogInputsPressure: {
    startParam: 623,
    paramPrefix: 'H4',
    physicalPrefix: 'PB',
    maxCount: 3,
    physicalOffset: 0,
    ioType: 'analog_input_pressure' as IOType,
    mappingKey: 'analog_inputs_pressure' as keyof typeof ioMapping
  },
  analogInputsTemp: {
    startParam: 627,
    paramPrefix: 'H4',
    physicalPrefix: 'PB',
    maxCount: 4,
    physicalOffset: 4, // PB5-PB8
    ioType: 'analog_input_temp' as IOType,
    mappingKey: 'analog_inputs_temp' as keyof typeof ioMapping
  },
  analogOutputs: {
    startParam: 631,
    paramPrefix: 'H5',
    physicalPrefix: 'AO',
    maxCount: 2,
    ioType: 'analog_output' as IOType,
    mappingKey: 'analog_outputs' as keyof typeof ioMapping
  }
};

// Tipo del resultado del hook
export interface IOConfigurationResult {
  // Estado completo de todas las I/O
  ioState: IOSystemState;

  // Búsqueda por función
  findIOByFunction: (functionCode: number, type?: IOType) => IOState | null;
  findAllIOsByFunction: (functionCode: number) => IOState[];

  // Estado de entradas
  getDigitalInputState: (functionCode: number, digitalInputs: Record<string, boolean>) => boolean;
  getAnalogInputValue: (functionCode: number, analogInputValues: Record<string, number>) => number | null;

  // Helpers específicos para funciones críticas
  getSuctionPressureInput: () => IOState | null;
  getDischargePressureInput: () => IOState | null;
  getSuctionTempInput: () => IOState | null;
  getDischargeTempInput: () => IOState | null;
  getCompressorOutput: (index: number) => IOState | null;
  getFanOutput: (index: number) => IOState | null;
  getBlockInput: (compressorIndex: number) => IOState | null;
  getThermalCompressorInput: (index: number) => IOState | null;
  getThermalFanInput: (index: number) => IOState | null;
  getInverterFanOutput: () => IOState | null;
  getInverterCompressorOutput: (circuit: 1 | 2) => IOState | null;
  getAlarmOutput: () => IOState | null;

  // Configuración de hardware
  hardwareConfig: HardwareConfig;
}

/**
 * Hook principal para configuración de I/O
 */
export const useIOConfiguration = (
  parameters: Record<string, number>,
  model: HardwareModel = '9900'
): IOConfigurationResult => {

  // Obtener configuración de hardware para el modelo
  const hardwareConfig = useMemo(() =>
    HARDWARE_CONFIGS[model] || HARDWARE_CONFIGS['9900'],
    [model]
  );

  /**
   * Resolver etiqueta de una función desde io_mapping.json
   */
  const resolveLabel = useCallback((
    functionCode: number,
    mappingKey: keyof typeof ioMapping
  ): { label: string; description: string } => {
    if (functionCode === 0) {
      return { label: 'No configurada', description: 'Entrada/salida sin asignar' };
    }

    const absCode = Math.abs(functionCode);
    const mapping = ioMapping[mappingKey] as Record<string, { label: string; description: string }>;

    if (!mapping || typeof mapping !== 'object') {
      return { label: `Función ${absCode}`, description: 'Desconocida' };
    }

    const entry = mapping[String(absCode)];
    if (!entry) {
      return { label: `Función ${absCode}`, description: 'No definida' };
    }

    // Añadir (NC) si polaridad inversa
    const label = functionCode < 0 ? `${entry.label} (NC)` : entry.label;
    return { label, description: entry.description };
  }, []);

  /**
   * Construir lista de estados de I/O para una categoría
   */
  const buildIOStates = useCallback((
    categoryKey: keyof typeof IO_CATEGORIES,
    maxCount: number
  ): IOState[] => {
    const category = IO_CATEGORIES[categoryKey];
    const states: IOState[] = [];

    for (let i = 0; i < Math.min(category.maxCount, maxCount); i++) {
      // Calcular índice físico
      const physicalOffset = (category as { physicalOffset?: number }).physicalOffset ?? 0;
      const physicalIndex = physicalOffset + i + 1;

      // Generar ID del parámetro
      const paramNum = category.startParam + i;
      const suffix = String(physicalIndex).padStart(2, '0');
      const paramId = `${paramNum}-${category.paramPrefix}${suffix}`;

      // Leer valor del parámetro
      const functionCode = parameters[paramId] ?? 0;

      // Resolver etiqueta
      const resolved = resolveLabel(functionCode, category.mappingKey);

      // Determinar valor inicial según tipo
      let initialValue: boolean | number;
      if (category.ioType === 'analog_input_pressure') {
        initialValue = ANALOG_RANGES.pressure.defaultValue;
      } else if (category.ioType === 'analog_input_temp') {
        initialValue = ANALOG_RANGES.temperature.defaultValue;
      } else if (category.ioType === 'analog_output') {
        initialValue = ANALOG_RANGES.output.defaultValue;
      } else {
        initialValue = false;
      }

      states.push({
        id: `${category.physicalPrefix}${physicalIndex}`,
        type: category.ioType,
        physicalIndex,
        functionCode,
        isInverted: functionCode < 0,
        label: resolved.label,
        description: resolved.description,
        value: initialValue,
        isEnabled: functionCode !== 0,
        paramId
      });
    }

    return states;
  }, [parameters, resolveLabel]);

  /**
   * Estado completo de I/O memoizado
   */
  const ioState = useMemo((): IOSystemState => ({
    model: hardwareConfig.model,
    digitalOutputs: buildIOStates('digitalOutputs', hardwareConfig.digitalOutputs),
    digitalInputsHV: buildIOStates('digitalInputsHV', hardwareConfig.digitalInputsHV),
    digitalInputsLV: buildIOStates('digitalInputsLV', hardwareConfig.digitalInputsLV),
    analogInputsPressure: buildIOStates('analogInputsPressure', hardwareConfig.analogInputsPressure),
    analogInputsTemp: buildIOStates('analogInputsTemp', hardwareConfig.analogInputsTemp),
    analogOutputs: buildIOStates('analogOutputs', hardwareConfig.analogOutputs)
  }), [hardwareConfig, buildIOStates]);

  /**
   * Buscar I/O por código de función
   */
  const findIOByFunction = useCallback((
    functionCode: number,
    type?: IOType
  ): IOState | null => {
    const absCode = Math.abs(functionCode);

    const allIO = [
      ...ioState.digitalOutputs,
      ...ioState.digitalInputsHV,
      ...ioState.digitalInputsLV,
      ...ioState.analogInputsPressure,
      ...ioState.analogInputsTemp,
      ...ioState.analogOutputs
    ];

    return allIO.find(io =>
      Math.abs(io.functionCode) === absCode &&
      (!type || io.type === type)
    ) || null;
  }, [ioState]);

  /**
   * Buscar todas las I/O con una función específica
   */
  const findAllIOsByFunction = useCallback((functionCode: number): IOState[] => {
    const absCode = Math.abs(functionCode);

    const allIO = [
      ...ioState.digitalOutputs,
      ...ioState.digitalInputsHV,
      ...ioState.digitalInputsLV,
      ...ioState.analogInputsPressure,
      ...ioState.analogInputsTemp,
      ...ioState.analogOutputs
    ];

    return allIO.filter(io => Math.abs(io.functionCode) === absCode);
  }, [ioState]);

  /**
   * Obtener estado de una entrada digital por función
   */
  const getDigitalInputState = useCallback((
    functionCode: number,
    digitalInputs: Record<string, boolean>
  ): boolean => {
    const io = findIOByFunction(functionCode);
    if (!io) return false;

    const rawState = digitalInputs[io.id] ?? false;
    // Si es NC (normalmente cerrado), invertir la lógica
    return io.isInverted ? !rawState : rawState;
  }, [findIOByFunction]);

  /**
   * Obtener valor de una entrada analógica por función
   */
  const getAnalogInputValue = useCallback((
    functionCode: number,
    analogInputValues: Record<string, number>
  ): number | null => {
    const io = findIOByFunction(functionCode);
    if (!io) return null;
    return analogInputValues[io.id] ?? null;
  }, [findIOByFunction]);

  // === HELPERS ESPECÍFICOS ===

  // Función 1 = Presión aspiración C1
  const getSuctionPressureInput = useCallback(() =>
    findIOByFunction(1, 'analog_input_pressure'),
    [findIOByFunction]
  );

  // Función 3 = Presión impulsión
  const getDischargePressureInput = useCallback(() =>
    findIOByFunction(3, 'analog_input_pressure'),
    [findIOByFunction]
  );

  // Función 1 en temp = Temperatura aspiración C1
  const getSuctionTempInput = useCallback(() =>
    findIOByFunction(1, 'analog_input_temp'),
    [findIOByFunction]
  );

  // Función 3 en temp = Temperatura impulsión
  const getDischargeTempInput = useCallback(() =>
    findIOByFunction(3, 'analog_input_temp'),
    [findIOByFunction]
  );

  // Funciones 19-30 = Compresores 1-12
  const getCompressorOutput = useCallback((index: number) => {
    if (index < 1 || index > 12) return null;
    return findIOByFunction(18 + index, 'digital_output');
  }, [findIOByFunction]);

  // Funciones 10-17 = Ventiladores digitales 1-8
  const getFanOutput = useCallback((index: number) => {
    if (index < 1 || index > 8) return null;
    return findIOByFunction(9 + index, 'digital_output');
  }, [findIOByFunction]);

  // Funciones 79-90 = Bloqueo compresores 1-12
  const getBlockInput = useCallback((compressorIndex: number) => {
    if (compressorIndex < 1 || compressorIndex > 12) return null;
    return findIOByFunction(78 + compressorIndex);
  }, [findIOByFunction]);

  // Funciones 52-63 = Térmica compresores 1-12
  const getThermalCompressorInput = useCallback((index: number) => {
    if (index < 1 || index > 12) return null;
    return findIOByFunction(51 + index);
  }, [findIOByFunction]);

  // Funciones 70-77 = Térmica ventiladores 1-8
  const getThermalFanInput = useCallback((index: number) => {
    if (index < 1 || index > 8) return null;
    return findIOByFunction(69 + index);
  }, [findIOByFunction]);

  // Función 1 en AO = Inverter ventilador
  const getInverterFanOutput = useCallback(() =>
    findIOByFunction(1, 'analog_output'),
    [findIOByFunction]
  );

  // Función 2/3 en AO = Inverter compresor C1/C2
  const getInverterCompressorOutput = useCallback((circuit: 1 | 2) =>
    findIOByFunction(1 + circuit, 'analog_output'),
    [findIOByFunction]
  );

  // Función 9 = Alarma acumulativa
  const getAlarmOutput = useCallback(() =>
    findIOByFunction(9, 'digital_output'),
    [findIOByFunction]
  );

  return {
    ioState,
    findIOByFunction,
    findAllIOsByFunction,
    getDigitalInputState,
    getAnalogInputValue,
    getSuctionPressureInput,
    getDischargePressureInput,
    getSuctionTempInput,
    getDischargeTempInput,
    getCompressorOutput,
    getFanOutput,
    getBlockInput,
    getThermalCompressorInput,
    getThermalFanInput,
    getInverterFanOutput,
    getInverterCompressorOutput,
    getAlarmOutput,
    hardwareConfig
  };
};

export default useIOConfiguration;
