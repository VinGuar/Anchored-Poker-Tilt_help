import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeScreen from '../../src/screens/HomeScreen.jsx';

describe('HomeScreen', () => {
  it('shows guest CTA when logged out', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(
      <HomeScreen
        sessions={[]}
        startSession={vi.fn()}
        accumulatedTilt={{ level: 'none' }}
        hasPremium={false}
        navigate={navigate}
        tiltProfileReport={null}
        user={null}
        openPaywall={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(navigate).toHaveBeenCalledWith('auth');
  });

  it('computes tilt rate from sessions with checks', () => {
    const sessions = [
      { checks: [{ result: { status: 'tilt' } }] },
      { checks: [{ result: { status: 'clear' } }] },
    ];
    render(
      <HomeScreen
        sessions={sessions}
        startSession={vi.fn()}
        accumulatedTilt={{ level: 'none' }}
        hasPremium
        navigate={vi.fn()}
        tiltProfileReport={{ profileType: 'X', riskBand: 'Low' }}
        user={{ id: 'u1' }}
        openPaywall={vi.fn()}
      />,
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
