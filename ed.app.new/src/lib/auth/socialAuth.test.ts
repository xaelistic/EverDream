import { describe, it, expect } from 'vitest';
import { getOAuthScopes } from './socialAuth';

describe('socialAuth', () => {
  it('requests Meta scopes needed for page and Instagram publish', () => {
    const scopes = getOAuthScopes('meta');
    expect(scopes).toContain('pages_manage_posts');
    expect(scopes).toContain('instagram_content_publish');
  });

  it('requests Google openid scopes', () => {
    expect(getOAuthScopes('google')).toContain('openid');
  });
});