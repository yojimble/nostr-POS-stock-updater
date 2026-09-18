import { useQuery } from '@tanstack/react-query';

import { resolveLnurlp, requestInvoice } from '@/lib/lightning';

export interface PaymentSupport {
  /** The provider publishes NIP-57 zap receipts for paid invoices. */
  zaps: boolean;
  /** The provider issues LUD-21 verify URLs the app can poll. */
  verify: boolean;
}

/**
 * Reports how (or whether) this seller's lightning address can confirm payment
 * automatically, so the till can say so plainly instead of asking the shopkeeper
 * to inspect LNURL endpoints by hand.
 *
 * Checking `verify` means asking for a real invoice. That's free and harmless —
 * an unpaid invoice simply expires — but it's cached for an hour so setting up
 * the till doesn't hammer the provider.
 */
export function usePaymentSupport(lightningAddress: string | undefined) {
  return useQuery<PaymentSupport>({
    queryKey: ['payment-support', lightningAddress ?? ''],
    enabled: !!lightningAddress,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async ({ signal }) => {
      const params = await resolveLnurlp(lightningAddress!, signal);
      const zaps = Boolean(params.allowsNostr && params.nostrPubkey);

      // Probe with the smallest amount the provider will accept.
      const sats = Math.max(1, Math.ceil(params.minSendable / 1000));
      const invoice = await requestInvoice(params, sats, undefined, signal);

      return { zaps, verify: Boolean(invoice.verify) };
    },
  });
}
