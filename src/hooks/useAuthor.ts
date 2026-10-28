import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppContext } from './useAppContext';
import { queryRelays } from '@/lib/queryRelays';
import { relaysForUserEvents } from './useUserRelayList';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      const relays = await relaysForUserEvents(queryClient, nostr, pubkey, config.relayUrls);
      const events = await queryRelays(nostr, [{ kinds: [0], authors: [pubkey], limit: 1 }], relays, { signal });
      const event = events.sort((a, b) => b.created_at - a.created_at)[0];

      if (!event) {
        throw new Error('No event found');
      }

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        return { metadata, event };
      } catch {
        return { event };
      }
    },
    retry: 3,
  });
}
