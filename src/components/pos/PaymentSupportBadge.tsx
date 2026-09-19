import { AlertTriangle } from 'lucide-react';

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
        No lightning address on your profile.
      </p>
    );
  }

  if (isLoading) return null;

  if (isError || !data) {
    return (
      <p className={cn('text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5', className)}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Couldn't reach {lightningAddress}.
      </p>
    );
  }

  // Silent when confirmation works; this only speaks up when it doesn't.
  if (data.verify || data.zaps) return null;

  return (
    <p className={cn('text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5', className)}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{lightningAddress} can't confirm payments automatically.</span>
    </p>
  );
}
