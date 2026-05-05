import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BottomNav from '../../src/components/BottomNav.jsx';

describe('BottomNav (mobile shell)', () => {
  it('renders main tabs on home', () => {
    const navigate = vi.fn();
    render(<BottomNav screen="home" navigate={navigate} hasActiveSession={false} />);
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /session/i })).toBeInTheDocument();
  });

  it('hides during full-screen flows (paywall, tilt check, profile wizard)', () => {
    const navigate = vi.fn();
    const { container: c1 } = render(<BottomNav screen="paywall" navigate={navigate} hasActiveSession={false} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<BottomNav screen="tiltcheck" navigate={navigate} hasActiveSession />);
    expect(c2.firstChild).toBeNull();

    const { container: c3 } = render(<BottomNav screen="tiltprofile" navigate={navigate} hasActiveSession={false} />);
    expect(c3.firstChild).toBeNull();
  });

  it('calls navigate with tab id', async () => {
    const navigate = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<BottomNav screen="home" navigate={navigate} hasActiveSession={false} />);
    await user.click(screen.getByRole('button', { name: /insights/i }));
    expect(navigate).toHaveBeenCalledWith('insights');
  });
});
