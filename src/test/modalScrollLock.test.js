import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireModalScrollLock } from '../components/ui/modalScrollLock';

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('modal background scroll lock', () => {
  it('locks document and body scrolling, then restores previous styles and scroll position', () => {
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.overscrollBehavior = 'contain';
    document.body.style.overflow = 'scroll';
    document.body.style.position = 'relative';
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    const release = acquireModalScrollLock();

    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-240px');

    release();

    expect(document.documentElement.style.overflow).toBe('auto');
    expect(document.documentElement.style.overscrollBehavior).toBe('contain');
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.position).toBe('relative');
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });

  it('keeps the background locked until every open modal has closed', () => {
    const releaseFirstModal = acquireModalScrollLock();
    const releaseSecondModal = acquireModalScrollLock();

    releaseFirstModal();
    expect(document.body.style.overflow).toBe('hidden');

    releaseSecondModal();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
