import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultScreen from '../../src/screens/ResultScreen.jsx';
import { runTiltCheck } from '../../src/utils/tiltDetection.js';

describe('ResultScreen', () => {
  const session = {
    startTime: Date.now() - 20 * 60 * 1000,
    netBuyIns: 0,
    buyInsLost: 0,
    events: [],
    checks: [],
    preSessionState: null,
  };

  it('renders tilt score from lastResult', () => {
    const lastResult = runTiltCheck({
      rushingDecisions: 5,
      playingLooser: 5,
      frustrationLevel: 5,
      chasingLosses: 5,
      selfCriticism: 5,
      session,
      accumulatedTilt: { level: 'none' },
      tiltProfile: null,
    });
    render(
      <ResultScreen
        lastResult={lastResult}
        continueSession={vi.fn()}
        requestEndSession={vi.fn()}
        hasPremium={false}
        onUnlockPremium={vi.fn()}
      />,
    );
    expect(screen.getByText(new RegExp(`${lastResult.score} / 100`))).toBeInTheDocument();
  });

  it('continue and end call handlers', async () => {
    const lastResult = runTiltCheck({
      rushingDecisions: 1,
      playingLooser: 1,
      frustrationLevel: 1,
      chasingLosses: 1,
      selfCriticism: 1,
      session,
      accumulatedTilt: { level: 'none' },
      tiltProfile: null,
    });
    const continueSession = vi.fn();
    const requestEndSession = vi.fn();
    const user = userEvent.setup();
    render(
      <ResultScreen
        lastResult={lastResult}
        continueSession={continueSession}
        requestEndSession={requestEndSession}
        hasPremium={false}
        onUnlockPremium={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /back to session/i }));
    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(continueSession).toHaveBeenCalledTimes(1);
    expect(requestEndSession).toHaveBeenCalledTimes(1);
  });
});
