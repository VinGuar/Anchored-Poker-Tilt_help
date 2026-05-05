import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import PaywallScreen from '../../src/screens/PaywallScreen.jsx';

function PaywallHarness({ onUpgrade, onRestore, onBack }) {
  const [pkg, setPkg] = useState('monthly');
  return (
    <PaywallScreen
      source="premium"
      onUpgrade={onUpgrade}
      onRestore={onRestore}
      onBack={onBack}
      selectedPackageId={pkg}
      onSelectPackage={setPkg}
    />
  );
}

describe('PaywallScreen', () => {
  it('shows contextual copy for tilt check limit', () => {
    render(
      <PaywallScreen
        source="tilt_check_limit"
        onUpgrade={vi.fn()}
        onRestore={vi.fn()}
        onBack={vi.fn()}
        canSkip
      />,
    );
    expect(screen.getByText(/free saved check today/i)).toBeInTheDocument();
  });

  it('invokes onUpgrade with selected package', async () => {
    const onUpgrade = vi.fn();
    const user = userEvent.setup();
    render(<PaywallHarness onUpgrade={onUpgrade} onRestore={vi.fn()} onBack={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /yearly/i }));
    await user.click(screen.getByRole('button', { name: /free trial/i }));
    expect(onUpgrade).toHaveBeenCalledWith('yearly');
  });

  it('calls onRestore from footer', async () => {
    const onRestore = vi.fn();
    const user = userEvent.setup();
    render(
      <PaywallScreen
        source="premium"
        onUpgrade={vi.fn()}
        onRestore={onRestore}
        onBack={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^restore$/i }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});
