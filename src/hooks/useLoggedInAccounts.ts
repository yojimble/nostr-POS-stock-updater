import { useNostr } from '@nostrify/react';
import { useNostrLogin } from '@nostrify/react/login';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NSchema as n, NostrEvent, NostrMetadata } from '@nostrify/nostrify';

import { useAppContext } from './useAppContext';
import { queryRelays } from '@/lib/queryRelays';
import { relaysForUserEvents } from './useUserRelayList';

export interface Account {
  id: string;
  pubkey: string;
  event?: NostrEvent;
  metadata: NostrMetadata;
}

export function useLoggedInAccounts() {
  const { nostr } = useNostr();
  const { logins, setLogin, removeLogin } = useNostrLogin();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  const { data: authors = [] } = useQuery({
    queryKey: ['logins', logins.map((l) => l.id).join(';')],
    queryFn: async ({ signal }) => {
      const relayLists = await Promise.all(
        logins.map((l) => relaysForUserEvents(queryClient, nostr, l.pubkey, config.relayUrls)),
      );
      const relays = [...new Set(relayLists.flat())];
      const events = await queryRelays(
        nostr,
        [{ kinds: [0], authors: logins.map((l) => l.pubkey) }],
        relays,
        { signal },
      );

      return logins.map(({ id, pubkey }): Account => {
        const event = events
          .filter((e) => e.pubkey === pubkey)
          .sort((a, b) => b.created_at - a.created_at)[0];
        try {
          const metadata = n.json().pipe(n.metadata()).parse(event?.content);
          return { id, pubkey, metadata, event };
        } catch {
          return { id, pubkey, metadata: {}, event };
        }
      });
    },
    retry: 3,
  });

  // Current user is the first login
  const currentUser: Account | undefined = (() => {
    const login = logins[0];
    if (!login) return undefined;
    const author = authors.find((a) => a.id === login.id);
    return { metadata: {}, ...author, id: login.id, pubkey: login.pubkey };
  })();

  // Other users are all logins except the current one
  const otherUsers = (authors || []).slice(1) as Account[];

  return {
    authors,
    currentUser,
    otherUsers,
    setLogin,
    removeLogin,
  };
}