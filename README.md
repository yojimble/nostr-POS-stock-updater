# Nostr Stock Updater

A PWA for quickly updating stock on your Nostr NIP-99 classified listings (kind 30402), with a built-in point-of-sale and Lightning checkout.

## What it does

### Inventory
- Sign in with NIP-07 browser extension, bunker, or by scanning a QR code with Amber (or any Nostr Connect signer)
- Tap product images to add or remove stock in bulk
- Publishes updated events with the **same `d` tag** — relays replace the prior version automatically
- Installable PWA (service worker, offline shell cache, home-screen icon)

### Point of Sale (POS)
- Build an order by tapping items from your own NIP-99 listings, in an image grid or a compact list view
- Search and sort your catalog (newest/oldest, name, price, stock level)
- Cart totals are converted to sats automatically, even across listings priced in different currencies (USD, EUR, GBP, CAD, CHF, AUD, JPY, SATS, BTC)
- Charge the order over Lightning using your own profile's lightning address (`lud16`) — no custodian, funds land directly in your wallet
- On confirmed payment, stock is automatically decremented and the updated listings are republished
- Optionally send the buyer a DM receipt (itemized, with total paid) as a private NIP-17 message

### Calculator
- A real calculator (+, −, ×, ÷) for ringing up an arbitrary amount
- Auto-detects your currency from your most commonly used listing price, converts to sats, and charges the same way as POS
- Also supports optional memos and DM receipts

### Payments
- Invoices are requested live via LNURL-pay (LUD-06/16) from your lightning address
- Payment is confirmed automatically over **two independent channels**, whichever answers first:
  - **LUD-21 `verify`** — the app polls your wallet's verify endpoint over HTTPS
  - **NIP-57 zap receipt** — your wallet publishes a signed receipt to relays, which the app is already listening on
- If neither is available, you confirm manually with an "I've been paid" button
- WebLN wallets (browser extensions) can pay directly from the same device

Nothing to configure: the app inspects your provider on each charge and uses whatever it supports. The customer is unaffected either way — they scan an ordinary Lightning invoice with any wallet, and need no Nostr account.

#### Choosing a wallet

Confirmation depends on the lightning address (`lud16`) on the **seller's** Nostr profile, never on the buyer's wallet. Measured against live endpoints on 2026-09-19:

| Provider | LUD-21 `verify` | Zap receipts | Confirms automatically? |
| --- | --- | --- | --- |
| [Alby](https://getalby.com) | ✅ | ✅ | ✅ Both channels — **recommended** |
| [Coinos](https://coinos.io) | ❌ | ✅ | ✅ Via zap receipts |
| [Primal](https://primal.net) | ❌ | ✅ | ✅ Via zap receipts |
| [Blink](https://blink.sv) | ❌ | ✅ | ✅ Via zap receipts |
| [LNbits](https://lnbits.com) | ✅ (recent versions) | Via the Nostr extension | ✅ Self-hosted, depends on your setup |
| [BTCPay Server](https://btcpayserver.org) | ✅ (recent versions) | Via the Nostr plugin | ✅ Self-hosted, depends on your setup |
| [Stacker.news](https://stacker.news) | ❌ | ❌ | ❌ Manual confirm only |
| [ZBD](https://zbd.gg) | ❌ | ❌ | ❌ Manual confirm only |
| Wallet of Satoshi | ❌ | Untested | ⚠️ Likely manual confirm |
| Strike | ❌ | Untested | ⚠️ Likely manual confirm |

**Recommended: Alby**, as the only provider tested with both channels — if one breaks, the other still confirms the sale. Coinos, Primal and Blink all confirm reliably over zap receipts alone. Self-hosting LNbits or BTCPay gives you both, at the cost of running it.

Avoid Stacker.news, ZBD, Wallet of Satoshi and Strike for unattended tills: every sale needs someone to check the wallet and tap "I've been paid", which an employee can't do on the owner's behalf.

#### Checking your own provider

```sh
# 1. Does it support zaps? Look for "allowsNostr": true
curl https://<domain>/.well-known/lnurlp/<name>

# 2. Does it support verify? Call the callback from step 1 and look for a "verify" URL
curl "<callback>?amount=1000"
```

Either one is enough for automatic confirmation.

#### Zap receipts are public

When the zap channel is used, the receipt your wallet publishes is a public Nostr event tagged to your pubkey, showing the amount and time. Anyone can watch your takings. The app avoids this where it can: once a wallet's `verify` endpoint has successfully confirmed a payment, later charges stop requesting zap receipts for that address.

Signing the zap request uses the shop's key, so set your signer to auto-approve **kind 9734** before handing the till to staff — otherwise each charge waits on a manual approval. Amber supports this per event kind; browser extensions have equivalent settings.

## Built with

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Nostrify](https://nostrify.dev/)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) (NIP-17/NIP-44/NIP-46 primitives)
- [qrcode.react](https://github.com/zpao/qrcode.react)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [MKStack](https://soapbox.pub/mkstack) (scaffolding)

## Getting started

**Prerequisites:** Node.js v18+ and a NIP-07 extension ([Alby](https://getalby.com) or [nos2x](https://github.com/fiatjaf/nos2x)).

To use the POS or Calculator tabs, your Nostr profile needs a lightning address (`lud16`) set — that's where payments are received.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
```

## License

MIT
