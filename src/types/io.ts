/**
 * src/types/io.ts
 * Tipos TypeScript para el sistema de I/O programable del EWCM EO
 */

// Tipos de I/O física
export type IOType =
  | 'digital_output'        // OUT1-OUT19 (Relés)
  | 'digital_input_hv'      // DIH1-DIH14 (Alta tensión)
  | 'digital_input_lv'      // DI1-DI6 (Baja tensión / contacto limpio)
  | 'analog_input_pressure' // PB1-PB3 (Transductores de presión)
  | 'analog_input_temp'     // PB5-PB8 (Sondas de temperatura)
  | 'analog_output';        // AO1-AO2 (Salidas 0-10V / 4-20mA)

// Modelos de hardware disponibles
export type HardwareModel = '8900' | '9100' | '9900';

// Configuración de hardware por modelo
export interface HardwareConfig {
  model: HardwareModel;
  digitalOutputs: number;       // 7, 13, o 19
  digitalInputsHV: number;      // 6, 10, o 14
  digitalInputsLV: number;      // 0, 4, o 6
  analogInputsPressure: number; // 2 o 3
  analogInputsTemp: number;     // 4
  analogOutputs: number;        // 2
}

// Estado de una I/O individual
export interface IOState {
  id: string;                   // Identificador físico: "OUT1", "DIH2", "PB1", "AO1"
  type: IOType;                 // Tipo de I/O
  physicalIndex: number;        // Índice físico (1-19, 1-14, etc.)
  functionCode: number;         // Valor del parámetro de configuración (ej: 19 = Compresor 1)
  isInverted: boolean;          // true si functionCode < 0 (polaridad inversa / NC)
  label: string;                // Nombre resuelto de io_mapping.json
  description: string;          // Descripción de la función
  value: boolean | number;      // Estado actual: boolean para digitales, number para analógicas
  isEnabled: boolean;           // false si functionCode === 0 (no configurada)
  paramId: string;              // ID del parámetro de configuración (ej: "584-H201")
}

// Estado completo de todas las I/O del sistema
export interface IOSystemState {
  model: HardwareModel;
  digitalOutputs: IOState[];      // Estado de relés OUT1-OUT19
  digitalInputsHV: IOState[];     // Entradas digitales alta tensión DIH1-DIH14
  digitalInputsLV: IOState[];     // Entradas digitales baja tensión DI1-DI6
  analogInputsPressure: IOState[]; // Entradas analógicas de presión PB1-PB3
  analogInputsTemp: IOState[];     // Entradas analógicas de temperatura PB5-PB8
  analogOutputs: IOState[];        // Salidas analógicas AO1-AO2
}

// Mapeo de funciones críticas para el controlador
export interface FunctionCodes {
  // Salidas digitales (códigos positivos, negativos = NC)
  DISABLED: 0;

  // Alarmas y seguridad
  ALARM_CUMULATIVE: 9;
  SAFETY_RELAY: 8;
  BLOCK_ALARM: 93;

  // Ventiladores digitales (10-17)
  FAN_DIGITAL_1: 10;
  FAN_DIGITAL_2: 11;
  FAN_DIGITAL_3: 12;
  FAN_DIGITAL_4: 13;
  FAN_DIGITAL_5: 14;
  FAN_DIGITAL_6: 15;
  FAN_DIGITAL_7: 16;
  FAN_DIGITAL_8: 17;
  FAN_INVERTER_ENABLE: 18;

  // Compresores (19-30)
  COMPRESSOR_1: 19;
  COMPRESSOR_2: 20;
  COMPRESSOR_3: 21;
  COMPRESSOR_4: 22;
  COMPRESSOR_5: 23;
  COMPRESSOR_6: 24;
  COMPRESSOR_7: 25;
  COMPRESSOR_8: 26;
  COMPRESSOR_9: 27;
  COMPRESSOR_10: 28;
  COMPRESSOR_11: 29;
  COMPRESSOR_12: 30;

  // Habilitación inverter
  COMPRESSOR_INVERTER_C1: 31;
  COMPRESSOR_INVERTER_C2: 32;
}

// Códigos de función para entradas digitales
export interface DigitalInputFunctionCodes {
  DISABLED: 0;
  GENERIC_ALARM: 1;

  // Presostatos diferenciales (16-27)
  DIFF_PRESSURE_COMP_1: 16;

  // Alta presión por compresor (28-39)
  HP_COMPRESSOR_1: 28;

  // Baja presión por compresor (40-51)
  LP_COMPRESSOR_1: 40;

  // Térmicas compresor (52-63)
  THERMAL_COMPRESSOR_1: 52;
  THERMAL_COMPRESSOR_2: 53;
  THERMAL_COMPRESSOR_3: 54;

  // Térmicas ventilador (70-77)
  THERMAL_FAN_1: 70;
  THERMAL_FAN_2: 71;
  THERMAL_FAN_3: 72;

  // Bloqueos compresor (79-90)
  BLOCK_COMPRESSOR_1: 79;
  BLOCK_COMPRESSOR_2: 80;
  BLOCK_COMPRESSOR_3: 81;

  // Stand-by
  STANDBY: 97;
}

