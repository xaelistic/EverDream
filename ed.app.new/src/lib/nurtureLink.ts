/**
 * Beta nurture links share the app's morning path.
 * Capture opens the record screen. Picture opens the journal.
 * The query is stored before login can wipe the hash, then shown once.
 */

const NURTURE_LINK_KEY = 'ed_nurture_link';

export const NURTURE_STEPS = ['welcome', 'capture', 'picture', 'circle'] as const;
export type NurtureStep = (typeof NURTURE_STEPS)[number];

export function nurtureArrivalMessage(step: NurtureStep): string {
  switch (step) {
    case 'capture':
      return 'Dream Capture. Share your dream or skip for now.';
    case 'picture':
      return 'Give one night a picture.';
    case 'circle':
      return 'What should we keep?';
    case 'welcome':
      return 'You’re on the beta list.';
  }
}

function asStep(value: string | null): NurtureStep | null {
  if (value === 'welcome' || value === 'capture' || value === 'picture' || value === 'circle') {
    return value;
  }
  return null;
}

function parseHashNurture(): NurtureStep | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return null;
  return asStep(new URLSearchParams(hash.slice(qIndex + 1)).get('nurture'));
}

function stripNurtureParamFromHash(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex < 0) return;
  const path = hash.slice(0, qIndex);
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  if (!params.has('nurture')) return;
  params.delete('nurture');
  const rest = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${path}${rest ? `?${rest}` : ''}`,
  );
}

function writeNurtureLink(step: NurtureStep | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!step) {
      sessionStorage.removeItem(NURTURE_LINK_KEY);
      return;
    }
    sessionStorage.setItem(NURTURE_LINK_KEY, step);
  } catch {
    /* private mode */
  }
}

export function readNurtureLink(): NurtureStep | null {
  if (typeof window === 'undefined') return null;
  try {
    return asStep(sessionStorage.getItem(NURTURE_LINK_KEY));
  } catch {
    return null;
  }
}

/** Persist ?nurture= so login or OAuth does not drop a letter link. Leaves plan and pack. */
export function captureNurtureLink(): NurtureStep | null {
  const fromHash = parseHashNurture();
  if (fromHash) {
    writeNurtureLink(fromHash);
    stripNurtureParamFromHash();
    return fromHash;
  }
  return readNurtureLink();
}

/** Read the stored letter once. Opening the link does not complete the email step. */
export function consumeNurtureLink(): NurtureStep | null {
  const step = readNurtureLink();
  if (step) writeNurtureLink(null);
  return step;
}
