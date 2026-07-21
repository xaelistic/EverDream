import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  stripAuthParamsFromUrl,
  urlHasAuthArtifacts,
  urlIndicatesPasswordRecovery,
} from './urlCleanup';

function setLocation(href: string) {
  const url = new URL(href);
  // jsdom location is limited — stub via history
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

describe('urlCleanup', () => {
  const original = window.location.href;

  beforeEach(() => {
    setLocation('https://everdream.n1g3.com/');
  });

  afterEach(() => {
    window.history.replaceState({}, '', original.replace(window.location.origin, '') || '/');
  });

  it('detects double-hash access_token leaks', () => {
    setLocation(
      'https://everdream.n1g3.com/#/#access_token=aaa&refresh_token=bbb&token_type=bearer',
    );
    expect(urlHasAuthArtifacts()).toBe(true);
  });

  it('detects standard hash tokens', () => {
    setLocation(
      'https://everdream.n1g3.com/#access_token=aaa&expires_in=3600&refresh_token=bbb&token_type=bearer',
    );
    expect(urlHasAuthArtifacts()).toBe(true);
  });

  it('detects PKCE code query', () => {
    setLocation('https://everdream.n1g3.com/?code=abc&state=xyz');
    expect(urlHasAuthArtifacts()).toBe(true);
  });

  it('strips tokens and lands on clean #/', () => {
    setLocation(
      'https://everdream.n1g3.com/#/#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xx&refresh_token=7jim&provider_token=ya29.x&token_type=bearer',
    );
    stripAuthParamsFromUrl();
    expect(window.location.hash).toBe('#/');
    expect(window.location.href).not.toContain('access_token');
    expect(window.location.href).not.toContain('refresh_token');
    expect(window.location.href).not.toContain('provider_token');
    expect(urlHasAuthArtifacts()).toBe(false);
  });

  it('preserves recovery route', () => {
    setLocation(
      'https://everdream.n1g3.com/?type=recovery#access_token=aaa&type=recovery&refresh_token=bbb',
    );
    expect(urlIndicatesPasswordRecovery()).toBe(true);
    stripAuthParamsFromUrl({ preserveRecovery: true });
    expect(window.location.hash).toBe('#/reset-password');
    expect(window.location.href).not.toContain('access_token');
  });

  it('strips PKCE query params', () => {
    setLocation('https://everdream.n1g3.com/?code=pkcecode&state=s&auth=callback');
    stripAuthParamsFromUrl();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#/');
  });
});
