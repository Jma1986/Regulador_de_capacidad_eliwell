Actúa como un Desarrollador Senior de React y Next.js especializado en sistemas industriales. Tu tarea es inicializar y montar un proyecto de "Digital Twin" (Simulador) basado en las especificaciones y archivos que te proporcionaré.

1. Configuración del Proyecto

Inicializa un nuevo proyecto usando Next.js (App Router), TypeScript y Tailwind CSS.
Asegúrate de que la configuración de Tailwind permita colores personalizados (necesitamos colores específicos para el LCD retro).

2. Estructura de Directorios

Debes crear la siguiente estructura de carpetas dentro de src/:

src/components: Para componentes de UI (Dumb components).

src/hooks: Para lógica de negocio y máquinas de estado.

src/data: Para los archivos JSON estáticos (Bases de datos de parámetros).

src/types: Para interfaces TypeScript compartidas.

src/utils: Para funciones de ayuda puras.

3. Implementación de Archivos

A continuación, te proporcionaré el código fuente para cada archivo. Tu tarea es crear cada archivo en su ruta correspondiente y pegar el contenido exacto.

Orden de creación sugerido:

src/types/ewcm.ts (Tipos base, sin dependencias).

src/data/\*.json (Todos los archivos JSON de datos).

src/utils/ewcmUtils.ts (Depende de data y types).

src/hooks/useSimulationLoop.ts (Motor de física).

src/hooks/useEwcmController.ts (Lógica de control).

src/components/\*.tsx (Componentes visuales: Keypad, LcdScreen, InputSimulator).

src/App.tsx (o page.tsx): Ensamblaje final.

4. Requerimientos de Estilo

Usa Tailwind para todo el estilado.

El contenedor principal debe parecer una carcasa industrial negra/gris oscuro.

La pantalla LCD debe tener una fuente monoespaciada y un fondo retro (ej. #9cb0c2).

Los botones deben tener feedback visual al pulsarse (active:scale-95).

5. Contexto de los Archivos

(Aquí es donde el usuario -tú- pegará el contenido de los bloques de código generados en nuestra conversación previa. Si la IA tiene contexto de la charla, simplemente dile: "Usa el código generado en la conversación anterior para los archivos listados en la estructura").

6. Ejecución

Una vez creados los archivos, asegúrate de que el page.tsx principal renderice el componente <Simulator /> y que no haya errores de importación circular.

Instrucción Final:
Por favor, genera el script de shell o los pasos necesarios para crear esta estructura y confírmame cuando estés listo para recibir el contenido de los archivos si no lo tienes ya en memoria.
