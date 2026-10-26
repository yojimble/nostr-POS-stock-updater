import { useNostr } from '@nostrify/react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { NPool } from '@nostrify/nostrify';

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

async function fetchUserRelayList(
  nostr: NPool,
  pubkey: string,
  configRelays: string[],
  signal?: AbortSignal,
): Promise<UserRelay[]> {
  const relays = [...new Set([...configRelays.filter(Boolean), ...DISCOVERY_RELAYS])];
  const events = await queryRelays(nostr, [{ kinds: [10002], authors: [pubkey], limit: 1 }], relays, { signal });
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
}

const relayListQuery = (nostr: NPool, pubkey: string, configRelays: string[]) => ({
  queryKey: ['nip65-relays', pubkey],
  queryFn: ({ signal }: { signal?: AbortSignal }) => fetchUserRelayList(nostr, pubkey, configRelays, signal),
});

/**
 * Relays to read a user's own events from: the configured relays plus the relays
 * the user publishes to (NIP-65 write/both). Their listings live on those, which
 * may not be among the configured relays. A failed lookup falls back to the configured ones.
 */
export async function relaysForUserEvents(
  queryClient: QueryClient,
  nostr: NPool,
  pubkey: string,
  configRelays: string[],
): Promise<string[]> {
  let mine: UserRelay[] = [];
  try {
    mine = await queryClient.fetchQuery({ ...relayListQuery(nostr, pubkey, configRelays), staleTime: 5 * 60_000 });
  } catch {
    // keep the configured relays
  }
  const writeRelays = mine.filter((r) => r.mode !== 'read').map((r) => r.url);
  return [...new Set([...configRelays.filter(Boolean), ...writeRelays])];
}

/** Reads the logged-in user's NIP-65 relay list (kind 10002). */
export function useUserRelayList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useQuery<UserRelay[]>({
    ...relayListQuery(nostr, user?.pubkey ?? '', config.relayUrls),
    enabled: !!user?.pubkey,
  });
}
