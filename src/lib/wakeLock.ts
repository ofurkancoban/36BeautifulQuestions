import { useEffect } from 'react';

/**
 * Keeps the screen awake while the ritual is open, so a phone lying on the table
 * (for example during the four silent minutes) does not lock and drop the connection.
 * The browser releases the lock whenever the page is hidden, so it is re-acquired on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (disposed) void sentinel.release();
      } catch {
        /* denied (low battery, unsupported context); the app still works */
      }
    };

    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    // Some browsers only grant the lock after a user gesture.
    window.addEventListener('pointerdown', onVisible, { passive: true });
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
