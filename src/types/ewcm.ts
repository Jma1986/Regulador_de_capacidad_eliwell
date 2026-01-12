/**
 * src/types/ewcm.ts
 * * Definiciones de tipos Core para el simulador EWCM EO.
 * Estos tipos modelan la estructura de datos extraída del manual de usuario.
 * * @module EwcmTypes
 */

/**
 * Niveles de acceso permitidos en el sistema.
 * - `user`: Acceso básico (visualización y setpoint básico).
 * - `installer`: Acceso total a configuración (requiere contraseña, por defecto 1).
 * - `manufacturer`: Acceso de fábrica (generalmente oculto).
 */
export type AccessLevel = 'user' | 'installer' | 'manufacturer';

/**
 * Tipos de unidades para la conversión dinámica de valores.
 * El manual especifica que ciertas unidades cambian según la configuración.
 * * @see Manual Pág. 27 (4.4.4 Unidad de Medición)
 */
export type UnitType =
  | 'none'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'percent'
  | 'dynamic_pressure' // Renderiza "Bar" o "PSI" según parámetros 543/547
  | 'dynamic_temp';    // Renderiza "°C" o "°F" según parámetro 547

/**
 * Opción para parámetros tipo 'enum' (listas desplegables).
 */
export interface ParameterOption {
  value: number;
  label: string;
}

/**
 * Representa un parámetro individual del controlador (ej: "143-SEt").
 * Esta es la estructura principal de `src/data/parameters.json`.
 */
export interface EwcmParameter {
  /** ID único del parámetro (ej: "143-SEt"). */
  id: string;
  /** Nombre visible en el display LCD. */
  label: string;
  /** Explicación técnica del parámetro (extraída del manual). */
  description: string;
  /** ID de la carpeta del menú donde se agrupa este parámetro. */
  folder: string;
  /** Tipo de dato para renderizar el input correcto. */
  type: 'integer' | 'float' | 'enum';
  /** Valor por defecto de fábrica. */
  defaultValue: number;
  /** Valor actual en tiempo de ejecución (opcional en la DB estática). */
  value?: number;
  /** Límite inferior absoluto. */
  min?: number;
  /** Límite superior absoluto. */
  max?: number;
  /** Resolución de cambio (ej: 0.1 para presión, 1 para enteros). */
  step?: number;
  /** * Referencia dinámica al ID de otro parámetro que define el mínimo.
   * Ej: El mínimo de "Setpoint" (143) es "Límite Setpoint" (141).
   */
  minRef?: string;
  /** * Referencia dinámica al ID de otro parámetro que define el máximo.
   * Ej: El máximo de "Setpoint" (143) es "Límite Setpoint" (142).
   */
  maxRef?: string;
  /** Tipo de unidad para visualización. */
  unitType?: UnitType;
  /** Lista de opciones si type === 'enum'. */
  options?: ParameterOption[];
  /** Nivel de seguridad requerido para modificar este parámetro. */
  accessLevel: AccessLevel;
  /** Página del PDF de donde se extrajo la información (para auditoría). */
  sourcePage: number;
  /** Si es true, el parámetro no se puede editar (solo informativo). */
  readOnly?: boolean;
}

/**
 * Tipos de nodo del árbol de navegación.
 */
export type MenuNodeType =
  | 'folder'           // Contiene otros nodos hijos
  | 'parameter_link'   // Apunta a un EwcmParameter para editarlo
  | 'screen'           // Pantalla especial (ej: Home)
  | 'home_screen'      // Pantalla HOME principal
  | 'action'           // Ejecuta una función inmediata (ej: Reset Alarmas)
  | 'alarm_list'       // Lista de alarmas (activas o historial)
  | 'diagnostics_view' // Vista de diagnóstico (sondas, I/O, etc.)
  | 'datetime_editor'  // Editor de fecha/hora
  | 'schedule_editor'  // Editor de programaciones horarias
  | 'hours_display'    // Visualización de horas de funcionamiento
  | 'counters_display' // Visualización de contadores
  | 'custom_quick_start'; // Pantalla personalizada Encendido Rápido

/**
 * Nodo del árbol de navegación.
 * Usado en `src/data/menus.json` para construir el sistema de menús.
 */
export interface MenuNode {
  id: string;
  label: string;
  type: MenuNodeType;
  /** Array de IDs de los nodos hijos (solo si type === 'folder'). */
  children?: string[];
  /** ID del parámetro a editar (solo si type === 'parameter_link'). */
  parameterId?: string;
  /** Nombre de la acción a ejecutar (solo si type === 'action'). */
  action?: string;
  /** Índice para acciones indexadas (ej: compresor 1, 2, 3). */
  index?: number;
  /** Filtro para alarm_list: 'active' | 'history'. */
  filter?: 'active' | 'history';
  /** Tipo de vista para diagnostics_view. */
  viewType?: 'probes' | 'digital_inputs' | 'outputs' | 'system_status';
  /** Tipo de programación para schedule_editor. */
  scheduleType?: 'economy' | 'onoff';
  /** Categoría para hours_display. */
  category?: 'compressors' | 'fans';
  /** Nivel de acceso requerido para ENTRAR en este nodo. */
  requiredAccess?: AccessLevel;
  /** Password requerido para acceder. */
  password?: string;
  /** Si requiere confirmación antes de ejecutar (para acciones peligrosas). */
  requiresConfirmation?: boolean;
  /** Texto de ayuda contextual. */
  description?: string;
  /** Si es true, activa la navegación tipo Wizard (1 item por página). */
  wizard?: boolean;
}

/** Estructura completa del árbol de menús. */
export interface MenuStructure {
  root: string;
  nodes: Record<string, MenuNode>;
}

/**
 * Estado Global del Simulador (Redux/Context Store).
 * Define todo lo que puede cambiar en tiempo real.
 */
export interface SimulatorState {
  /** Si el dispositivo está encendido. */
  powerOn: boolean;
  /** Mapa de valores actuales: { "143-SEt": -35.0, ... } */
  parameters: Record<string, number>;
  /** Lista de códigos de alarma activos actualmente. */
  activeAlarms: string[];
  /** Estado de Entradas/Salidas (I/O). */
  ioState: {
    digitalOutputs: boolean[]; // Estado de los Relés (true=cerrado/activo)
    digitalInputs: boolean[];  // Estado de las Entradas Digitales
    analogInputs: number[];    // Valores de sondas (Raw)
    analogOutputs: number[];   // Valor 0-100% de salidas analógicas
  };
}