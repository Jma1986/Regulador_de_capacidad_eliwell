# Plan de Proyecto: Simulador Eliwell EWCM EO

## Objetivo del Proyecto
Simulador completo del controlador industrial de refrigeración Eliwell EWCM EO (modelos 8900/9100/9900) que permite:
- Navegar por todos los menús del controlador real
- Configurar todos los parámetros del regulador
- Simular entradas digitales y analógicas (presiones, temperaturas)
- Visualizar el comportamiento del sistema de refrigeración en tiempo real

---

## Estado Actual: ~95% Completado ✅

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. Interfaz Visual
- Pantalla LCD simulada (128x64) con diseño realista
- Pantalla HOME con presión aspiración, temperatura impulsión, iconos compresores/ventiladores
- Barras de demanda % y setpoints visibles
- LEDs de estado: Alarma (rojo), PRG (amarillo), Economy (verde)
- Carcasa plástica con botones F1/F2/F3 y cruz de navegación

### 2. Sistema de Navegación
- Stack-based navigation con botón ESC
- OK largo (1s) desde HOME accede al menú principal
- OK corto entra en carpetas/parámetros
- UP/DOWN navega entre items
- Paginación de 4 items por pantalla con scrollbar

### 3. Edición de Parámetros
- Validación de rangos min/max
- Incremento dinámico usando `step` del parámetro
- Soporte para tipos: integer, float, enum
- Referencias dinámicas (`minRef`/`maxRef`)
- ~80 parámetros en `parameters.json`

### 4. Sistema de Alarmas
- Hook `useAlarmSystem.ts` con gestión completa
- Detección por entradas digitales (DI 79-84): LPr, HPr, gA, tC, tF
- Detección por umbrales de sonda: HA, LA, HA_IMP, LA_IMP
- Pantalla de Alarmas Activas con header rojo y paginación
- Pantalla de Historial con indicador de estado
- LED de alarma conectado a `hasUnacknowledged`

### 5. Pantallas Especiales
- **Diagnósticos**: Sondas (PB1-PB4), Entradas (DI1-DI6), Salidas (DO1-DO6, AO1-AO2), Estado
- **Fecha/Hora**: Editor con campos día/mes/año/hora/minuto, reloj simulado x600
- **Programaciones**: Lista de 7 días con horarios ON/OFF
- **Horas**: Funcionamiento por compresor (C1-C3) y ventilador (V1-V3)
- **Contadores**: Arranques por compresor, alarmas activas/historial

### 6. Control de Acceso
- Pantalla de introducción de password
- Passwords: Instalador (22), Servicio (601)
- Niveles: user, installer, service
- Teclas: ▲▼ cambiar dígito, ► siguiente, OK confirmar, ESC cancelar

### 7. Persistencia de Datos
- Parámetros guardados en localStorage (`ewcm_eo_parameters`)
- Carga automática al iniciar
- Reset de fábrica limpia localStorage

### 8. Motor de Simulación Física
- Bucle de 10Hz en `useSimulationLoop.ts`
- Control proporcional para compresores (setpoint aspiración + banda)
- Control proporcional para ventiladores (setpoint impulsión + banda)
- Física con inercia térmica (PRESSURE_INERTIA=0.15, TEMP_INERTIA=0.08)
- Temperatura ambiente variable (oscila ±3°C)
- Tiempos mínimos ON/OFF (`124-don`, `125-doF`) con bloqueo visual

### 9. Contadores Dinámicos
- Horas por compresor (C1, C2, C3) y ventilador (V1, V2, V3)
- Horas totales del sistema
- Contadores de arranques
- Reloj simulado con aceleración x600

### 10. Timeout de Menú
- Timer de inactividad configurable (`542-toUt`, default 300s)
- Retorno automático a HOME al expirar
- Reset del timer con cada keypress

### 11. Export/Import Configuración
- `src/utils/configExport.ts` con funciones exportConfiguration/importConfiguration
- Validación de formato y rangos al importar
- Botones en panel de simulación
- Feedback visual de éxito/error

### 12. Teclas de Función
- F1: Toggle ON/OFF sistema
- F2: Acceso rápido a Setpoints (Compresores)
- F3: Acceso rápido a Alarmas Activas

---

## Estructura de Menús

```
├── Funciones: ON/OFF, Economy, Manual Comp/Vent
├── Alarmas: Lista activa, Historial, Reset
├── Parámetros
│   ├── Usuario: Compresores, Ventiladores, Alarmas
│   └── Instalador (password 22): Config avanzada
├── Reloj: Fecha/Hora, Programaciones
├── Servicio (password 601): Horas, Contadores, Factory Reset
└── Diagnósticos: Sondas, Entradas, Salidas, Estado
```

---

## Arquitectura

```
src/
├── hooks/
│   ├── useEwcmController.ts   # Navegación, edición, timeout, persistencia
│   ├── useSimulationLoop.ts   # Motor física 10Hz, tiempos mínimos
│   └── useAlarmSystem.ts      # Gestión de alarmas
├── components/
│   ├── LcdScreen.tsx          # Pantalla LCD (HOME, menús, especiales)
│   ├── InputSimulator.tsx     # Panel de ingeniería + export/import
│   └── App.tsx                # Orquestador principal
├── data/
│   ├── parameters.json        # ~80 parámetros con tipos y rangos
│   ├── menus.json             # Árbol de menús (150+ nodos)
│   ├── alarms.json            # 12 alarmas con severidad
│   └── io_mapping.json        # Mapeo I/O
├── types/ewcm.ts              # Tipos TypeScript
└── utils/
    ├── ewcmUtils.ts           # Funciones puras
    └── configExport.ts        # Export/import configuración
```

---

## Métricas de Progreso

| Área | Completado |
|------|------------|
| Navegación por menús | 100% |
| Edición de parámetros | 100% |
| Sistema de alarmas | 100% |
| Pantallas diagnóstico | 100% |
| Control de acceso | 100% |
| Persistencia datos | 100% |
| Simulación física | 95% |
| Contadores dinámicos | 100% |
| Timeout de menú | 100% |
| Export/Import | 100% |
| Tiempos mínimos ON/OFF | 100% |

**Total: ~95%**

---

## 🔶 PENDIENTE (Opcional, ~5%)

### Mejoras Opcionales
- [ ] Escalones discretos de compresores (0%, 33%, 66%, 100%)
- [ ] Simulación de fallos de sonda (E1, E2, E3)
- [ ] Parámetros de inverter (`180-FrMn` a `183-dCt`)
- [ ] Testing responsive en móvil
- [ ] Optimización de rendimiento (memoización)

---

## Comandos

```bash
npm install    # Instalar dependencias
npm run dev    # Servidor desarrollo (http://localhost:3000)
npm run build  # Build producción
```

---

*Última actualización: Diciembre 2024*
*Versión: 2.1*
