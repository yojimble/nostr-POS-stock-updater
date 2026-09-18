import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

type NostrRelayMsg = [string, ...unknown[]];

interface ReqPool {
  req(
    filters: NostrFilter[],
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<NostrRelayMsg>;
}

/**
 * Builds a NIP-57 zap request for an invoice the POS is about to display,
 * signed with the seller's own key so the zaps are attributable to the shop.
 *
 * The signer must be set to auto-approve kind 9734, or each charge waits on a
 * manual approval — part of setting the till up before handing it to staff.
 */
export async function buildZapRequest(opts: {
  signer: { signEvent(t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>): Promise<NostrEvent> };
  recipientPubkey: string;
  sats: number;
  relays: string[];
  comment?: string;
}): Promise<NostrEvent> {
  const { signer, recipientPubkey, sats, relays, comment } = opts;

  return signer.signEvent({
    kind: 9734,
    content: comment ?? '',
    tags: [
      ['p', recipientPubkey],
      ['amount', String(Math.round(sats * 1000))],
      ['relays', ...relays],
    ],
    created_at: Math.floor(Date.now() / 1000),
  });
}

function tagValue(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([t]) => t === name)?.[1];
}

/**
 * Waits for the zap receipt (kind 9735) the wallet's zapper service publishes
 * once `invoice` is paid. Matching is on the bolt11 tag, not the amount — an
 * unrelated zap arriving mid-sale must not be mistaken for this payment.
 *
 * Resolves undefined if the signal aborts before a receipt arrives.
 */
export async function waitForZapReceipt(opts: {
  pool: ReqPool;
  recipientPubkey: string;
  invoice: string;
  since: number;
  signal: AbortSignal;
}): Promise<NostrEvent | undefined> {
  const { pool, recipientPubkey, invoice, since, signal } = opts;
  const wanted = invoice.toLowerCase();

  try {
    for await (const msg of pool.req([{ kinds: [9735], '#p': [recipientPubkey], since }], { signal })) {
      if (msg[0] !== 'EVENT') continue;
      const event = msg[2] as NostrEvent;
      if (tagValue(event, 'bolt11')?.toLowerCase() === wanted) {
        return event;
      }
    }
  } catch {
    // Abort or relay failure — the caller's other confirmation paths still stand.
  }
  return undefined;
}
