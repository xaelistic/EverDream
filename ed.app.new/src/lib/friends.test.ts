import { describe, expect, it } from 'vitest';
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
