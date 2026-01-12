# Manual de Navegación - Simulador EWCM EO

## Controles del Simulador

### Botones de Navegación (Panel Derecho)

| Botón | Función |
|-------|---------|
| **OK (centro)** | Pulsación corta: Entrar en menú/carpeta o confirmar edición |
| **OK (mantener 1s)** | Desde HOME: Acceder al Menú Principal |
| **ESC (izquierda)** | Volver atrás / Cancelar edición |
| **▲ (arriba)** | Navegar hacia arriba / Incrementar valor en edición |
| **▼ (abajo)** | Navegar hacia abajo / Decrementar valor en edición |
| **► (derecha)** | Sin función asignada actualmente |

### Botones de Función (Panel Izquierdo)

| Botón | Función |
|-------|---------|
| **F1** | ON/OFF del sistema (toggle) |
| **F2** | Acceso rápido a Setpoints |
| **F3** | Ver Alarmas |

---

## Pantallas del Simulador

### 1. Pantalla HOME (Inicio)

La pantalla principal muestra:
- **Zona Superior**: Iconos de compresores y ventiladores activos
- **Zona Central Izquierda (LP)**: Presión de aspiración en Bar + Setpoint
- **Zona Central Derecha (HP)**: Temperatura de impulsión en °C + Setpoint
- **Zona Inferior**: Barras de demanda de compresores y ventiladores (%)

**Navegación desde HOME:**
- Mantener **OK** 1 segundo → Acceder al Menú Principal

---

### 2. Menú Principal

Desde el menú principal puedes acceder a:

```
MENÚ PRINCIPAL
├── Funciones        → Acciones de control
├── Alarmas          → Gestión de alarmas
├── Parámetros       → Configuración
├── Reloj            → Fecha/hora
├── Servicio         → Mantenimiento (requiere password)
└── Diagnóstico      → Estado del sistema
```

---

## Navegación por Menús

### Entrar en una Carpeta
1. Usa **▲/▼** para seleccionar la carpeta (aparece ► a la derecha)
2. Pulsa **OK** para entrar

### Editar un Parámetro
1. Usa **▲/▼** para seleccionar el parámetro
2. Pulsa **OK** para entrar en modo edición (el valor parpadea)
3. Usa **▲/▼** para cambiar el valor
4. Pulsa **OK** para guardar o **ESC** para cancelar

### Volver Atrás
- Pulsa **ESC** para volver al menú anterior
- Desde el menú raíz, **ESC** vuelve a HOME

---

## Menús Disponibles

### Funciones
Acciones de control del sistema:
- **ON/OFF Instalación**: Encender/apagar todo el sistema
- **Economy**: Activar/desactivar modo ahorro energético
- **Manual Compresores**: Control manual de compresores 1, 2, 3
- **Manual Ventiladores**: Control manual de ventiladores 1, 2, 3
- **Rotación**: Forzar rotación de compresores
- **Desescarche**: Forzar ciclo de desescarche

### Alarmas
Gestión de alarmas del sistema:
- **Alarmas Activas**: Ver lista de alarmas actuales
  - Header rojo con icono pulsante
  - Muestra hora de activación
  - ● indica alarma sin reconocer
- **Cronología**: Historial de alarmas pasadas
  - ✓ = alarma ya limpiada
  - ... = alarma aún activa
- **Reset Alarmas**: Rearmar alarmas manuales

### Parámetros
Configuración del controlador:
- **Usuario**: Parámetros básicos (sin password)
  - Compresores → Setpoint y Banda
  - Ventiladores → Setpoint y Banda
  - Display → Timeout, Bloqueo
- **Instalador**: Configuración avanzada (password: **22**)
  - Encendido Rápido
  - Tiempos de seguridad
  - Regulación y alarmas
  - Configuración I/O

### Reloj
- **Fecha/Hora**: Ver/ajustar fecha y hora del sistema
- **Programaciones**: Horarios de Economy y ON/OFF

### Servicio (password: **601**)
- **Horas Funcionamiento**: Contadores de compresores y ventiladores
- **Contadores**: Arranques y paradas
- **Copy Card**: Guardar/cargar configuración
- **Reset Fábrica**: Restaurar valores por defecto

