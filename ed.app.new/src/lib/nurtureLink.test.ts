import { afterEach, describe, expect, it } from 'vitest';
import {
  captureNurtureLink,
  consumeNurtureLink,
  nurtureArrivalMessage,
  readNurtureLink,
} from './nurtureLink';

afterEach(() => {
  consumeNurtureLink();
  window.history.replaceState(null, '', '/');
  window.location.hash = '';
});

describe('nurture letter links', () => {
  it('keeps a capture link through hash cleanup and opens the dream prompt copy', () => {
    window.location.hash = '#/record?nurture=capture';
    expect(captureNurtureLink()).toBe('capture');
    expect(readNurtureLink()).toBe('capture');
    expect(window.location.hash.includes('nurture=')).toBe(false);
    expect(window.location.hash.startsWith('#/record')).toBe(true);
    expect(nurtureArrivalMessage('capture')).toBe('Dream Capture. Share your dream or skip for now.');
  });

  it('leaves a checkout plan on the hash', () => {
    window.location.hash = '#/record?nurture=picture&plan=plus';
    captureNurtureLink();
    expect(window.location.hash).toContain('plan=plus');
    expect(window.location.hash.includes('nurture=')).toBe(false);
    expect(readNurtureLink()).toBe('picture');
  });

  it('survives a later hash wipe the way OAuth cleanup does', () => {
    window.location.hash = '#/?nurture=welcome';
    captureNurtureLink();
    window.history.replaceState(null, '', '/#/');
    expect(readNurtureLink()).toBe('welcome');
    expect(consumeNurtureLink()).toBe('welcome');
    expect(consumeNurtureLink()).toBeNull();
  });

  it('ignores an unknown nurture value', () => {
    window.location.hash = '#/journal?nurture=upgrade';
    expect(captureNurtureLink()).toBeNull();
    expect(window.location.hash).toContain('nurture=upgrade');
  });

  it('uses the picture and stay lines from the letters', () => {
    expect(nurtureArrivalMessage('picture')).toBe('Give one night a picture.');
    expect(nurtureArrivalMessage('circle')).toBe('What should we keep?');
    expect(nurtureArrivalMessage('welcome')).toBe('You’re on the beta list.');
  });
});
