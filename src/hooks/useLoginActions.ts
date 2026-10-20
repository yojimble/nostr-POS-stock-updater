import { useNostr } from '@nostrify/react';
import { NConnectSigner, NSecSigner } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { NLogin, useNostrLogin } from '@nostrify/react/login';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, setLogin, removeLogin } = useNostrLogin();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
      setLogin(login.id);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
      setLogin(login.id);
    },
    // Login from a completed client-initiated "nostrconnect://" pairing (e.g. Amber via QR).
    // The key that answered the pairing is the signer's, not necessarily the user's, so
    // ask it for the user's real public key and only save the login if it answers.
    async nostrConnect(bunkerPubkey: string, clientNsec: `nsec1${string}`, relays: string[]): Promise<void> {
      const clientSk = nip19.decode(clientNsec).data as Uint8Array;
      const signer = new NConnectSigner({
        relay: nostr.group(relays),
        pubkey: bunkerPubkey,
        signer: new NSecSigner(clientSk),
        timeout: 30_000,
      });
      const pubkey = await signer.getPublicKey();
      const login = new NLogin('bunker', pubkey, { bunkerPubkey, clientNsec, relays });
      addLogin(login);
      setLogin(login.id);
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
      setLogin(login.id);
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
