import type { NPool, NostrEvent, NostrFilter } from '@nostrify/nostrify';

/**
 * Queries every relay on its own and merges what comes back. Dead relays do not
 * hold up the page: once one relay has finished with events, any relay that has
 * not sent a single message within `silentMs` is dropped. A relay that is
 * answering, however slowly, is always waited for (up to `timeoutMs`).
 * `nostr.query` instead waits for every relay, so one dead relay stalls it until
 * the timeout.
 */
export async function queryRelays(
  nostr: NPool,
  filters: NostrFilter[],
  relays: string[],
  { signal, timeoutMs = 8000, silentMs = 4000 }: { signal?: AbortSignal; timeoutMs?: number; silentMs?: number } = {},
): Promise<NostrEvent[]> {
  const byId = new Map<string, NostrEvent>();
  const heard = new Set<string>();
  const controllers = new Map<string, AbortController>();
  let finished = 0;
  let dropTimer: ReturnType<typeof setTimeout> | undefined;

  // Start the countdown once a relay is done AND we have events. When it fires,
  // cut off only the relays that never said anything.
  const maybeStartDropTimer = () => {
    if (dropTimer || finished === 0 || byId.size === 0) return;
    dropTimer = setTimeout(() => {
      for (const [url, controller] of controllers) {
        if (!heard.has(url)) controller.abort();
      }
    }, silentMs);
  };

  await Promise.all(
    relays.map(async (url) => {
      const controller = new AbortController();
      controllers.set(url, controller);
      const signals = [controller.signal, AbortSignal.timeout(timeoutMs)];
      if (signal) signals.push(signal);
      try {
        for await (const msg of nostr.relay(url).req(filters, { signal: AbortSignal.any(signals) })) {
          heard.add(url);
          if (msg[0] === 'EVENT') {
            byId.set(msg[2].id, msg[2]);
            maybeStartDropTimer();
          }
          if (msg[0] === 'EOSE' || msg[0] === 'CLOSED') break;
        }
        finished++;
        maybeStartDropTimer();
      } catch {
        // timed out or unreachable: keep whatever this relay sent before that
      }
    }),
  );

  clearTimeout(dropTimer);
  return [...byId.values()];
}
