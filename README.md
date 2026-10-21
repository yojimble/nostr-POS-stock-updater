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

## Setting up staff devices

The shop's key stays on the **owner's phone**, in a signer such as [Amber](https://github.com/greenart7c3/Amber). Staff tills (the web app or the Android app) never hold the key. They ask the owner's signer to sign each action over Nostr Connect (NIP-46), so a till can ring up sales without the owner standing next to it, and it cannot sign anything the owner has not allowed.

### One-time setup, by the owner

1. Put the shop's key in Amber on your own phone. Do not install or log into Amber on a staff device.
2. On the till, open the app and choose **Log in**, then the **Amber** tab. A QR code appears.
3. On your phone, scan the QR code with Amber. Amber lists what the till is asking to be allowed to do:
   - sign: profile (kind 0), notes (1), gift-wrapped receipts (13 and 1059), comments (1111), zap requests (9734) and listings (30402);
   - encrypt and decrypt with NIP-44.
4. Approve it and **tick "remember my choice"** (Amber's wording may differ by version) so those actions are approved automatically from now on. Do not switch the till to a mode where Amber approves everything without asking, or the lock below stops working.
5. **Allow listing updates before you hand the till over.** Amber's "Basic actions" does not cover listings, so Amber would ask on every stock update. **Sign classified listing** (kind 30402) is a permission in Amber, so set it to **always allow**: do one stock update on the **Inventory** tab (tap **Add** on an item, press **Update**), and when Amber asks, choose always allow and approve. Put the item's stock back afterwards if you like.
6. Ring up a test sale on the till. It should complete with no prompt on your phone.

The till now works on its own. Keep your phone switched on and online during opening hours, and let Amber run in the background (turn off battery optimisation for it), or the till cannot get its signatures.

### Permissions the app asks for

At first login the app asks your signer to allow the following. Approve them all and choose to remember the choice, so the till never interrupts a sale. Listings (30402) are not part of Amber's "Basic actions", so approve them as in step 5 of the setup above.

| Permission | Kind | Used for |
| --- | --- | --- |
| Sign profile | 0 | Editing the shop profile |
| Sign note | 1 | Requested for notes. No current feature uses it |
| Sign gift-wrapped receipt (seal) | 13 | Sending a customer their receipt |
| Sign gift wrap | 1059 | Sending a customer their receipt |
| Sign comment | 1111 | Comments on a listing |
| Sign zap request | 9734 | Charging a payment |
| Sign classified listing | 30402 | Updating stock and editing listings |
| NIP-44 encrypt | | Encrypting a customer's receipt |
| NIP-44 decrypt | | Requested alongside encrypt. No current feature uses it |

Amber's wording for these kinds varies by version. If a sale or stock update still asks you to approve a kind from this list, open that app's permissions in Amber and set that kind to always allow.

### Log out, switch account and add account

These three are **not** in the permission list above, on purpose, and each asks the owner's signer for approval every time.

The till's account menu offers **Switch account**, **Add another account** and **Log out**. None of them work on their own. Each one asks your Amber to sign a short request (event kind 22900, "Approve: log out on a staff device"):

- You get the alert on your phone and approve or reject it.
- Approve: the till does what was asked.
- Reject, or no answer: nothing changes and the till shows "Not approved".

Amber shows this as **kind 22900** with the text "report missing event kind translation", because it has no name for that kind. That is expected. Open the drop-down menu on Amber's request to read the memo, which says which action the till is asking for ("Approve: log out on a staff device", "Approve: switch account on a staff device" or "Approve: add account on a staff device"). Approve it only if you know why the till is asking.

That request is **not** in the permissions you approved at setup, and it is never published. Do not tick "remember my choice" for it. If you do, Amber will approve it automatically and staff can log out freely.

### Taking a till out of service

- **Revoke it from your phone:** remove the connected app in Amber. The till can no longer sign anything.
- **Change who the till is logged in as:** revoke the old connection, then log in on the till again with a new QR code. If the old signer cannot be reached, clearing the app's data (Android settings, then the app, then Clear data) also resets it.
- **If your phone is off or offline:** the approval request cannot be answered, so nobody can log out or switch. Sales also cannot be signed until your phone is back.

### Android app

The login screen in the Android app offers both ways in:

- **Staff device:** scan the QR code with the owner's Amber on another phone (the setup above). Use this on every till that staff handle.
- **Shop owner using this phone:** **Login with Amber on this phone** talks to an Amber installed on the same phone (NIP-55). Use it only if you run the shop yourself from one phone. On a staff device it would put the shop's key in staff hands, and the log-out approval would appear on the same phone, where staff could approve it themselves.

## Built with

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Nostrify](https://nostrify.dev/)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) (NIP-17/NIP-44/NIP-46 primitives)
- [qrcode.react](https://github.com/zpao/qrcode.react)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Capacitor](https://capacitorjs.com/) + [capacitor-plugin-nostr-signer](https://github.com/hzrd149/capacitor-plugin-nostr-signer) (Android app, signs through Amber via NIP-55)

## Credits

This app started from [MKStack](https://soapbox.pub/mkstack), Soapbox's starter template for Nostr apps built with React, Tailwind, shadcn/ui and Nostrify.

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
