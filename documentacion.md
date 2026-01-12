Eliwell EWCM EO - Digital Twin Simulator

Este proyecto es un simulador web completo ("Digital Twin") del controlador para centrales de compresores Eliwell EWCM EO (modelos 8900, 9100 y 9900).

Está construido con React, TypeScript y Tailwind CSS, simulando tanto la interfaz física (LCD, botones, LEDs) como la lógica interna de regulación (física, parámetros, alarmas).

🚀 Características

Interfaz Realista: Recreación pixel-perfect de la pantalla LCD gráfica de 128x64 y botonera física.

Motor de Física: Simulación de termodinámica básica (presión/temperatura) que reacciona a la carga de los compresores y ventiladores.

Máquina de Estados: Navegación real por menús, carpetas, edición de parámetros y niveles de acceso (Usuario/Instalador).

Base de Datos Completa: Mapeo real de los parámetros, rangos y descripciones extraídos del manual técnico.

Consola de Ingeniería: Panel lateral para inyección de fallos, forzado de sondas y simulación de entradas digitales.

🛠️ Estructura del Proyecto

src/
├── components/
│ ├── Keypad.tsx # Botonera física con lógica de pulsación larga
│ ├── LcdScreen.tsx # Renderizado de la pantalla (Home y Menús)
│ └── InputSimulator.tsx # Dashboard de ingeniería (Sliders/Switches)
├── data/
│ ├── parameters.json # DB de parámetros de regulación
│ ├── parametersDb_Part2.json # DB de protecciones y funciones
│ ├── menus.json # Árbol de navegación jerárquico
│ ├── io_mapping.json # Mapeo de Relés y Entradas Digitales
│ └── alarms.json # Definiciones de códigos de alarma
├── hooks/
│ ├── useEwcmController.ts # Lógica de navegación y edición
│ └── useSimulationLoop.ts # Motor de física (Banda proporcional/PID)
├── types/
│ └── ewcm.ts # Definiciones TypeScript estrictas
├── utils/
│ └── ewcmUtils.ts # Conversiones de unidades y lógica auxiliar
└── App.tsx # Layout principal (Carcasa y ensamblaje)

📦 Instalación y Uso

Requisitos: Node.js 18+

Instalar dependencias:

npm install

Arrancar entorno de desarrollo:

npm run dev

🎮 Guía de Operación

Teclado

F1: Menú Estado Rápido (Corto).

F2: Menú Setpoints (Corto) / Desbloqueo (Largo).

F3: Silenciar Alarma (Corto) / Menú Alarmas (Largo).

OK: Entrar/Guardar (Corto) / Menú Principal (Largo > 3s).

ESC: Atrás / Cancelar.

Simulación

Desde el panel derecho "Consola de Simulación":

Usa los Sliders para cambiar artificialmente la Presión de Aspiración o Temperatura de Impulsión.

Usa los Switches para simular la activación de entradas digitales (ej. Presostato de Alta).

Observa cómo el controlador reacciona encendiendo/apagando iconos de compresores en la pantalla LCD.

📄 Créditos

Basado en la documentación técnica oficial de la serie EWCM EO de Eliwell.
