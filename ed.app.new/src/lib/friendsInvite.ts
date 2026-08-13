export function inviteLandingUrl(token: string): string {
  if (typeof window === 'undefined') return `https://everdream.n1g3.com/?invite=${token}#/`;
  return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(token)}#/`;
}

export function inviteMessage(displayName: string, url: string): string {
  const who = displayName.trim() || 'A friend';
  return `${who} invited you to EverDream — journal and share dreams together.\n${url}`;
}
