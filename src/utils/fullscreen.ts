/**
 * Cross-browser Fullscreen API Utilities
 * Safely handles standard and vendor-prefixed Fullscreen APIs (WebKit, Mozilla, MS)
 * with robust error handling for both Promise and void return types.
 */

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
    (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
    (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement
  );
}

export function requestFullscreenSafe(element?: Element): void {
  if (typeof document === 'undefined') return;
  const target = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      const res = target.requestFullscreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } else if ((target as unknown as { webkitRequestFullscreen?: () => Promise<void> | void }).webkitRequestFullscreen) {
      const res = (target as unknown as { webkitRequestFullscreen: () => Promise<void> | void }).webkitRequestFullscreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } else if ((target as unknown as { mozRequestFullScreen?: () => Promise<void> | void }).mozRequestFullScreen) {
      const res = (target as unknown as { mozRequestFullScreen: () => Promise<void> | void }).mozRequestFullScreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } else if ((target as unknown as { msRequestFullscreen?: () => Promise<void> | void }).msRequestFullscreen) {
      const res = (target as unknown as { msRequestFullscreen: () => Promise<void> | void }).msRequestFullscreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    }
  } catch {
    // Protect against synchronous exceptions in unsupported environments
  }
}

export function exitFullscreenSafe(): void {
  if (typeof document === 'undefined') return;

  try {
    if (document.exitFullscreen) {
      const res = document.exitFullscreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> | void }).webkitExitFullscreen) {
      const res = (document as unknown as { webkitExitFullscreen: () => Promise<void> | void }).webkitExitFullscreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } else if ((document as unknown as { mozCancelFullScreen?: () => Promise<void> | void }).mozCancelFullScreen) {
      const res = (document as unknown as { mozCancelFullScreen: () => Promise<void> | void }).mozCancelFullScreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } else if ((document as unknown as { msExitFullscreen?: () => Promise<void> | void }).msExitFullscreen) {
      const res = (document as unknown as { msExitFullscreen: () => Promise<void> | void }).msExitFullscreen();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    }
  } catch {
    // Protect against synchronous exceptions in unsupported environments
  }
}

export function toggleFullscreenSafe(element?: Element): void {
  if (isFullscreenActive()) {
    exitFullscreenSafe();
  } else {
    requestFullscreenSafe(element);
  }
}
