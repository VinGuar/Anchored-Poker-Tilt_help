# Anchored

Anchored is a real-time poker tilt check and coaching app that helps players stay process-focused, emotionally stable, and decision-disciplined during sessions.

## What it does

- Runs a fast in-session tilt check using four 1-10 signals:
  - Rushed decision pace
  - Standards drift from baseline
  - Emotional activation / frustration
  - Urgency to win or get unstuck
- Uses current session context (events, buy-ins, checks) and recent-session pressure to score state:
  - Clear
  - Warning
  - Tilt
- Provides state-aware coaching actions for preflop and postflop process control
- Tracks session history, notes, and patterns for long-term improvement

## Product sections

- `Home`: readiness and high-level status
- `Current Session`: pre-session notes + quick start + live session flow
- `Insights`: merged history + stats view with editable session notes
- `Learn`: focused improvement prompts, resources, and worksheet ideas

## Tech stack

- React 18
- Vite
- Plain CSS with design tokens and dark/light theming support
- Local storage persistence (no backend required)

## Getting started

### Prerequisites

- Node.js 18+ recommended

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project structure

- `src/screens/` - app screens and session flow
- `src/components/` - shared UI components
- `src/utils/tiltDetection.js` - scoring, thresholds, and recommendation logic
- `src/utils/storage.js` - local storage persistence
- `src/index.css` - global design tokens and styling system

## License

MIT. See `LICENSE`.
