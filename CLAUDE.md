# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital twin simulator of the Eliwell EWCM EO industrial refrigeration controller (models 8900, 9100, 9900). Simulates both the physical interface (128x64 LCD, buttons, LEDs) and internal control logic (proportional band regulation, parameter management).

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
```

Requires Node.js 18+.

## Architecture

```
src/
├── app/            # Next.js App Router (layout, page, globals.css)
├── components/     # React UI components
├── hooks/          # Business logic & state management
├── data/           # JSON configuration files
├── types/          # TypeScript definitions
├── utils/          # Pure utility functions
└── App.tsx         # Main simulator component
```

### Core Hooks

- **useEwcmController.ts**: Menu navigation state machine with stack-based navigation, parameter editing, and access level management. Display state includes currentMenuId, cursorIndex, editMode, tempValue, and navigationStack.

- **useSimulationLoop.ts**: Physics engine running at 10Hz. Implements proportional band control for compressor/fan demand based on suction pressure (param 143-SEt) and discharge temperature (param 343-SEt). Supports manual overrides for testing.

### Data Files

- **parameters.json**: ~80 controller parameters with types, ranges, defaults, and access levels
- **menus.json**: Hierarchical menu tree structure
- **alarms.json**: Alarm codes with severity and reset requirements
- **io_mapping.json**: Digital/analog I/O function definitions

### Key Patterns

- All business logic lives in custom hooks; components are purely presentational
- Parameters, menus, and alarms are configuration-driven via JSON
- Menu navigation uses a stack for proper back-button behavior
- Physics simulation uses refs for high-frequency updates, syncing to React state periodically

## Button Behavior

- **OK short**: Enter menu/confirm edit
- **OK long (3s)**: Access main menu from home screen
- **ESC**: Go back / cancel edit
- **UP/DOWN**: Navigate or adjust values in edit mode
- **F1/F2/F3**: Function buttons (partially implemented)

## Simulation Console

The right panel (InputSimulator) allows injecting test conditions:
- Pressure/temperature sliders with manual override
- Digital input toggles (alarm, compressor block, pressure switches)
- Real-time output monitoring
