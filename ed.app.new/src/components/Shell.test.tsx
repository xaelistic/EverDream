import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Shell from './Shell';

vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({ profile: null, loading: false }),
}));

vi.mock('../contexts/SkinContext', () => ({
  useSkinFull: () => ({ isThemed: false }),
}));

describe('Shell', () => {
  it('navigates home when the moon or app name is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <Shell active="tracker" onNavigate={onNavigate} onOpenProfile={vi.fn()}>
        <div>child</div>
      </Shell>,
    );

    fireEvent.click(screen.getByRole('button', { name: /go to home/i }));
    expect(onNavigate).toHaveBeenCalledWith('home');
  });
});
