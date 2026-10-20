import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NostrSigner } from '@nostrify/nostrify';

// Signature maths is not what is under test, so the check is stubbed.
const verifyEvent = vi.fn(() => true);
vi.mock('nostr-tools', () => ({ verifyEvent: (...args: unknown[]) => verifyEvent(...(args as [])) }));

import { OWNER_APPROVAL_KIND, requireOwnerApproval } from './ownerApproval';

const OWNER = 'a'.repeat(64);

// A signer that "signs" by filling in the missing fields.
const fakeSigner = (overrides: Partial<NostrSigner> = {}, pubkey = OWNER): NostrSigner => ({
  getPublicKey: async () => OWNER,
  signEvent: async (t) => ({ ...t, id: 'id', pubkey, sig: 'sig' }),
  ...overrides,
});

describe('requireOwnerApproval', () => {
  beforeEach(() => verifyEvent.mockReturnValue(true));

  it('resolves when the signer signs the request', async () => {
    await expect(requireOwnerApproval(fakeSigner(), 'log out')).resolves.toBeUndefined();
  });

  it('asks for the approval kind with the action in the content', async () => {
    const signEvent = vi.fn(async (t) => ({ ...t, id: 'id', pubkey: OWNER, sig: 'sig' }));
    await requireOwnerApproval(fakeSigner({ signEvent }), 'switch account');
    expect(signEvent).toHaveBeenCalledOnce();
    const asked = signEvent.mock.calls[0][0];
    expect(asked.kind).toBe(OWNER_APPROVAL_KIND);
    expect(asked.content).toContain('switch account');
  });

  it('rejects when the owner declines', async () => {
    const signer = fakeSigner({ signEvent: () => Promise.reject(new Error('rejected')) });
    await expect(requireOwnerApproval(signer, 'log out')).rejects.toThrow('rejected');
  });

  it('rejects an event signed by a different key', async () => {
    await expect(requireOwnerApproval(fakeSigner({}, 'b'.repeat(64)), 'log out')).rejects.toThrow();
  });

  it('rejects an event whose signature is invalid', async () => {
    verifyEvent.mockReturnValue(false);
    await expect(requireOwnerApproval(fakeSigner(), 'log out')).rejects.toThrow();
  });
});
