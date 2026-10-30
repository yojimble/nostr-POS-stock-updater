import { generateSecretKey, getPublicKey, nip04, nip44 } from 'nostr-tools';
import type { NPool, NostrEvent } from '@nostrify/nostrify';

export interface NostrConnectSession {
  uri: string;
  clientPubkey: string;
  relays: string[];
  secret: string;
}

function randomSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Do NOT add OWNER_APPROVAL_KIND (lib/ownerApproval.ts) here: logging out must stay a request the owner is asked about every time.
const PERMS = [
  'sign_event:0',
  'sign_event:1',
  'sign_event:13',
  'sign_event:1059',
  'sign_event:1111',
  'sign_event:9734',
  'sign_event:30402',
  'nip44_encrypt',
  'nip44_decrypt',
].join(',');

/** Creates a new client-initiated NIP-46 ("nostrconnect://") pairing session. */
export function createNostrConnectSession(relays: string[], appName: string): {
  session: NostrConnectSession;
  clientSecretKey: Uint8Array;
} {
  const clientSecretKey = generateSecretKey();
  const clientPubkey = getPublicKey(clientSecretKey);
  const secret = randomSecret();

  const params = new URLSearchParams();
  for (const relay of relays) params.append('relay', relay);
  params.set('secret', secret);
  params.set('name', appName);
  params.set('perms', PERMS);

  const uri = `nostrconnect://${clientPubkey}?${params.toString()}`;

  return { session: { uri, clientPubkey, relays, secret }, clientSecretKey };
}

// Newer signers reply with NIP-44; older ones still use NIP-04.
function decryptAck(clientSecretKey: Uint8Array, event: NostrEvent): string {
  try {
    return nip44.decrypt(event.content, nip44.getConversationKey(clientSecretKey, event.pubkey));
  } catch {
    return nip04.decrypt(clientSecretKey, event.pubkey, event.content);
  }
}

/**
 * Waits for the remote signer (e.g. Amber) to respond to a nostrconnect:// session
 * with the expected `ack` secret, and returns the remote signer's pubkey.
 */
export async function waitForNostrConnectAck(
  nostr: NPool,
  clientSecretKey: Uint8Array,
  session: NostrConnectSession,
  signal: AbortSignal,
  onDebug?: (line: string) => void,
): Promise<string> {
  // No `since` filter: the key and secret are fresh per session, and a skewed device clock would hide the reply
  const pool = nostr.group(session.relays);

  for await (const msg of pool.req([{ kinds: [24133], '#p': [session.clientPubkey] }], { signal })) {
    if (msg[0] !== 'EVENT') {
      onDebug?.(`relay says ${msg[0]}${msg[0] === 'CLOSED' ? `: ${msg[2]}` : ''}`);
      continue;
    }
    const event = msg[2] as NostrEvent;
    onDebug?.(`got reply event from ${event.pubkey.slice(0, 8)}`);

    try {
      const plaintext = decryptAck(clientSecretKey, event);
      const data = JSON.parse(plaintext);
      if (data.result === session.secret) {
        return event.pubkey;
      }
      onDebug?.('reply did not carry our secret');
    } catch (err) {
      // Not decryptable with our key, or not the ack we're waiting for — ignore.
      onDebug?.(`could not read reply: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error('Timed out waiting for the signer to connect');
}
