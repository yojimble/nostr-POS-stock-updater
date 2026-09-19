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

#### Choosing a lightning address provider

Confirmation depends on whatever serves the lightning address (`lud16`) on the **seller's** Nostr profile — a wallet app, a custodial service, or your own server — never on the buyer's wallet.

Measured against live endpoints on 2026-09-19, counting only addresses that actually returned an invoice:

| Provider | Zap receipts | LUD-21 `verify` | Confirms automatically? |
| --- | --- | --- | --- |
| [Alby](https://getalby.com) | ✅ | ✅ | ✅ Both channels |
| [Blink](https://blink.sv) | ✅ | ✅ | ✅ Both channels |
| [Coinos](https://coinos.io) | ✅ | ✅ | ✅ Both channels |
| [Primal](https://primal.net) | ✅ | ❌ | ✅ Via zap receipts |
| [LNbits](https://lnbits.com) (self-hosted) | Via the Nostr extension | ✅ Recent versions | ✅ Depends on your setup |
| [BTCPay Server](https://btcpayserver.org) (self-hosted server, not a wallet) | Via the Nostr plugin | ✅ Recent versions | ✅ Depends on your setup |
| [ZBD](https://zbd.gg) | ❌ | ❌ | ❌ Manual confirm only |
| Stacker.news, Wallet of Satoshi, Strike | Untested | Untested | ⚠️ Check before relying on it |

**Alby, Blink and Coinos all support both channels** — if one fails, the other still confirms the sale. Any of the three is a sound choice for a till. Primal confirms over zap receipts only, which is exactly why that fallback exists. Running your own LNbits or BTCPay Server gives you both, at the cost of running it; note those are lightning address servers in front of your node, not wallets in their own right.

Avoid ZBD for unattended tills: with neither channel, every sale needs someone to check the wallet and tap "I've been paid", which an employee can't do on the owner's behalf.

#### Checking your own address

You don't need to test anything by hand. Open the POS and it says, at the top of the screen, whether sales on your lightning address confirm themselves — and if they don't, that every sale will need checking in your wallet before tapping "I've been paid".

Check it before handing the till to staff, since they can't confirm payments against an owner's wallet they can't see.

#### Zap receipts are public

When the zap channel is used, the receipt your wallet publishes is a public Nostr event tagged to your pubkey, showing the amount and the time. Anyone can watch your takings.

**They appear as self-zaps.** By default the zap request is signed with your own key, so other Nostr clients show each sale as you zapping yourself. That's expected, not a bug — it's how the receipt stays attributable to your shop without involving the buyer.

**Or make them anonymous.** The settings cog has an "Anonymous zap receipts" switch. With it on, each zap request is signed by a throwaway key instead: sales still confirm exactly the same way, but nothing links them to your Nostr identity, and no self-zaps appear on your profile. It also removes the kind 9734 setup step, since your signer is never asked to approve anything. The amount and time of each sale remain publicly visible either way — they're just not attributable to you.

It says nothing about the buyer — they pay an ordinary Lightning invoice and never touch Nostr — and nothing about what was sold: the order memo is deliberately kept out of the zap request, so it reaches your own wallet but not the public receipt.

The app avoids publishing at all where it can: once a wallet's `verify` endpoint has successfully confirmed a payment, later charges stop requesting zap receipts for that address.

Unless you turn on anonymous receipts, signing the zap request uses the shop's key — so set your signer to auto-approve **kind 9734** before handing the till to staff, or each charge waits on a manual approval nobody at the counter can give. Amber supports this per event kind; browser extensions have equivalent settings.

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
