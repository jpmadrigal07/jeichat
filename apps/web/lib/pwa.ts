const SERVICE_WORKER_URL = '/sw.js';

let registering: Promise<ServiceWorkerRegistration | null> | null = null;

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
