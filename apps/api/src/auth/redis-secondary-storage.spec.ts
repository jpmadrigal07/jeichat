import { createMemorySecondaryStorage } from './redis-secondary-storage';

describe('createMemorySecondaryStorage', () => {
  it('round-trips values and expires after ttl', async () => {
    const storage = createMemorySecondaryStorage();
    await storage.set('k', 'v', 1);
    expect(await storage.get('k')).toBe('v');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(await storage.get('k')).toBeNull();
  });

  it('deletes keys', async () => {
    const storage = createMemorySecondaryStorage();
    await storage.set('k', 'v');
    await storage.delete('k');
    expect(await storage.get('k')).toBeNull();
  });
});
