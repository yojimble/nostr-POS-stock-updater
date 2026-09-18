/** Minimal LNURL-pay (LUD-06/16) + LUD-21 verify client. */

export interface LnurlPayParams {
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
  commentAllowed?: number;
  tag: string;
  /** NIP-57: set when the provider will publish zap receipts for paid invoices. */
  allowsNostr?: boolean;
  nostrPubkey?: string;
}

export interface LnurlInvoice {
  pr: string;
  verify?: string;
}

function lud16ToUrl(address: string): string {
  const [name, domain] = address.split('@');
  if (!name || !domain) throw new Error('Invalid lightning address');
  return `https://${domain}/.well-known/lnurlp/${name}`;
}

export async function resolveLnurlp(lightningAddress: string, signal?: AbortSignal): Promise<LnurlPayParams> {
  const url = lud16ToUrl(lightningAddress);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Lightning address not found');
  const data = await res.json();
  if (data.tag !== 'payRequest' || !data.callback) {
    throw new Error('Address does not support LNURL-pay');
  }
  return data as LnurlPayParams;
}

export async function requestInvoice(
  params: LnurlPayParams,
  sats: number,
  comment?: string,
  signal?: AbortSignal,
  /** NIP-57 zap request. When given, the provider publishes a zap receipt on payment. */
  zapRequest?: unknown,
): Promise<LnurlInvoice> {
  const msats = Math.round(sats * 1000);
  if (msats < params.minSendable || msats > params.maxSendable) {
    throw new Error('Amount is outside the allowed range for this lightning address');
  }

  const url = new URL(params.callback);
  url.searchParams.set('amount', String(msats));
  if (comment && params.commentAllowed && params.commentAllowed > 0) {
    url.searchParams.set('comment', comment.slice(0, params.commentAllowed));
  }
  if (zapRequest) {
    url.searchParams.set('nostr', JSON.stringify(zapRequest));
  }

  const res = await fetch(url.toString(), { signal });
  const data = await res.json();
  if (data.status === 'ERROR' || !data.pr) {
    throw new Error(data.reason || 'Failed to create invoice');
  }
  return { pr: data.pr as string, verify: data.verify as string | undefined };
}

/**
 * LUD-21 verify. Throws when the endpoint can't be reached or answers badly, so
 * callers can tell "not paid yet" (false) apart from "we have no idea" (throw) —
 * silently treating an unreachable endpoint as unpaid leaves a paid invoice
 * spinning forever.
 */
export async function verifyInvoice(verifyUrl: string, signal?: AbortSignal): Promise<boolean> {
  const res = await fetch(verifyUrl, {
    signal: signal ?? AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Verify endpoint returned ${res.status}`);
  const data = await res.json();
  if (data.status === 'ERROR') throw new Error(data.reason || 'Verify endpoint returned an error');
  // LUD-21 specifies `settled`; some wallets send `paid` instead.
  return Boolean(data.settled ?? data.paid);
}

interface WebLNProvider {
  enable(): Promise<void>;
  sendPayment(invoice: string): Promise<unknown>;
}

export function getWebLn(): WebLNProvider | undefined {
  return (window as unknown as { webln?: WebLNProvider }).webln;
}
