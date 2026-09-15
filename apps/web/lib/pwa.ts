const SERVICE_WORKER_URL = '/sw.js';

let registering: Promise<ServiceWorkerRegistration | null> | null = null;
let installEventsBound = false;
let deferredPrompt: PwaInstallPromptEvent | null = null;
const SERVER_SNAPSHOT: PwaInstallState = {
  canInstall: false,
  installed: false,
};

let snapshot: PwaInstallState = SERVER_SNAPSHOT;

const listeners = new Set<() => void>();

export type PwaInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type PwaInstallState = {
  canInstall: boolean;
  installed: boolean;
};

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  if (!registering) {
    registering = navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { updateViaCache: 'none' })
      .catch(() => null);
  }

  return registering;
}

export function listenForPwaInstallPrompt() {
  if (typeof window === 'undefined' || installEventsBound) return;
  installEventsBound = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as PwaInstallPromptEvent;
    emitInstallChange();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emitInstallChange();
  });

  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  standaloneQuery.addEventListener('change', emitInstallChange);
  emitInstallChange();
}

export function subscribePwaInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPwaInstallState(): PwaInstallState {
  return snapshot;
}

export function getPwaInstallServerSnapshot(): PwaInstallState {
  return SERVER_SNAPSHOT;
}

export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return 'unavailable';

  deferredPrompt = null;
  emitInstallChange();

  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  emitInstallChange();
  return outcome;
}

function isPwaInstalled() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
    return true;
  }
  return navigator.standalone === true;
}

function emitInstallChange() {
  const next: PwaInstallState = {
    canInstall: Boolean(deferredPrompt) && !isPwaInstalled(),
    installed: isPwaInstalled(),
  };
  if (
    next.canInstall === snapshot.canInstall &&
    next.installed === snapshot.installed
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) listener();
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

if (typeof window !== 'undefined') {
  listenForPwaInstallPrompt();
}
