import { verifyEvent } from 'nostr-tools';
import type { NostrSigner } from '@nostrify/nostrify';

/**
 * Kind of the throwaway event the till asks the owner's signer (Amber) to sign
 * before it will log out or change account. It is never published.
 *
 * It is deliberately NOT in the permission list requested at login, so the
 * signer cannot approve it ahead of time: the owner is asked each time.
 */
export const OWNER_APPROVAL_KIND = 22900;

export type OwnerAction = 'log out' | 'switch account' | 'add account';

/**
 * Resolves only if the signer signs the approval request, i.e. the owner tapped
 * approve. Rejects if they decline, never answer, or the signature is not valid.
 */
export async function requireOwnerApproval(signer: NostrSigner, action: OwnerAction): Promise<void> {
  const pubkey = await signer.getPublicKey();
  const event = await signer.signEvent({
    kind: OWNER_APPROVAL_KIND,
    content: `Approve: ${action} on a staff device`,
    tags: [['action', action]],
    created_at: Math.floor(Date.now() / 1000),
  });

  if (event.pubkey !== pubkey || !verifyEvent(event)) {
    throw new Error('The signer did not approve this request.');
  }
}
