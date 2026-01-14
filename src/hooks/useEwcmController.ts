/**
 * src/hooks/useEwcmController.ts
 * Hook principal que gestiona la lógica de estado del simulador EWCM EO.
 * Maneja la navegación por menús, edición de parámetros y eventos de teclado.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import menuData from '../data/menus.json';
import paramsDb from '../data/parameters.json';
import { MenuStructure, EwcmParameter } from '../types/ewcm';

// Clave para localStorage
const STORAGE_KEY = 'ewcm_eo_parameters_v2';

// Función para cargar parámetros desde localStorage
const loadParametersFromStorage = (): Record<string, number> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validar que es un objeto con las claves esperadas
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error loading parameters from localStorage:', e);
  }
  return null;
};

// Función para guardar parámetros en localStorage
const saveParametersToStorage = (params: Record<string, number>): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch (e) {
    console.warn('Error saving parameters to localStorage:', e);
  }
};

// Definición del estado del display
interface DisplayState {
  currentMenuId: string;
  cursorIndex: number;
  editMode: boolean;
  tempValue: number | null; // Valor temporal mientras se edita
  navigationStack: string[]; // Historial para el botón 'ESC'
  // Control de acceso
  passwordMode: boolean;       // Estamos introduciendo password
  passwordBuffer: string;      // Dígitos introducidos
  pendingMenuId: string | null; // Menú que intentamos acceder
  accessLevel: 'user' | 'installer' | 'service'; // Nivel actual de acceso
  // Edición de fecha/hora
  dateTimeEditMode: boolean;   // Estamos editando fecha/hora
  dateTimeTemp: number[];      // [día, mes, año, hora, minuto]
  dateTimeFieldIndex: number;  // Campo actual (0-4)
  // Timeout de menú
  lastActivityTime: number;    // Timestamp de última actividad
  // Quick Start State
  quickStartEnabled: boolean;
  quickStartManual: boolean;
}

// Callback para ejecutar acciones del menú
export interface ActionCallbacks {
  onToggleSystem?: () => void;
  onResetAlarms?: () => void;
  onAcknowledgeAlarm?: (code: number, index?: number) => void;
  onFactoryReset?: () => void;
  onSetDateTime?: (date: Date) => void;
  onResetCounters?: () => void;
}

// Interfaz de retorno del hook
export interface EwcmController {
  // Estado
  display: DisplayState;
  parameters: Record<string, number>; // Valores actuales de parámetros
  currentMenuNode: any;
  currentMenuItems: any[];

  // Acciones
  handleKeyPress: (key: string, type?: 'short' | 'long') => void;
  resetSimulator: () => void;
  setActionCallbacks: (callbacks: ActionCallbacks) => void;
  importParameters: (params: Record<string, number>) => void;
}

// Helper para obtener datos de un parámetro
const getParamData = (paramId: string): EwcmParameter | undefined => {
  return (paramsDb as EwcmParameter[]).find((p) => p.id === paramId);
};

// Helper para redondear a decimales específicos (evita errores de punto flotante)
const roundToStep = (value: number, step: number): number => {
  const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const useEwcmController = (): EwcmController => {
  // 1. Estado de los parámetros (Base de datos viva)
  const [parameters, setParameters] = useState<Record<string, number>>(() => {
    // Primero crear valores por defecto
    const defaults: Record<string, number> = {};
    (paramsDb as EwcmParameter[]).forEach((p) => {
      defaults[p.id] = p.defaultValue;
    });

    // Intentar cargar desde localStorage (solo en cliente)
    const stored = loadParametersFromStorage();
    if (stored) {
      // Mezclar: usar valores guardados donde existan, defaults para nuevos parámetros
      return { ...defaults, ...stored };
    }
    return defaults;
  });

  // Persistir parámetros en localStorage cada vez que cambien
  useEffect(() => {
    saveParametersToStorage(parameters);
  }, [parameters]);

  // Función para volver a HOME (definida antes del useEffect de timeout)
  const goToHome = useCallback(() => {
    setDisplay(prev => ({
      ...prev,
      currentMenuId: 'root_home',
      cursorIndex: 0,
      editMode: false,
      tempValue: null,
      navigationStack: [],
      passwordMode: false,
      passwordBuffer: '',
      pendingMenuId: null,
      dateTimeEditMode: false,
      dateTimeTemp: [],
      dateTimeFieldIndex: 0,
      lastActivityTime: Date.now(),
    }));
  }, []);

  // 2. Estado de la Pantalla y Navegación
  const [display, setDisplay] = useState<DisplayState>({
    currentMenuId: 'root_home', // Pantalla inicial (Home)
    cursorIndex: 0,
    editMode: false,
    tempValue: null,
    navigationStack: [],
    passwordMode: false,
    passwordBuffer: '',
    pendingMenuId: null,
    accessLevel: 'user',
    dateTimeEditMode: false,
    dateTimeTemp: [],
    dateTimeFieldIndex: 0,
    lastActivityTime: Date.now(),
    quickStartEnabled: true,
    quickStartManual: false,
  });

  // Timeout de menú: volver a HOME tras inactividad (parámetro 542-toUt)
  useEffect(() => {
    // Solo activar si no estamos en HOME
    if (display.currentMenuId === 'root_home') return;

    const timeoutSeconds = parameters['542-toUt'] ?? 300; // Default 5 minutos

    const checkTimeout = () => {
      const elapsed = (Date.now() - display.lastActivityTime) / 1000;
      if (elapsed >= timeoutSeconds) {
        console.log(`Menu timeout (${timeoutSeconds}s) - volviendo a HOME`);
        goToHome();
      }
    };

    // Verificar cada segundo
    const timer = setInterval(checkTimeout, 1000);
    return () => clearInterval(timer);
  }, [display.currentMenuId, display.lastActivityTime, parameters, goToHome]);

  // 3. Callbacks para acciones externas (alarmas, sistema, etc.)
  const actionCallbacksRef = useRef<ActionCallbacks>({});

  const setActionCallbacks = useCallback((callbacks: ActionCallbacks) => {
    actionCallbacksRef.current = { ...actionCallbacksRef.current, ...callbacks };
  }, []);

  const menus = menuData as MenuStructure;
  const currentNode = menus.nodes[display.currentMenuId];

  // Obtener los items hijos del menú actual (si es carpeta)
  const currentMenuItems = useMemo(() => {
    return currentNode?.children?.map(childId => menus.nodes[childId]) || [];
  }, [currentNode, menus.nodes]);

  // Helper para obtener los límites de un parámetro (soporta minRef/maxRef)
  const getParamLimits = useCallback((param: EwcmParameter): { min: number; max: number } => {
    let min = param.min ?? -Infinity;
    let max = param.max ?? Infinity;

    // Soporte para referencias dinámicas
    if (param.minRef) {
      const refValue = parameters[param.minRef];
      if (refValue !== undefined) min = refValue;
    }
    if (param.maxRef) {
      const refValue = parameters[param.maxRef];
      if (refValue !== undefined) max = refValue;
    }

    return { min, max };
  }, [parameters]);

  // --- LÓGICA DE NAVEGACIÓN ---
  // NOTA: navigateUp/navigateDown se han integrado directamente en handleKeyPress
  // para evitar problemas de closures stale con currentMenuItems

  // Helper para ejecutar acciones del menú
  const executeAction = useCallback((actionId: string, index?: number) => {
    console.log(`Ejecutando acción: ${actionId}${index ? ` (${index})` : ''}`);

    switch (actionId) {
      case 'toggle_system':
        actionCallbacksRef.current.onToggleSystem?.();
        break;
      case 'reset_alarms':
        actionCallbacksRef.current.onResetAlarms?.();
        break;
      case 'factory_reset':
        actionCallbacksRef.current.onFactoryReset?.();
        break;
      case 'toggle_economy':
        // Toggle del modo economy (parámetro 556-ESFn)
        setParameters(prev => ({
          ...prev,
          '556-ESFn': prev['556-ESFn'] === 0 ? 1 : 0
        }));
        break;
      case 'manual_compressor':
      case 'manual_fan':
      case 'force_rotation':
      case 'force_defrost':
      case 'save_to_card':
      case 'load_from_card':
        // TODO: Implementar estas acciones
        console.log(`Acción pendiente: ${actionId}`);
        break;
      default:
        console.warn(`Acción desconocida: ${actionId}`);
    }
  }, []);

  const enterMenu = useCallback(() => {
    // Caso 1: Estamos en HOME, no hace nada con enter corto (necesita pulsación larga o F keys)
    if (display.currentMenuId === 'root_home') return;

    // Caso 2: Estamos en una lista y seleccionamos un ítem
    const selectedItem = currentMenuItems[display.cursorIndex];

    if (selectedItem) {
      // Verificar si requiere password y si ya tenemos acceso
      if (selectedItem.password && selectedItem.requiredAccess) {
        const accessHierarchy = { user: 0, installer: 1, service: 2 };
        const requiredLevel = accessHierarchy[selectedItem.requiredAccess as keyof typeof accessHierarchy] || 0;
        const currentLevel = accessHierarchy[display.accessLevel];

        if (currentLevel < requiredLevel) {
          // Necesitamos password - entrar en modo password
          setDisplay(prev => ({
            ...prev,
            passwordMode: true,
            passwordBuffer: '',
            pendingMenuId: selectedItem.id
          }));
          return;
        }
      }

      if (selectedItem.type === 'folder' || selectedItem.type === 'custom_quick_start') {
        // Entrar en carpeta o menú personalizado
        setDisplay(prev => ({
          ...prev,
          navigationStack: [...prev.navigationStack, prev.currentMenuId],
          currentMenuId: selectedItem.id,
          cursorIndex: 0
        }));
      } else if (selectedItem.type === 'parameter_link') {
        // Entrar a editar parámetro
        const paramId = selectedItem.parameterId!;
        const currentVal = parameters[paramId];
        setDisplay(prev => ({
          ...prev,
          editMode: true,
          tempValue: currentVal
        }));
      } else if (selectedItem.type === 'action' && selectedItem.action) {
        // Ejecutar acción
        executeAction(selectedItem.action, selectedItem.index);
      } else if (selectedItem.type === 'alarm_list') {
        // Navegar a pantalla de alarmas
        const targetId = selectedItem.filter === 'history' ? 'alarm_history' : 'alarm_list';
        setDisplay(prev => ({
          ...prev,
          navigationStack: [...prev.navigationStack, prev.currentMenuId],
          currentMenuId: targetId,
          cursorIndex: 0
        }));
      } else if (selectedItem.type === 'diagnostics_view') {
        // Navegar a pantalla de diagnóstico
        setDisplay(prev => ({
          ...prev,
          navigationStack: [...prev.navigationStack, prev.currentMenuId],
          currentMenuId: selectedItem.id,
          cursorIndex: 0
        }));
      } else if (selectedItem.type === 'datetime_editor' ||
        selectedItem.type === 'schedule_editor' ||
        selectedItem.type === 'hours_display' ||
        selectedItem.type === 'counters_display') {
        // Navegar a pantallas especiales
        setDisplay(prev => ({
          ...prev,
          navigationStack: [...prev.navigationStack, prev.currentMenuId],
          currentMenuId: selectedItem.id,
          cursorIndex: 0
        }));
      }
    }
  }, [display.currentMenuId, display.cursorIndex, currentMenuItems, parameters, executeAction]);

  const exitMenu = useCallback(() => {
    if (display.editMode) {
      // Cancelar edición
      setDisplay(prev => ({ ...prev, editMode: false, tempValue: null }));
    } else if (display.navigationStack.length > 0) {
      // Volver al menú padre
      const newStack = [...display.navigationStack];
      const parentId = newStack.pop();
      setDisplay(prev => ({
        ...prev,
        navigationStack: newStack,
        currentMenuId: parentId || 'root_home',
        cursorIndex: 0
      }));
    } else {
      // Si estamos en la raíz, ir a Home
      setDisplay(prev => ({ ...prev, currentMenuId: 'root_home' }));
    }
  }, [display.editMode, display.navigationStack]);

  const saveValue = useCallback(() => {
    if (display.editMode && display.tempValue !== null) {
      const selectedItem = currentMenuItems[display.cursorIndex];
      if (selectedItem?.parameterId) {
        // Validar una última vez antes de guardar
        const param = getParamData(selectedItem.parameterId);
        let valueToSave = display.tempValue;

        if (param && param.type !== 'enum') {
          const { min, max } = getParamLimits(param);
          valueToSave = Math.min(max, Math.max(min, valueToSave));
        }

        setParameters(prev => ({
          ...prev,
          [selectedItem.parameterId!]: valueToSave
        }));
        setDisplay(prev => ({ ...prev, editMode: false, tempValue: null }));
      }
    }
  }, [display.editMode, display.tempValue, display.cursorIndex, currentMenuItems, getParamLimits]);

  // --- MANEJADOR DE TECLAS ---

  const handleKeyPress = useCallback((key: string, type: 'short' | 'long' = 'short') => {
    console.log(`Key pressed: ${key} (${type})`);

    // Resetear timer de inactividad con cada tecla
    setDisplay(prev => ({ ...prev, lastActivityTime: Date.now() }));

    switch (key) {
      case 'UP':
        if (display.passwordMode) {
          // Añadir dígito al password (incrementar)
          const currentDigit = display.passwordBuffer.length > 0
            ? parseInt(display.passwordBuffer.slice(-1))
            : 0;
          const newDigit = (currentDigit + 1) % 10;
          if (display.passwordBuffer.length === 0) {
            setDisplay(prev => ({ ...prev, passwordBuffer: String(newDigit) }));
          } else {
            setDisplay(prev => ({
              ...prev,
              passwordBuffer: prev.passwordBuffer.slice(0, -1) + String(newDigit)
            }));
          }
        } else if (display.dateTimeEditMode && display.dateTimeTemp.length === 5) {
          // Incrementar campo de fecha/hora
          const limits = [
            { min: 1, max: 31 },    // día
            { min: 1, max: 12 },    // mes
            { min: 2020, max: 2099 }, // año
            { min: 0, max: 23 },    // hora
            { min: 0, max: 59 }     // minuto
          ];
          const idx = display.dateTimeFieldIndex;
          const newTemp = [...display.dateTimeTemp];
          newTemp[idx] = newTemp[idx] >= limits[idx].max ? limits[idx].min : newTemp[idx] + 1;
          setDisplay(prev => ({ ...prev, dateTimeTemp: newTemp }));
        } else if (display.currentMenuId === 'clock_datetime' && !display.dateTimeEditMode) {
          // Navegar entre campos (sin estar en modo edición)
          setDisplay(prev => ({
            ...prev,
            dateTimeFieldIndex: prev.dateTimeFieldIndex > 0 ? prev.dateTimeFieldIndex - 1 : 4
          }));
        } else {
          // --- LÓGICA NAVEGACIÓN UP (inline para evitar closures stale) ---
          // Obtener items del menú actual DENTRO del callback para evitar stale
          const currentNodeUp = menus.nodes[display.currentMenuId];
          const menuItemsUp = currentNodeUp?.children?.map((childId: string) => menus.nodes[childId]) || [];

          if (display.editMode && display.tempValue !== null) {
            // Obtener el parámetro actual
            const selectedItem = menuItemsUp[display.cursorIndex];
            if (selectedItem?.parameterId) {
              const param = getParamData(selectedItem.parameterId);
              if (param) {
                // Si es tipo enum, ciclar entre opciones
                if (param.type === 'enum' && param.options) {
                  const options = param.options;
                  const currentIdx = options.findIndex(o => o.value === display.tempValue);
                  // Ir a la opción anterior (wrap-around)
                  const prevIdx = currentIdx <= 0 ? options.length - 1 : currentIdx - 1;
                  setDisplay(prev => ({ ...prev, tempValue: options[prevIdx].value }));
                } else {
                  // Tipo numérico: incrementar con step
                  const step = param.step ?? (param.type === 'float' ? 0.1 : 1);
                  // Calcular límites inline
                  let min = param.min ?? -Infinity;
                  let max = param.max ?? Infinity;
                  if (param.minRef && parameters[param.minRef] !== undefined) min = parameters[param.minRef];
                  if (param.maxRef && parameters[param.maxRef] !== undefined) max = parameters[param.maxRef];
                  const newValue = roundToStep((display.tempValue as number) + step, step);
                  // Validar contra límites
                  setDisplay(prev => ({
                    ...prev,
                    tempValue: Math.min(max, Math.max(min, newValue))
                  }));
                }
              }
            }
          } else {
            // Si estamos navegando, movemos cursor
            // Lógica especial para Quick Start Root (custom_quick_start)
            if (currentNodeUp?.type === 'custom_quick_start') {
              setDisplay(prev => ({
                ...prev,
                cursorIndex: Math.max(0, prev.cursorIndex - 1)
              }));
              return;
            }

            // Lógica especial para Quick Start Params (wizard)
            if (currentNodeUp?.wizard) {
              // En wizard mode, UP navega al parámetro anterior
              setDisplay(prev => ({
                ...prev,
                cursorIndex: Math.max(0, prev.cursorIndex - 1),
                editMode: false, // Asegurar salir de edicion al cambiar
                tempValue: null
              }));
              return;
            }

            setDisplay(prev => ({
              ...prev,
              cursorIndex: Math.max(0, prev.cursorIndex - 1)
            }));
          }
        }
        break;
      case 'DOWN':
        if (display.passwordMode) {
          // Decrementar dígito del password
          const currentDigit = display.passwordBuffer.length > 0
            ? parseInt(display.passwordBuffer.slice(-1))
            : 0;
          const newDigit = currentDigit === 0 ? 9 : currentDigit - 1;
          if (display.passwordBuffer.length === 0) {
            setDisplay(prev => ({ ...prev, passwordBuffer: String(newDigit) }));
          } else {
            setDisplay(prev => ({
              ...prev,
              passwordBuffer: prev.passwordBuffer.slice(0, -1) + String(newDigit)
            }));
          }
        } else if (display.dateTimeEditMode && display.dateTimeTemp.length === 5) {
          // Decrementar campo de fecha/hora
          const limits = [
            { min: 1, max: 31 },    // día
            { min: 1, max: 12 },    // mes
            { min: 2020, max: 2099 }, // año
            { min: 0, max: 23 },    // hora
            { min: 0, max: 59 }     // minuto
          ];
          const idx = display.dateTimeFieldIndex;
          const newTemp = [...display.dateTimeTemp];
          newTemp[idx] = newTemp[idx] <= limits[idx].min ? limits[idx].max : newTemp[idx] - 1;
          setDisplay(prev => ({ ...prev, dateTimeTemp: newTemp }));
        } else if (display.currentMenuId === 'clock_datetime' && !display.dateTimeEditMode) {
          // Navegar entre campos (sin estar en modo edición)
          setDisplay(prev => ({
            ...prev,
            dateTimeFieldIndex: prev.dateTimeFieldIndex < 4 ? prev.dateTimeFieldIndex + 1 : 0
          }));
        } else {
          // --- LÓGICA NAVEGACIÓN DOWN (inline para evitar closures stale) ---
          // Obtener items del menú actual DENTRO del callback para evitar stale
          const currentNodeDown = menus.nodes[display.currentMenuId];
          const menuItemsDown = currentNodeDown?.children?.map((childId: string) => menus.nodes[childId]) || [];

          if (display.editMode && display.tempValue !== null) {
            // Obtener el parámetro actual
            const selectedItem = menuItemsDown[display.cursorIndex];
            if (selectedItem?.parameterId) {
              const param = getParamData(selectedItem.parameterId);
              if (param) {
                // Si es tipo enum, ciclar entre opciones
                if (param.type === 'enum' && param.options) {
                  const options = param.options;
                  const currentIdx = options.findIndex(o => o.value === display.tempValue);
                  // Ir a la siguiente opción (wrap-around)
                  const nextIdx = currentIdx >= options.length - 1 ? 0 : currentIdx + 1;
                  setDisplay(prev => ({ ...prev, tempValue: options[nextIdx].value }));
                } else {
                  // Tipo numérico: decrementar con step
                  const step = param.step ?? (param.type === 'float' ? 0.1 : 1);
                  // Calcular límites inline
                  let min = param.min ?? -Infinity;
                  let max = param.max ?? Infinity;
                  if (param.minRef && parameters[param.minRef] !== undefined) min = parameters[param.minRef];
                  if (param.maxRef && parameters[param.maxRef] !== undefined) max = parameters[param.maxRef];
                  const newValue = roundToStep((display.tempValue as number) - step, step);
                  // Validar contra límites
                  setDisplay(prev => ({
                    ...prev,
                    tempValue: Math.min(max, Math.max(min, newValue))
                  }));
                }
              }
            }
          } else {
            // Si estamos navegando, movemos cursor
            // Lógica especial para Quick Start Root (custom_quick_start) - max 2 items seleccionables (Activar, Parametros, Manual)
            if (currentNodeDown?.type === 'custom_quick_start') {
              // Indices: 1=Activar, 2=Parametros, 3=Manual (visual lines match logic lines roughly)
              // Actually let's assume lines 1, 2, 3 as indices 0, 1, 2 for simplicity in logic
              const maxIdx = 2; // 0=Activar, 1=Parametros, 2=Manual
              setDisplay(prev => ({
                ...prev,
                cursorIndex: Math.min(maxIdx, prev.cursorIndex + 1)
              }));
              return;
            }

            // Lógica especial para Quick Start Params (wizard)
            if (currentNodeDown?.wizard) {
              // En wizard mode, DOWN navega al parámetro siguiente
              setDisplay(prev => ({
                ...prev,
                cursorIndex: Math.min(menuItemsDown.length - 1, prev.cursorIndex + 1),
                editMode: false,
                tempValue: null
              }));
              return;
            }

            setDisplay(prev => ({
              ...prev,
              cursorIndex: Math.min(menuItemsDown.length - 1, prev.cursorIndex + 1)
            }));
          }
        }
        break;
      case 'RIGHT':
        if (display.passwordMode) {
          // Confirmar dígito actual y añadir uno nuevo
          setDisplay(prev => ({ ...prev, passwordBuffer: prev.passwordBuffer + '0' }));
        } else if (display.dateTimeEditMode) {
          // Avanzar al siguiente campo
          setDisplay(prev => ({
            ...prev,
            dateTimeFieldIndex: prev.dateTimeFieldIndex < 4 ? prev.dateTimeFieldIndex + 1 : 0
          }));
        } else if (display.currentMenuId === 'root_home') {
          // Toggle Unidad HP (548-UMFn): 0=°C <-> 1=Bar
          setParameters(prev => {
            // Si está en Bar (1) o PSI (3), pasar a °C (0). Si está en Temp, pasar a Bar (1).
            const current = prev['548-UMFn'] ?? 1;
            const next = (current === 1 || current === 3) ? 0 : 1;
            return { ...prev, '548-UMFn': next };
          });
        } else if (display.currentMenuId === 'quick_start') {
          // En Quick Start Root
          // RIGHT toggles switches at index 0 and 2
          if (display.cursorIndex === 0) {
            setDisplay(prev => ({ ...prev, quickStartEnabled: !prev.quickStartEnabled }));
          } else if (display.cursorIndex === 2) {
            setDisplay(prev => ({ ...prev, quickStartManual: !prev.quickStartManual }));
          }
        }
        break;
      case 'OK':
        if (display.passwordMode) {
          // Confirmar password
          const pendingNode = display.pendingMenuId ? menus.nodes[display.pendingMenuId] : null;
          if (pendingNode?.password === display.passwordBuffer) {
            // Password correcto - entrar al menú y subir nivel de acceso
            const newAccessLevel = pendingNode.requiredAccess as 'installer' | 'service' || display.accessLevel;
            setDisplay(prev => ({
              ...prev,
              passwordMode: false,
              passwordBuffer: '',
              pendingMenuId: null,
              accessLevel: newAccessLevel,
              navigationStack: [...prev.navigationStack, prev.currentMenuId],
              currentMenuId: display.pendingMenuId!,
              cursorIndex: 0
            }));
          } else {
            // Password incorrecto - volver
            setDisplay(prev => ({
              ...prev,
              passwordMode: false,
              passwordBuffer: '',
              pendingMenuId: null
            }));
          }
        } else if (type === 'long' && display.currentMenuId === 'root_home') {
          // Acceso a Menú Principal (Pág 28 Manual)
          setDisplay(prev => ({
            ...prev,
            currentMenuId: 'main_menu',
            cursorIndex: 0,
            editMode: false,
            tempValue: null,
            navigationStack: ['root_home']
          }));
        } else if (display.currentMenuId === 'clock_datetime') {
          if (display.dateTimeEditMode) {
            // Guardar fecha/hora y salir de edición
            const [day, month, year, hour, minute] = display.dateTimeTemp;
            const newDate = new Date(year, month - 1, day, hour, minute, 0);
            actionCallbacksRef.current.onSetDateTime?.(newDate);
            setDisplay(prev => ({
              ...prev,
              dateTimeEditMode: false,
              dateTimeTemp: [],
              dateTimeFieldIndex: 0
            }));
          } else {
            // Entrar en modo edición - inicializar con fecha actual
            const now = new Date();
            setDisplay(prev => ({
              ...prev,
              dateTimeEditMode: true,
              dateTimeTemp: [
                now.getDate(),
                now.getMonth() + 1,
                now.getFullYear(),
                now.getHours(),
                now.getMinutes()
              ],
              dateTimeFieldIndex: 0
            }));
          }
        } else if (display.editMode) {
          saveValue();
        } else if (display.currentMenuId === 'quick_start') {
          // En Quick Start Root
          if (display.cursorIndex === 0) {
            setDisplay(prev => ({ ...prev, quickStartEnabled: !prev.quickStartEnabled }));
          } else if (display.cursorIndex === 1) {
            // Entrar a submenu parametros
            // Verificar si esta habilitado
            setDisplay(prev => ({
              ...prev,
              navigationStack: [...prev.navigationStack, prev.currentMenuId],
              currentMenuId: 'quick_start_params',
              cursorIndex: 0
            }));
          } else if (display.cursorIndex === 2) {
            setDisplay(prev => ({ ...prev, quickStartManual: !prev.quickStartManual }));
          }
        } else if (display.currentMenuId === 'quick_start_params') {
          // En Wizard de parametros
          // Entrar a editar el parametro actual si esta habilitado
          if (display.quickStartEnabled) {
            const selectedItem = currentMenuItems[display.cursorIndex];
            if (selectedItem?.parameterId) {
              const currentVal = parameters[selectedItem.parameterId];
              setDisplay(prev => ({
                ...prev,
                editMode: true,
                tempValue: currentVal
              }));
            }
          }
        } else {
          enterMenu();
        }

        break;
      case 'ESC': // Tecla Izquierda/Atrás
        if (display.passwordMode) {
          // Cancelar entrada de password
          setDisplay(prev => ({
            ...prev,
            passwordMode: false,
            passwordBuffer: '',
            pendingMenuId: null
          }));
        } else if (display.dateTimeEditMode) {
          // Cancelar edición de fecha/hora
          setDisplay(prev => ({
            ...prev,
            dateTimeEditMode: false,
            dateTimeTemp: [],
            dateTimeFieldIndex: 0
          }));
        } else if (display.currentMenuId === 'root_home') {
          // Toggle Unidad LP (547-UMCP): 0=°C <-> 1=Bar
          setParameters(prev => {
            // Si está en Bar (1) o PSI (3), pasar a °C (0). Si está en Temp, pasar a Bar (1).
            const current = prev['547-UMCP'] ?? 1;
            const next = (current === 1 || current === 3) ? 0 : 1;
            return { ...prev, '547-UMCP': next };
          });
        } else {
          exitMenu();
        }
        break;
      case 'F1': // Toggle ON/OFF del sistema
        actionCallbacksRef.current.onToggleSystem?.();
        break;
      case 'F2': // Acceso rápido a Setpoints (MENU WIZARD SET/BANDA)
        if (display.currentMenuId === 'root_home') {
          // Requerimiento: Botón F2 lleva al menu set/banda modo wizard
          // Parametros: 143, 144, 343, 344
          // Al salir debe volver a root_home
          setDisplay(prev => ({
            ...prev,
            currentMenuId: 'menu_set_banda',
            cursorIndex: 0,
            editMode: false,
            tempValue: null,
            navigationStack: ['root_home'] // Stack para que ESC vuelva a home
          }));
        }
        break;
      case 'F3': // Acceso rápido a Alarmas
        if (display.currentMenuId === 'root_home') {
          // Navegar directamente a Alarmas Activas
          setDisplay(prev => ({
            ...prev,
            currentMenuId: 'alarm_list',
            cursorIndex: 0,
            editMode: false,
            tempValue: null,
            navigationStack: ['root_home', 'main_menu', 'menu_alarms']
          }));
        }
        break;
    }
  }, [display, parameters, enterMenu, saveValue, exitMenu, menus.nodes]);

  const resetSimulator = useCallback(() => {
    // Reset a valores de fábrica
    const initial: Record<string, number> = {};
    (paramsDb as EwcmParameter[]).forEach((p) => {
      initial[p.id] = p.defaultValue;
    });
    setParameters(initial);

    // Limpiar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }

    setDisplay({
      currentMenuId: 'root_home',
      cursorIndex: 0,
      editMode: false,
      tempValue: null,
      navigationStack: [],
      passwordMode: false,
      passwordBuffer: '',
      pendingMenuId: null,
      accessLevel: 'user',
      dateTimeEditMode: false,
      dateTimeTemp: [],
      dateTimeFieldIndex: 0,

      lastActivityTime: Date.now(),
      quickStartEnabled: true,
      quickStartManual: false,
    });
  }, []);

  // Importar parámetros desde objeto externo (usado por import de configuración)
  const importParameters = useCallback((newParams: Record<string, number>) => {
    // Mezclar con valores por defecto para asegurar completitud
    const defaults: Record<string, number> = {};
    (paramsDb as EwcmParameter[]).forEach((p) => {
      defaults[p.id] = p.defaultValue;
    });
    setParameters({ ...defaults, ...newParams });
  }, []);

  return {
    display,
    parameters,
    currentMenuNode: currentNode,
    currentMenuItems,
    handleKeyPress,
    resetSimulator,
    setActionCallbacks,
    importParameters
  };
};
