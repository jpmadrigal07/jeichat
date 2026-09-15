import { api } from '@/lib/api';

export async function fetchVapidPublicKey(ctx?: { signal?: AbortSignal }) {
  const { data } = await api.get<{ publicKey: string }>('/push/vapid-public-key', {
    signal: ctx?.signal,
  });
  return data.publicKey;
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { data } = await api.post<{ id: string }>('/push/subscribe', subscription);
  return data;
}

export async function deletePushSubscription(endpoint: string) {
  const { data } = await api.post<{ ok: true }>('/push/unsubscribe', { endpoint });
  return data;
}
