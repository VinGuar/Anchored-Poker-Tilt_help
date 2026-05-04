# Anchored

Anchored is a real-time poker tilt check and coaching app that helps players stay process-focused, emotionally stable, and decision-disciplined during sessions.

## App Store Connect listing (copy/paste)

**Description**

I made Anchored because tilt costs real money, and most of us don’t notice it until it’s too late.

It’s simple: you’re in a session, you run a quick check, and the app tells you where your head is at (Clear, Warning, or Tilt) based on a few honest sliders (pace, standards, emotion, that “I need this pot” feeling). Then you get short coaching you can actually use before the next hand.

You can log sessions and notes so over time you see your patterns, not just tonight’s damage.

If you play seriously and want something direct instead of another motivational poster, this is for you.

**Keywords**

poker,tilt,mental game,bankroll,focus

**Support URL**

`mailto:bostoncelticsvincent@gmail.com` (interim). App Store Connect usually wants an `https://` page; when you have one, replace this with your hosted privacy/support page or a public profile link.

**Copyright**

© 2026 Vincent Guarnieri

## Current Status / TODO

### Done (Windows-ready)

- RevenueCat Capacitor SDK integrated in app code (`@revenuecat/purchases-capacitor`).
- Premium gating now checks RevenueCat entitlement `anchored_pro` on native platforms.
- Paywall purchase + restore wired to RevenueCat in app flow.
- Profile screen includes `Manage Subscription` link (Apple subscriptions page on iOS).
- RevenueCat env keys documented in `.env.example` and setup flow documented below.

### Pending (after Apple Developer approval)

- In App Store Connect, create subscription products:
  - `monthly` (auto-renewable subscription)
  - `yearly` (auto-renewable subscription)
- In RevenueCat, map these products into offering `default`.
- Attach both products to entitlement `anchored_pro`.
- On Mac/Xcode: run `npm run cap:sync:ios`, verify purchase/restore in sandbox, archive/upload.

## Launch Board (Project-Specific)

Use this as the single pre-launch tracker.

### P0 - Must finish before launch

- [x] RevenueCat SDK integrated in app code.
- [x] Premium features gated in app flow with paywall path.
- [x] Restore purchases action wired in paywall.
- [x] Manage subscription link available in Profile plan section.
- [x] Privacy policy + terms links available in app.
- [x] In-app account deletion flow exists in Profile.
- [ ] App Store Connect subscription products created:
  - `monthly` (auto-renewable)
  - `yearly` (auto-renewable)
- [ ] RevenueCat products mapped to offering `default`.
- [ ] RevenueCat entitlement `anchored_pro` linked to both subscription products.
- [ ] iOS sandbox purchase test completed (buy, restore, cancel, relogin).
- [ ] TestFlight build uploaded and tested on physical iPhone.
- [ ] App Store Connect privacy labels completed and consistent with Supabase usage.

### P1 - Strongly recommended for week 1

- [ ] Add crash/error monitoring (for example Sentry) for production triage.
- [ ] Add analytics events for activation + paywall funnel:
  - paywall viewed
  - purchase started
  - purchase success/failure
  - restore success/failure
- [ ] Validate Supabase RLS manually with two test users (no cross-account access).
- [ ] Add explicit retry/error states on all key network actions.
- [ ] Run full QA pass for offline + flaky network behavior.

### P2 - Post-launch optimization

- [ ] Add performance pass for slower iPhones (startup and form input responsiveness).
- [ ] Refine paywall package selection and experimentation strategy.
- [ ] Add retention dashboard (D1/D7 usage, subscription conversion, restore rate).
- [ ] Create simple weekly release checklist and changelog cadence.

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

## RevenueCat subscription setup

This app now uses RevenueCat for premium entitlement checks, purchases, and restore flows on native mobile builds.

### 1) Install dependency

```bash
npm install
```

### 2) Add environment keys

Set these in `.env`:

- `VITE_REVENUECAT_APPLE_API_KEY`
- `VITE_REVENUECAT_GOOGLE_API_KEY` (optional until Android launch)

### 3) RevenueCat dashboard

In RevenueCat:

1. Create entitlement: `anchored_pro` (display name can be `Anchored Pro`)
2. Create offering: `default`
3. Add packages in the current offering for store product IDs `monthly` and `yearly` (auto-renewable subscriptions). Prefer package identifiers `monthly` and `yearly`, or rely on matching by App Store product ID (see `revenueCatService.js`).
4. Attach both subscription products to entitlement `anchored_pro`

The app purchases from the current/default offering and grants access when entitlement `anchored_pro` is active.

### 4) Apple compatibility / cancellation

- Subscriptions purchased via RevenueCat on iOS are still native Apple subscriptions.
- Users can manage/cancel in Apple subscriptions settings.
- App `Profile -> Plan -> Manage Subscription` links directly to Apple's subscription management page.

### 5) If Apple Developer approval is still pending

You can complete all non-Apple prep now and finish IAP activation later:

1. Keep RevenueCat entitlement/offering/package identifiers exactly as above.
2. Keep `VITE_REVENUECAT_APPLE_API_KEY` in `.env`.
3. Continue web development on Windows as normal.
4. After Apple account approval, create App Store Connect subscriptions with matching IDs (`monthly`, `yearly`) and link them in RevenueCat.
5. On Mac, run:
   - `npm install`
   - `npm run cap:sync:ios`
   - open `ios/App/App.xcworkspace` and archive/upload.

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
