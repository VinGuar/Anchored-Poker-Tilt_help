import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App.jsx';
import { buildTiltProfileReport } from '../../src/services/monetizationService.js';
import * as authService from '../../src/services/authService.js';
import * as sessionsService from '../../src/services/sessionsService.js';
import * as settingsService from '../../src/services/settingsService.js';
import * as tiltProfileService from '../../src/services/tiltProfileService.js';
import * as revenueCat from '../../src/services/revenueCatService.js';

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) },
}));

vi.mock('../../src/services/authService.js', () => ({
  getCurrentSession: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() })),
  signOut: vi.fn(),
  closeBrowser: vi.fn(),
  updateAuthEmail: vi.fn(),
  updateAuthPassword: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

vi.mock('../../src/services/sessionsService.js', () => ({
  fetchMySessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSessionById: vi.fn(),
}));

vi.mock('../../src/services/settingsService.js', () => ({
  getMySettings: vi.fn(),
  upsertMySettings: vi.fn(),
}));

vi.mock('../../src/services/tiltProfileService.js', () => ({
  fetchTiltProfile: vi.fn(),
  saveTiltProfile: vi.fn(),
}));

vi.mock('../../src/services/revenueCatService.js', () => ({
  initRevenueCat: vi.fn(() => Promise.resolve(false)),
  logoutRevenueCat: vi.fn(() => Promise.resolve()),
  hasPremiumEntitlement: vi.fn(),
  purchasePremium: vi.fn(),
  refreshPremiumStatus: vi.fn(() => Promise.resolve(false)),
  restorePremium: vi.fn(() => Promise.resolve(false)),
  getSubscriptionManagementUrl: vi.fn(() => 'https://example.com/manage'),
}));

const user = { id: 'user-1', email: 'a@b.c' };

const profileInput = {
  scaleVersion: 'v2_1to5',
  personaAlias: 'Pro',
  primaryGame: 'NLHE',
  volumeStyle: 'Balanced',
  scenarioBadBeat: 3,
  scenarioBluffCaught: 3,
  scenarioBigLossChase: 3,
  scenarioUpBigLoosen: 3,
  scenarioCardDead: 3,
  scenarioMistake: 3,
  scenarioHateLosing: 3,
  scenarioEntitlement: 3,
  injusticeSensitivity: 4,
  losingDistress: 4,
  selfCriticalness: 4,
  skillExpectation: 4,
  egoInvolvement: 4,
  desperationUrgency: 4,
  actionNeed: 4,
  momentumShift: 4,
};

describe('App (authenticated)', () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentSession).mockResolvedValue({ user });
    vi.mocked(authService.getCurrentUser).mockResolvedValue(user);
    vi.mocked(sessionsService.fetchMySessions).mockResolvedValue([]);
    vi.mocked(settingsService.getMySettings).mockResolvedValue({ theme: 'dark', pre_session_note: '' });
    vi.mocked(revenueCat.initRevenueCat).mockResolvedValue(false);
  });

  it('opens tilt profile setup when cloud profile is missing', async () => {
    vi.mocked(tiltProfileService.fetchTiltProfile).mockResolvedValue(null);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Tilt Profile')).toBeInTheDocument();
    });
  });

  it('lands on home when profile exists and navigates to profile tab', async () => {
    const report = buildTiltProfileReport(profileInput);
    vi.mocked(tiltProfileService.fetchTiltProfile).mockResolvedValue({
      tiltProfileInput: profileInput,
      tiltProfileReport: report,
    });
    const u = userEvent.setup();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });
    await u.click(screen.getByRole('button', { name: /settings/i }));
    await waitFor(() => {
      expect(screen.getByText(/Current login:/)).toBeInTheDocument();
    });
  });
});