// Códigos de función para entradas analógicas de presión
export interface AnalogPressureFunctionCodes {
  DISABLED: 0;
  SUCTION_PRESSURE_C1: 1;   // Presión aspiración circuito 1
  SUCTION_PRESSURE_C2: 2;   // Presión aspiración circuito 2
  DISCHARGE_PRESSURE: 3;     // Presión impulsión
}

// Códigos de función para entradas analógicas de temperatura
export interface AnalogTempFunctionCodes {
  DISABLED: 0;
  SUCTION_TEMP_C1: 1;       // Temperatura aspiración C1
  SUCTION_TEMP_C2: 2;       // Temperatura aspiración C2
  DISCHARGE_TEMP: 3;         // Temperatura impulsión
  AMBIENT_INDOOR: 4;         // Temperatura ambiente interior
  AMBIENT_OUTDOOR: 5;        // Temperatura ambiente exterior
  SUBCOOLING: 6;             // Subenfriamiento
  WATER_RECOVERY: 7;         // Agua recuperación
  GENERIC_REGULATOR: 8;      // Regulador genérico
}

// Códigos de función para salidas analógicas
export interface AnalogOutputFunctionCodes {
  DISABLED: 0;
  FAN_INVERTER: 1;           // Encendido inverter ventilador
  COMPRESSOR_INVERTER_C1: 2; // Encendido inverter compresor C1
  COMPRESSOR_INVERTER_C2: 3; // Encendido inverter compresor C2
  CONFIGURABLE_REG: 4;       // Regulador configurable
}

// Mapeo de función a código de alarma
export interface FunctionAlarmMapping {
  functionCode: number;
  alarmCode: number;
  alarmIndex?: number;
}

// Configuraciones de hardware por modelo
export const HARDWARE_CONFIGS: Record<HardwareModel, HardwareConfig> = {
  '8900': {
    model: '8900',
    digitalOutputs: 7,
    digitalInputsHV: 6,
    digitalInputsLV: 0,
    analogInputsPressure: 2,
    analogInputsTemp: 4,
    analogOutputs: 2
  },
  '9100': {
    model: '9100',
    digitalOutputs: 13,
    digitalInputsHV: 10,
    digitalInputsLV: 4,
    analogInputsPressure: 2,
    analogInputsTemp: 4,
    analogOutputs: 2
  },
  '9900': {
    model: '9900',
    digitalOutputs: 19,
    digitalInputsHV: 14,
    digitalInputsLV: 6,
    analogInputsPressure: 3,
    analogInputsTemp: 4,
    analogOutputs: 2
  }
};

// Configuración de parámetros de I/O
interface IOParamCategoryConfig {
  paramPrefix: string;
  startParamNum: number;
  physicalPrefix: string;
  maxCount: number;
  physicalOffset?: number;
}

// Mapeo de parámetros a I/O físicas
export const IO_PARAM_CONFIG: Record<string, IOParamCategoryConfig> = {
  digitalOutputs: {
    paramPrefix: 'H2',
    startParamNum: 584,
    physicalPrefix: 'OUT',
    maxCount: 19
  },
  digitalInputsHV: {
    paramPrefix: 'H1',
    startParamNum: 603,
    physicalPrefix: 'DIH',
    maxCount: 14
  },
  digitalInputsLV: {
    paramPrefix: 'H3',
    startParamNum: 617,
    physicalPrefix: 'DI',
    maxCount: 6
  },
  analogInputsPressure: {
    paramPrefix: 'H4',
    startParamNum: 623,
    physicalPrefix: 'PB',
    maxCount: 3,
    physicalOffset: 0  // PB1, PB2, PB3
  },
  analogInputsTemp: {
    paramPrefix: 'H4',
    startParamNum: 627,
    physicalPrefix: 'PB',
    maxCount: 4,
    physicalOffset: 4  // PB5, PB6, PB7, PB8
  },
  analogOutputs: {
    paramPrefix: 'H5',
    startParamNum: 631,
    physicalPrefix: 'AO',
    maxCount: 2
  }
};

// Función helper para generar ID de parámetro
export function getParamId(category: keyof typeof IO_PARAM_CONFIG, index: number): string {
  const config = IO_PARAM_CONFIG[category];
  const paramNum = config.startParamNum + index;
  const physicalIndex = (config.physicalOffset ?? 0) + index + 1;
  const suffix = String(physicalIndex).padStart(2, '0');
  return `${paramNum}-${config.paramPrefix}${suffix}`;
}

// Función helper para generar ID físico
export function getPhysicalId(category: keyof typeof IO_PARAM_CONFIG, index: number): string {
  const config = IO_PARAM_CONFIG[category];
  const physicalIndex = (config.physicalOffset ?? 0) + index + 1;
  return `${config.physicalPrefix}${physicalIndex}`;
}

// Rangos de valores analógicos por tipo
export const ANALOG_RANGES = {
  pressure: {
    min: -1,
    max: 30,
    unit: 'Bar',
    step: 0.1,
    defaultValue: 2.0
  },
  temperature: {
    min: -50,
    max: 120,
    unit: '°C',
    step: 0.5,
    defaultValue: 25.0
  },
  output: {
    min: 0,
    max: 100,
    unit: '%',
    step: 1,
    defaultValue: 0
  }
};
