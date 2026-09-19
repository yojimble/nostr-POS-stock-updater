/** Key for the "anonymous zap receipts" setting, shared by the settings sheet and the till. */
export const ANON_ZAPS_KEY = 'nostr:pos-anon-zaps';

/**
 * Reads the setting at the moment it's needed rather than holding it in state.
 * It's changed in the settings sheet and used in the payment dialog — two
 * separate `useLocalStorage` instances don't see each other's writes within a
 * tab, so a cached copy could be a toggle behind.
 */
export function anonymousZapsEnabled(): boolean {
  try {
    return localStorage.getItem(ANON_ZAPS_KEY) === 'true';
  } catch {
    return false;
  }
}
