import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

import { useAppContext } from './useAppContext';
import { useCurrentUser } from './useCurrentUser';
import { queryRelays } from '@/lib/queryRelays';

// Relays that hold relay lists even when the user's own relays are down.
const DISCOVERY_RELAYS = ['wss://purplepag.es', 'wss://relay.nostr.band', 'wss://relay.damus.io'];

export interface UserRelay {
  url: string;
  /** NIP-65 marker: both when the entry has none. */
  mode: 'read' | 'write' | 'both';
}

/** Reads the logged-in user's NIP-65 relay list (kind 10002). */
export function useUserRelayList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useQuery<UserRelay[]>({
    queryKey: ['nip65-relays', user?.pubkey ?? ''],
    enabled: !!user?.pubkey,
    queryFn: async ({ signal }) => {
      const relays = [...new Set([...config.relayUrls.filter(Boolean), ...DISCOVERY_RELAYS])];
      const events = await queryRelays(nostr, [{ kinds: [10002], authors: [user!.pubkey], limit: 1 }], relays, { signal });
      const latest = events.sort((a, b) => b.created_at - a.created_at)[0];
      if (!latest) return [];

      const seen = new Set<string>();
      const list: UserRelay[] = [];
      for (const [tag, url, marker] of latest.tags) {
        if (tag !== 'r' || !url?.startsWith('wss://')) continue;
        const clean = url.replace(/\/+$/, '');
        if (seen.has(clean)) continue;
        seen.add(clean);
        list.push({ url: clean, mode: marker === 'read' || marker === 'write' ? marker : 'both' });
      }
      return list;
    },
  });
}
