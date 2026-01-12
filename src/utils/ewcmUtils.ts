/**
 * src/utils/ewcmUtils.ts
 * * Funciones de utilidad pura para la lógica de negocio del EWCM EO.
 * Se encarga de traducir códigos numéricos a textos legibles y realizar
 * cálculos de simulación física simplificada.
 * * @module EwcmUtils
 */

import ioMapping from '../data/io_mapping.json';
import alarms from '../data/alarms.json';
import { UnitType } from '../types/ewcm';

// ---- GESTIÓN DE RECURSOS I/O ----

/**
 * Obtiene la etiqueta legible de una función de salida digital (Relé).
 * Traduce el código numérico de configuración (ej: 19) a texto (ej: "Compresor 1").
 * Maneja la lógica de polaridad inversa indicada por valores negativos.
 * * @param configValue - El valor del parámetro de configuración (ej: valor de 585-H202).
 * @returns La etiqueta legible (ej: "Compresor 1 (NC)").
 * * @example
 * getRelayLabel(19) // Retorna "Compresor 1"
 * getRelayLabel(-9) // Retorna "Alarma Acumulativa (NC)"
 */
interface IoEntry {
  label: string;
  description: string;
}

export const getRelayLabel = (configValue: number): string => {
  const absValue = Math.abs(configValue);
  const mapping = ioMapping.digital_outputs as Record<string, IoEntry>;
  const entry = mapping[String(absValue)];

  if (!entry) return `Función desconocida (${absValue})`;

  // Si es negativo, el manual indica polaridad inversa (NC - Normalmente Cerrado)
  return configValue < 0 ? `${entry.label} (NC)` : entry.label;
};

/**
 * Obtiene la etiqueta legible de una entrada digital.
 * * @param configValue - El valor del parámetro de configuración.
 * @returns La etiqueta de la función asignada a esa entrada.
 */
export const getDigitalInputLabel = (configValue: number): string => {
  const absValue = Math.abs(configValue);
  const mapping = ioMapping.digital_inputs as Record<string, IoEntry>;
  const entry = mapping[String(absValue)];
  return entry ? entry.label : `Entrada desconocida (${absValue})`;
};

// ---- GESTIÓN DE UNIDADES ----

/**
 * Calcula la etiqueta de unidad correcta basándose en la configuración del sistema.
 * El EWCM cambia sus unidades (Bar/PSI, C/F) dinámicamente según parámetros globales.
 * * @param unitType - El tipo de unidad definido en `parameters.json` (ej: 'dynamic_pressure').
 * @param umcpValue - Valor actual del parámetro 547-UMCP (Configuración Unidad Aspiración).
 * @param umfnValue - Valor actual del parámetro 548-UMFn (Configuración Unidad Impulsión).
 * @returns String con la unidad (ej: "Bar", "PSI", "°C", "%").
 * * @example
 * // Si 547-UMCP está en 1 (Bar)
 * getUnitLabel('dynamic_pressure', 1, 1) // Retorna "Bar"
 * // Si 547-UMCP está en 3 (PSI)
 * getUnitLabel('dynamic_pressure', 3, 1) // Retorna "PSI"
 */
export const getUnitLabel = (
  unitType: UnitType | undefined, 
  umcpValue: number = 1, 
  umfnValue: number = 1
): string => {
  if (!unitType || unitType === 'none') return '';
  if (unitType === 'seconds') return 's';
  if (unitType === 'minutes') return 'min';
  if (unitType === 'hours') return 'h';
  if (unitType === 'percent') return '%';

  if (unitType === 'dynamic_pressure') {
    // Según Pág 110 del manual:
    // 547-UMCP: 1=Bar, 3=PSI 
    // Usamos UMCP como referencia principal por defecto para presión
    if (umcpValue === 1) return 'Bar';
    if (umcpValue === 3) return 'PSI';
    return 'Bar'; // Fallback por defecto
  }
  
  if (unitType === 'dynamic_temp') {
    // Según Pág 110 del manual:
    // 547-UMCP: 0=°C, 2=°F
    if (umcpValue === 0) return '°C';
    if (umcpValue === 2) return '°F';
    return '°C'; // Fallback por defecto
  }

  return '';
};

// ---- SIMULACIÓN FÍSICA ----

/**
 * Convierte Presión (Bar) a Temperatura de Saturación (°C) para efectos de simulación.
 * Utiliza una aproximación lineal simplificada basada en el tipo de refrigerante.
 * Útil para mostrar valores coherentes en el display cuando el usuario cambia la presión.
 * * @param pressureBar - Presión absoluta en bar.
 * @param refrigerantId - ID del refrigerante seleccionado (parámetro 641-FtyP).
 * @returns Temperatura aproximada en °C.
 * * @example
 * // Para R404A (ID 3), 4 Bar
 * pressureToTempSimulation(4, 3) // Retorna aprox -10°C
 */
export const pressureToTempSimulation = (pressureBar: number, refrigerantId: number): number => {
  // Coeficientes simplificados. 
  // 3 = R404A (Estándar en refrigeración comercial)
  // 9 = CO2 (Alta presión)
  // 1 = R134a (Media temperatura)
  
  let temp = 0;

  switch (refrigerantId) {
    case 9: // CO2 (R744) - Curva muy empinada
      temp = (pressureBar * 2) - 50; 
      break;
    case 1: // R134a
      temp = (pressureBar * 8) - 30;
      break;
    case 3: // R404A (Estándar)
    default:
      // Aprox: 1 bar ~= -40C, 5 bar ~= 0C
      temp = (pressureBar * 10) - 50; 
      break;
  }

  return parseFloat(temp.toFixed(1));
};

/**
 * Verifica si un código de alarma es crítico (Fatal).
 * Las alarmas fatales suelen detener la máquina o activar relés de seguridad.
 * * @param alarmCode - El código numérico de la alarma.
 * @returns true si la alarma es fatal, false si es solo informativa.
 */
export const isFatalAlarm = (alarmCode: number): boolean => {
  const alarm = alarms.find(a => a.code === alarmCode);
  return alarm ? alarm.isFatal : false;
};