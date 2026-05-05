import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App.jsx';
import * as authService from '../../src/services/authService.js';
import * as sessionsService from '../../src/services/sessionsService.js';
import * as settingsService from '../../src/services/settingsService.js';
import * as tiltProfileService from '../../src/services/tiltProfileService.js';

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
  getSubscriptionManagementUrl: vi.fn(() => ''),
}));

describe('App (guest)', () => {
  beforeEach(() => {
    vi.mocked(authService.getCurrentSession).mockResolvedValue(null);
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
    vi.mocked(sessionsService.fetchMySessions).mockResolvedValue([]);
    vi.mocked(settingsService.getMySettings).mockResolvedValue(null);
    vi.mocked(tiltProfileService.fetchTiltProfile).mockResolvedValue(null);
  });

  it('leaves loading then shows home with sign-in CTA', async () => {
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /create account \/ sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to current session/i })).toBeInTheDocument();
  });
});
