/**
 * src/hooks/useAlarmSystem.ts
 * Sistema de gestión de alarmas para el simulador EWCM EO.
 * Maneja detección, activación, historial y reset de alarmas.
 */

import { useState, useCallback, useRef } from 'react';
import alarmsDb from '../data/alarms.json';

// Tipos de alarma desde la base de datos
export interface AlarmDefinition {
  code: number;
  label: string;
  description: string;
  category: string;
  circuit: string;
  isFatal: boolean;
  requiresManualReset: boolean;
  resetType: 'auto' | 'semi_auto' | 'manual';
  paramRef?: string;
  indexRange?: string;
  sourcePage: number;
}

// Alarma activa con timestamp e índice opcional
export interface ActiveAlarm {
  code: number;
  label: string;
  description: string;
  isFatal: boolean;
  requiresManualReset: boolean;
  activatedAt: number;      // timestamp
  acknowledged: boolean;    // si el usuario la ha visto/reconocido
  index?: number;           // para alarmas indexadas (compresor 1, 2, etc.)
}

// Evento de historial
export interface AlarmHistoryEvent {
  code: number;
  label: string;
  description: string;
  activatedAt: number;
  clearedAt?: number;
  index?: number;
}

// Estado del sistema de alarmas
export interface AlarmSystemState {
  activeAlarms: ActiveAlarm[];
  history: AlarmHistoryEvent[];
  hasUnacknowledged: boolean;  // hay alarmas sin reconocer
  hasFatalAlarm: boolean;      // hay alarma fatal activa
}

// Controles del sistema
export interface AlarmSystemControls {
  triggerAlarm: (code: number, index?: number) => void;
  clearAlarm: (code: number, index?: number) => void;
  acknowledgeAlarm: (code: number, index?: number) => void;
  acknowledgeAll: () => void;
  resetManualAlarms: () => void;
  clearHistory: () => void;
  getAlarmDefinition: (code: number) => AlarmDefinition | undefined;
}

const MAX_HISTORY_SIZE = 50;

export const useAlarmSystem = (): [AlarmSystemState, AlarmSystemControls] => {
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [history, setHistory] = useState<AlarmHistoryEvent[]>([]);

  // Referencia para evitar duplicados en el mismo tick
  const lastTriggerRef = useRef<Record<string, number>>({});

  // Helper para obtener definición de alarma
  const getAlarmDefinition = useCallback((code: number): AlarmDefinition | undefined => {
    return (alarmsDb as AlarmDefinition[]).find(a => a.code === code);
  }, []);

  // Activar una alarma
  const triggerAlarm = useCallback((code: number, index?: number) => {
    const alarmKey = `${code}-${index ?? 'none'}`;
    const now = Date.now();

    // Evitar activar la misma alarma múltiples veces en 1 segundo
    if (lastTriggerRef.current[alarmKey] && now - lastTriggerRef.current[alarmKey] < 1000) {
      return;
    }
    lastTriggerRef.current[alarmKey] = now;

    const definition = getAlarmDefinition(code);
    if (!definition) {
      console.warn(`Alarma con código ${code} no encontrada`);
      return;
    }

    setActiveAlarms(prev => {
      // Verificar si ya existe
      const exists = prev.some(a => a.code === code && a.index === index);
      if (exists) return prev;

      const newAlarm: ActiveAlarm = {
        code: definition.code,
        label: definition.label,
        description: definition.description,
        isFatal: definition.isFatal,
        requiresManualReset: definition.requiresManualReset,
        activatedAt: now,
        acknowledged: false,
        index
      };

      console.log(`🚨 Alarma activada: ${definition.label}${index ? ` (${index})` : ''}`);
      return [...prev, newAlarm];
    });

    // Añadir al historial
    setHistory(prev => {
      const event: AlarmHistoryEvent = {
        code: definition.code,
        label: definition.label,
        description: definition.description,
        activatedAt: now,
        index
      };
      const newHistory = [event, ...prev].slice(0, MAX_HISTORY_SIZE);
      return newHistory;
    });
  }, [getAlarmDefinition]);

  // Limpiar una alarma (cuando la condición desaparece)
  const clearAlarm = useCallback((code: number, index?: number) => {
    const definition = getAlarmDefinition(code);
    if (!definition) return;

    // Las alarmas manuales no se limpian automáticamente
    if (definition.requiresManualReset) {
      return;
    }

    setActiveAlarms(prev => {
      const alarm = prev.find(a => a.code === code && a.index === index);
      if (alarm) {
        console.log(`✅ Alarma limpiada: ${definition.label}${index ? ` (${index})` : ''}`);

        // Actualizar historial con tiempo de limpieza
        setHistory(h => h.map(event => {
          if (event.code === code && event.index === index && !event.clearedAt) {
            return { ...event, clearedAt: Date.now() };
          }
          return event;
        }));
      }
      return prev.filter(a => !(a.code === code && a.index === index));
    });
  }, [getAlarmDefinition]);

  // Reconocer una alarma (el usuario la ha visto)
  const acknowledgeAlarm = useCallback((code: number, index?: number) => {
    setActiveAlarms(prev =>
      prev.map(a => {
        if (a.code === code && a.index === index) {
          return { ...a, acknowledged: true };
        }
        return a;
      })
    );
  }, []);

  // Reconocer todas las alarmas
  const acknowledgeAll = useCallback(() => {
    setActiveAlarms(prev => prev.map(a => ({ ...a, acknowledged: true })));
  }, []);

  // Reset de alarmas manuales (desde menú servicio)
  const resetManualAlarms = useCallback(() => {
    setActiveAlarms(prev => {
      const toReset = prev.filter(a => a.requiresManualReset);
      toReset.forEach(alarm => {
        console.log(`🔄 Reset manual: ${alarm.label}`);
        setHistory(h => h.map(event => {
          if (event.code === alarm.code && event.index === alarm.index && !event.clearedAt) {
            return { ...event, clearedAt: Date.now() };
          }
          return event;
        }));
      });
      return prev.filter(a => !a.requiresManualReset);
    });
  }, []);

  // Limpiar historial
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Calcular estados derivados
  const hasUnacknowledged = activeAlarms.some(a => !a.acknowledged);
  const hasFatalAlarm = activeAlarms.some(a => a.isFatal);

  const state: AlarmSystemState = {
    activeAlarms,
    history,
    hasUnacknowledged,
    hasFatalAlarm
  };

  const controls: AlarmSystemControls = {
    triggerAlarm,
    clearAlarm,
    acknowledgeAlarm,
    acknowledgeAll,
    resetManualAlarms,
    clearHistory,
    getAlarmDefinition
  };

  return [state, controls];
};
