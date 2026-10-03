type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/**
 * Shows a screen-share tile full screen on whatever the browser supports:
 * - the standard API (desktop, Android) on the whole tile, then landscape on phones;
 * - the prefixed API (older iPad Safari);
 * - iPhone Safari can't full-screen elements at all, only a `<video>` through
 *   its native player, so fall back to that.
 *
 * Returns false when nothing worked, so the caller can tell the user.
 * Must run inside a tap/click handler: browsers require a user gesture.
 */
export async function enterFullscreen(tile: HTMLElement): Promise<boolean> {
  if (document.fullscreenEnabled && typeof tile.requestFullscreen === 'function') {
    try {
      await tile.requestFullscreen();
      await lockLandscape();
      return true;
    } catch {
      // Fall through to the WebKit options below.
    }
  }

  const webkitTile = tile as WebkitElement;
  if (typeof webkitTile.webkitRequestFullscreen === 'function') {
    webkitTile.webkitRequestFullscreen();
    return true;
  }

  const video = tile.querySelector<WebkitVideo>('video');
  if (video && typeof video.webkitEnterFullscreen === 'function') {
    video.webkitEnterFullscreen();
    return true;
  }

  return false;
}

/** Screens are usually wider than tall; turn the phone sideways when allowed. */
async function lockLandscape() {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: 'landscape') => Promise<void>;
  };
  try {
    await orientation.lock?.('landscape');
  } catch {
    // Desktop browsers and some phones refuse; staying as-is is fine.
  }
}
