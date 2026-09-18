import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

import { usePaymentSupport } from '@/hooks/usePaymentSupport';
import { cn } from '@/lib/utils';

interface PaymentSupportBadgeProps {
  lightningAddress: string | undefined;
  className?: string;
}

/**
 * Tells the shopkeeper, in plain words, whether sales on this lightning address
 * confirm themselves or need someone to check the wallet and tap "I've been paid".
 * Worth knowing before handing the till to staff who can't see the owner's wallet.
 */
export function PaymentSupportBadge({ lightningAddress, className }: PaymentSupportBadgeProps) {
  const { data, isLoading, isError } = usePaymentSupport(lightningAddress);

  if (!lightningAddress) {
    return (
      <p className={cn('text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5', className)}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        No lightning address on your profile — add one (lud16) to take payments.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className={cn('text-xs text-muted-foreground flex items-center gap-1.5', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Checking how {lightningAddress} confirms payments…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p className={cn('text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5', className)}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Couldn't reach {lightningAddress}. Payments may need confirming by hand.
      </p>
    );
  }

  const automatic = data.verify || data.zaps;
  const how = data.verify && data.zaps
    ? 'two ways, so one can fail'
    : data.verify
      ? 'by checking your wallet'
      : 'by Nostr zap receipt';

  if (automatic) {
    return (
      <p className={cn('text-xs text-muted-foreground flex items-center gap-1.5', className)}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        Sales confirm automatically — {how}.
      </p>
    );
  }

  return (
    <p className={cn('text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5', className)}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>
        {lightningAddress} can't confirm sales automatically. Every payment will need
        checking in your wallet before tapping "I've been paid" — consider an address
        from Alby, Blink or Coinos if staff will use this till.
      </span>
    </p>
  );
}
