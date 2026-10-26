import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useAppContext } from './useAppContext';
import { useCurrentUser } from './useCurrentUser';
import { queryRelays } from '@/lib/queryRelays';
import { relaysForUserEvents } from './useUserRelayList';

export function useListing(d: string | undefined) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  return useQuery<NostrEvent | null>({
    queryKey: ['nip99-listing', user?.pubkey ?? '', d ?? ''],
    enabled: !!user?.pubkey && !!d,
    queryFn: async ({ signal }) => {
      const relays = await relaysForUserEvents(queryClient, nostr, user!.pubkey, config.relayUrls);
      const events = await queryRelays(
        nostr,
        [{ kinds: [30402], authors: [user!.pubkey], '#d': [d!], limit: 10 }],
        relays,
        { signal },
      );

      if (!events.length) return null;
      return events.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
    },
  });
}
