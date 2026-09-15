export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isSafariBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|OPiOS|OPT\//i.test(ua)
  );
}

export function isMacSafari() {
  if (typeof navigator === 'undefined') return false;
  return (
    isSafariBrowser() &&
    !isIosDevice() &&
    /Macintosh|Mac OS X/i.test(navigator.userAgent)
  );
}
