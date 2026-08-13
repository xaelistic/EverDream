/** Stable code matching public.profiles.friend_code (DREAM- + first 6 hex of profile id). */
export function friendCodeFromProfileId(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return hex ? `DREAM-${hex}` : '';
}

export function looksLikeFriendCode(value: string): boolean {
  return /^dream-?[a-z0-9]{4,}$/i.test(value.trim().replace(/\s+/g, ''));
}
