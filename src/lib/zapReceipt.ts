import { finalizeEvent, generateSecretKey } from 'nostr-tools';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

type NostrRelayMsg = [string, ...unknown[]];

interface ReqPool {
  req(
    filters: NostrFilter[],
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<NostrRelayMsg>;
}

/**
 * Builds a NIP-57 zap request for an invoice the POS is about to display.
 *
 * Signed with the seller's own key, so sales are attributable to the shop — they
 * show up in Nostr clients as self-zaps. The signer must be set to auto-approve
 * kind 9734, or each charge waits on a manual approval.
 *
 * With `anonymous`, a throwaway key signs instead: nothing in NIP-57 requires a
 * particular signer, so the receipt still confirms the sale, but it isn't tied to
 * the shop's identity and needs no signer approval at all.
 *
 * The content is deliberately left empty either way. The order memo ("2x Coffee,
 * 1x Cake") would end up in the zap receipt's description tag, which is a public
 * event — the amount of a sale being visible is bad enough without itemising it.
 * The memo still reaches the seller's own wallet through the LNURL comment.
 */
export async function buildZapRequest(opts: {
  signer: { signEvent(t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>): Promise<NostrEvent> };
  recipientPubkey: string;
  sats: number;
  relays: string[];
  anonymous?: boolean;
}): Promise<NostrEvent> {
  const { signer, recipientPubkey, sats, relays, anonymous } = opts;

  const template = {
    kind: 9734,
    content: '',
    tags: [
      ['p', recipientPubkey],
      ['amount', String(Math.round(sats * 1000))],
      ['relays', ...relays],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };

  if (anonymous) {
    return finalizeEvent(template, generateSecretKey()) as unknown as NostrEvent;
  }

  return signer.signEvent(template);
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
