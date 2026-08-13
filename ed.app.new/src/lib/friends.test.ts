import { describe, expect, it } from 'vitest';
import { friendCodeFromProfileId, looksLikeFriendCode } from './friendCode';
import { inviteMessage } from './friendsInvite';

describe('friend invites', () => {
  it('builds a shareable invite that includes the landing URL', () => {
    const url = 'https://everdream.n1g3.com/?invite=abc123#/';
    const text = inviteMessage('Ada', url);
    expect(text).toContain('Ada');
    expect(text).toContain(url);
    expect(text.toLowerCase()).toContain('everdream');
  });
});

describe('friend codes', () => {
  it('derives the same DREAM- code the database stores', () => {
    expect(friendCodeFromProfileId('26a980bf-746c-4998-a24b-b08fd082190a')).toBe('DREAM-26A980');
    expect(friendCodeFromProfileId('73772175-0c92-428f-a5d5-6cb195b3c932')).toBe('DREAM-737721');
    expect(friendCodeFromProfileId('01cf9fac-264e-4cb0-b175-d0fc5152afc9')).toBe('DREAM-01CF9F');
    expect(friendCodeFromProfileId('')).toBe('');
  });

  it('recognises pasted friend codes and rejects usernames', () => {
    expect(looksLikeFriendCode('DREAM-26A980')).toBe(true);
    expect(looksLikeFriendCode('dream-01cf9f')).toBe(true);
    expect(looksLikeFriendCode('nigel_russell')).toBe(false);
    expect(looksLikeFriendCode('ab')).toBe(false);
  });
});