### Diagnóstico
Información en tiempo real del sistema:
- **Sondas**: Valores de PB1 (Aspiración), PB2 (Impulsión), etc.
- **Entradas Digitales**: Estado ON/OFF de DI1-DI6
- **Salidas**: Estado de salidas digitales DO1-DO6 y analógicas AO1-AO2
- **Estado Sistema**: Resumen general (encendido, demandas, alarmas)

---

## Panel de Simulación (Lado Derecho)

El panel de ingeniería permite simular condiciones:

### Sliders de Override
- **Presión Aspiración**: Forzar valor de 0 a 10 Bar
- **Temperatura Impulsión**: Forzar valor de -20 a 80°C
- Desactiva el slider para volver a simulación automática

### Toggles de Entradas Digitales
| Toggle | ID | Efecto |
|--------|-----|--------|
| Bloqueo Compresor | DI 79 | Bloquea todos los compresores |
| Presostato Baja | DI 80 | Dispara alarma LPr |
| Presostato Alta | DI 81 | Dispara alarma HPr |
| Alarma Externa | DI 82 | Dispara alarma gA |
| Térmica Compresor | DI 83 | Dispara alarma tC y bloquea compresor |
| Térmica Ventilador | DI 84 | Dispara alarma tF y bloquea ventiladores |

### Monitor de Salidas
Muestra en tiempo real:
- Demanda de compresores (%)
- Demanda de ventiladores (%)
- Estado del sistema (ON/OFF)

---

## LEDs de Estado

En la parte superior de la pantalla LCD:

| LED | Color | Significado |
|-----|-------|-------------|
| ((•)) | Rojo | Alarma activa sin reconocer |
| PRG | Amarillo | Estás en un menú (no en HOME) |
| S | Verde | Modo Economy activo |

---

## Flujo de Navegación Típico

### Para cambiar el Setpoint de Aspiración:
1. Desde HOME, mantén **OK** 1 segundo
2. Navega a "Parámetros" → **OK**
3. Navega a "Usuario" → **OK**
4. Navega a "Compresores" → **OK**
5. Navega a "Umbrales Regulación" → **OK**
6. Selecciona "Setpoint Asp" → **OK**
7. Usa **▲/▼** para ajustar el valor
8. Pulsa **OK** para guardar

### Para ver las alarmas activas:
1. Desde HOME, mantén **OK** 1 segundo
2. Navega a "Alarmas" → **OK**
3. Navega a "Alarmas Activas" → **OK**
4. Usa **▲/▼** para navegar entre alarmas
5. Pulsa **ESC** para volver

### Para simular una alarma:
1. En el panel derecho, activa "Presostato Baja"
2. El LED rojo se encenderá
3. Ve a Alarmas → Alarmas Activas para ver "LPr"
4. Desactiva el toggle para limpiar la alarma

---

## Passwords del Sistema

| Nivel | Password | Acceso |
|-------|----------|--------|
| Usuario | (ninguno) | Parámetros básicos |
| Instalador | **22** | Configuración completa |
| Servicio | **601** | Mantenimiento y reset |

### Cómo Introducir un Password
1. Al intentar acceder a una carpeta protegida (ej: "Instalador"), aparece la pantalla de password
2. Usa **▲/▼** para cambiar el dígito actual (0-9)
3. Usa **►** para confirmar el dígito y pasar al siguiente
4. Pulsa **OK** cuando hayas introducido todos los dígitos
5. Si el password es correcto, entrarás al menú
6. Si es incorrecto, volverás al menú anterior
7. Pulsa **ESC** para cancelar en cualquier momento

**Ejemplo para Instalador:**
1. Selecciona "Instalador" en Parámetros → OK
2. Aparece pantalla de password
3. ▲ hasta llegar a **2**, luego ►
4. ▲ hasta llegar a **2**, luego OK
5. Acceso concedido

---

## Atajos de Teclado

Desde la pantalla HOME:
- **OK largo (1s)**: Menú Principal
- **F1**: Toggle ON/OFF sistema
- **F2**: Acceso rápido a Setpoints
- **F3**: Ir directamente a Alarmas

---

*Versión del manual: 1.1*
*Simulador EWCM EO v1.0.0*
