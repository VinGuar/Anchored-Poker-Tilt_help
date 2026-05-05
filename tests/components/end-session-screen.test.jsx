import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EndSessionScreen from '../../src/screens/EndSessionScreen.jsx';

describe('EndSessionScreen', () => {
  it('submits note to onSaveAndEnd', async () => {
    const onSaveAndEnd = vi.fn();
    const user = userEvent.setup();
    render(
      <EndSessionScreen onSaveAndEnd={onSaveAndEnd} onSkip={vi.fn()} onBack={vi.fn()} />,
    );
    await user.type(screen.getByPlaceholderText(/rushed after two losses/i), '  My note  ');
    await user.click(screen.getByRole('button', { name: /save note and end session/i }));
    expect(onSaveAndEnd).toHaveBeenCalledWith('  My note  ');
  });

  it('skip ends with empty flow', async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(
      <EndSessionScreen onSaveAndEnd={vi.fn()} onSkip={onSkip} onBack={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /end without note/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
