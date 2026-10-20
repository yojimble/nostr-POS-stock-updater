import { Capacitor } from '@capacitor/core';
import { NostrSignerPlugin, type Permission } from 'capacitor-plugin-nostr-signer';
import type { NostrEvent, NostrSigner } from '@nostrify/nostrify';

/** Package name of the Amber signer app on Android. */
export const AMBER_PACKAGE = 'com.greenart7c3.nostrsigner';

// What we ask Amber to let this app do without asking each time, once the user
// ticks "remember my choice". Matches the kinds the app signs.
// Do NOT add OWNER_APPROVAL_KIND (lib/ownerApproval.ts) here: logging out must stay a request the owner is asked about every time.
const PERMISSIONS: Permission[] = [
  ...[0, 1, 13, 1059, 1111, 9734, 30402].map((kind): Permission => ({ type: 'sign_event', kind })),
  { type: 'nip44_encrypt' },
  { type: 'nip44_decrypt' },
];

/** True inside the Android app, where Amber can be reached through NIP-55. */
export const isAndroidApp = () => Capacitor.getPlatform() === 'android';

/** Finds Amber (or, failing that, any NIP-55 signer) and returns its package name. */
export async function findSignerPackage(): Promise<string> {
  const { apps } = await NostrSignerPlugin.getInstalledSignerApps();
  const amber = apps.find((app) => app.packageName === AMBER_PACKAGE);
  const found = amber ?? apps[0];
  if (!found) throw new Error('No Nostr signer app found. Install Amber and try again.');
  return found.packageName;
}

/** Asks the signer app for the user's public key. */
export async function amberGetPublicKey(packageName: string): Promise<string> {
  const { pubkey } = await NostrSignerPlugin.getPublicKey(packageName, PERMISSIONS);
  return pubkey;
}

const requestId = () => crypto.randomUUID();

/** A signer that hands every request to a NIP-55 signer app (such as Amber) on this device. */
export class AmberSigner implements NostrSigner {
  constructor(
    private readonly packageName: string,
    private readonly pubkey: string,
  ) {}

  async getPublicKey(): Promise<string> {
    return this.pubkey;
  }

  async signEvent(t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>): Promise<NostrEvent> {
    const { event } = await NostrSignerPlugin.signEvent(
      this.packageName,
      JSON.stringify({ ...t, pubkey: this.pubkey }),
      requestId(),
      this.pubkey,
    );
    return JSON.parse(event) as NostrEvent;
  }

  readonly nip44 = {
    encrypt: async (pubkey: string, plaintext: string): Promise<string> => {
      const { result } = await NostrSignerPlugin.nip44Encrypt(this.packageName, plaintext, requestId(), pubkey, this.pubkey);
      return result;
    },
    decrypt: async (pubkey: string, ciphertext: string): Promise<string> => {
      const { result } = await NostrSignerPlugin.nip44Decrypt(this.packageName, ciphertext, requestId(), pubkey, this.pubkey);
      return result;
    },
  };

  readonly nip04 = {
    encrypt: async (pubkey: string, plaintext: string): Promise<string> => {
      const { result } = await NostrSignerPlugin.nip04Encrypt(this.packageName, plaintext, requestId(), pubkey, this.pubkey);
      return result;
    },
    decrypt: async (pubkey: string, ciphertext: string): Promise<string> => {
      const { result } = await NostrSignerPlugin.nip04Decrypt(this.packageName, ciphertext, requestId(), pubkey, this.pubkey);
      return result;
    },
  };
}
