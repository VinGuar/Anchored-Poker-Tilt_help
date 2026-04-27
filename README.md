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
- Supabase (`@supabase/supabase-js`) for auth + user data
- Plain CSS with design tokens and dark/light theming support

## Getting started

### Prerequisites

- Node.js 18+ recommended

### Install

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in your Supabase key:

```bash
cp .env.example .env
```

- `VITE_SUPABASE_URL` is already set to your project URL
- Set `VITE_SUPABASE_ANON_KEY` from Supabase project settings

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

## Supabase backend setup

Project ID: `dzzgvgtkepwrqmbtcpft`

1. Open Supabase SQL Editor
2. Run `supabase/schema.sql`
3. Confirm tables exist:
   - `profiles`
   - `user_settings`

The schema enables:
- email/password auth-backed profile records
- user-owned settings
- row-level security policies per authenticated user
- auto-creation of profile + settings on signup
- DB constraints + update triggers for data integrity

## Production checklist (lean)

- Run latest `supabase/schema.sql` in production project.
- In Supabase Auth settings:
  - enable email confirmations
  - enable bot protection / CAPTCHA
  - configure rate limits
- Keep only publishable key in frontend `.env` (`VITE_SUPABASE_ANON_KEY`).
- Verify RLS manually: authenticated user A cannot read/write user B rows.
- Build and preview before deploy:
  - `npm run build`
  - `npm run preview`

## iOS (Capacitor) setup

Capacitor is configured for this project with:

- App name: `Anchored`
- Bundle ID: `com.vinguar.anchored`
- Config file: `capacitor.config.json`
- iOS project path: `ios/App`

### Useful commands

```bash
# Build web assets and sync into iOS project
npm run cap:sync:ios

# Open iOS project in Xcode (macOS only)
npm run cap:open:ios
```

### App Store build flow

1. Run `npm run cap:sync:ios`
2. Open `ios/App/App.xcworkspace` in Xcode
3. Configure signing/team + bundle settings
4. Add final app icons / launch assets in Xcode asset catalog
5. Archive and upload via Xcode Organizer

Note: iOS signing, CocoaPods, and App Store upload must be done on macOS with Xcode installed.

## First App Store submission checklist

Use this checklist in App Store Connect to reduce first-review rejection risk.

### Metadata

- App name: `Anchored`
- Subtitle: short value proposition (<= 30 chars)
- Description: clearly explain coaching purpose and account usage
- Keywords: poker, tilt, mental game, session tracker, coaching
- Support URL: point to your support page or support email contact page
- Marketing URL: optional, but recommended

### Screenshots

- iPhone 6.7" and 6.5" screenshots are typically sufficient for iPhone listing coverage
- Show: Home, Current Session, check-in flow, Insights, Profile
- Avoid placeholder text and test data that looks fake

### Privacy + legal

- Privacy Policy URL is required (this repo now provides `/privacy.html`)
- Terms URL recommended (this repo now provides `/terms.html`)
- In-app links to privacy/terms are added on auth + profile screens
- In-app account deletion is available in Profile (`Delete Account`)

### Account and review compliance

- Account creation flow works
- Login works after email confirmation
- Password reset works in Supabase auth flow
- Account deletion can be completed directly inside the app
- Demo/test account for App Review provided in App Store Connect review notes if needed

### Data disclosures (App Privacy in App Store Connect)

- Declare account email and user content (session notes/checks/history) as collected
- Declare purpose as app functionality/authentication
- Do not mark data as "not collected" if stored in Supabase

### Pre-submit QA

- Run `npm run cap:sync:ios` before archive
- Test on at least one physical iPhone via TestFlight
- Validate auth, profile updates, and session save flows
- Confirm no console crashes on startup and key screens

## Project structure

- `src/screens/` - app screens and session flow
- `src/components/` - shared UI components
- `src/lib/supabase.js` - Supabase client
- `src/services/authService.js` - auth operations
- `src/services/profileService.js` - user profile CRUD
- `src/services/settingsService.js` - user settings CRUD
- `src/services/sessionsService.js` - session history CRUD
- `src/utils/tiltDetection.js` - scoring, thresholds, and recommendation logic
- `supabase/schema.sql` - backend schema and RLS policies
- `src/index.css` - global design tokens and styling system

## License

MIT. See `LICENSE`.
