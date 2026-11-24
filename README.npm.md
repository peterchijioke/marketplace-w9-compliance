# @peterchijioke/marketplace-w9-compliance

> **Turnkey IRS Form W-9 collection, validation, AES-256-GCM TIN encryption, Avalara Track1099 webhook verification, printable substitute W-9 HTML generation, and payout compliance guards for Node.js & TypeScript marketplaces.**

[![npm version](https://img.shields.io/npm/v/@peterchijioke/marketplace-w9-compliance.svg)](https://www.npmjs.com/package/@peterchijioke/marketplace-w9-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Marketplace and gig-economy platforms (food delivery, rideshare, creator networks, e-commerce, staffing, and SaaS payouts) that pay US contractors, vendors, or merchants are required by the IRS to collect **Form W-9 (Rev. March 2024)**, validate Taxpayer Identification Numbers (**SSN / EIN**), store TINs securely, and prevent payouts when tax compliance is incomplete (avoiding 24% IRS backup withholding penalties).

`@peterchijioke/marketplace-w9-compliance` gives you an audit-ready, zero-dependency TypeScript/Node.js toolkit covering the full W-9 lifecycle — from form validation and authenticated encryption to payout blocking, webhook verification, and printable substitute W-9 generation.

---

## Features

- 🛡️ **Zero Plain-Text Storage**: AES-256-GCM authenticated encryption for SSNs & EINs (`ciphertext:iv:tag`) with random 96-bit nonces.
- 📝 **IRS Form W-9 Validation**: Validates all 7 federal entity classifications, LLC sub-types (`C`, `S`, `P`), US state & ZIP/ZIP+4 codes, TIN prefix sanity checks, and electronic perjury certification.
- 🔒 **Automatic TIN Masking**: Formats SSNs as `***-**-6789` and EINs as `**-***6789` for safe UI display and audit logs.
- 🛑 **Payout Compliance Guard**: Blocks US withdrawals until W-9 status is `VERIFIED` or `EXEMPT`, while letting non-US payees withdraw normally.
- ⚡ **Avalara Track1099 Webhook Verifier**: Constant-time (`crypto.timingSafeEqual`) HMAC-SHA256 signature verification for incoming tax status webhooks.
- 📄 **Substitute Form W-9 HTML Generator**: Produces a clean, printable IRS Substitute Form W-9 HTML document with masked TIN and electronic signature metadata.
- 🚀 **Zero Runtime Dependencies**: Built purely on the Node.js `crypto` standard library with full ESM, CJS, and TypeScript `.d.ts` support.

---

## Installation

```bash
npm install @peterchijioke/marketplace-w9-compliance
```

```bash
# yarn
yarn add @peterchijioke/marketplace-w9-compliance

# pnpm
pnpm add @peterchijioke/marketplace-w9-compliance
```

> Requires **Node.js >= 18**.

---

## Implementation Examples

### 1. Validate an IRS Form W-9 Submission

Use `validateW9Payload` on your API endpoint before encrypting or saving a contractor's W-9 form. It returns `{ valid, errors, sanitized }`.

```typescript
import { validateW9Payload } from '@peterchijioke/marketplace-w9-compliance';

const result = validateW9Payload({
  legalName: 'Jane Doe Logistics LLC',
  businessName: 'Doe Express', // optional (Line 2)
  federalTaxClassification: 'LLC', // INDIVIDUAL_SOLE_PROP | C_CORP | S_CORP | PARTNERSHIP | TRUST_ESTATE | LLC | OTHER
  llcTaxClassification: 'S', // required when federalTaxClassification === 'LLC' ('C' | 'S' | 'P')
  address: {
    addressLine1: '123 Market St',
    addressLine2: 'Suite 400', // optional
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105', // supports 5-digit ZIP or ZIP+4 (94105-1234)
    country: 'US',
  },
  tinType: 'EIN', // 'SSN' | 'EIN'
  tin: '12-3456789', // formatted or raw 9 digits
  signatureName: 'Jane Doe',
  certificationAccepted: true, // must be true
});

if (!result.valid) {
  console.error('W-9 validation failed:', result.errors);
  // e.g. ['LLC Tax Classification (C, S, or P) is required when entity is LLC']
} else {
  // result.sanitized has trimmed fields, uppercase state, and 9-digit numeric TIN
  console.log('Sanitized W-9:', result.sanitized);
}
```

---

### 2. Encrypt, Decrypt, and Mask TINs (SSN & EIN)

Never store raw SSNs or EINs in your database. Use `encryptTin` before saving, store `encrypted` + `masked` + `last4`, and call `decryptTin` only when filing 1099s.

```typescript
import { encryptTin, decryptTin, maskTin } from '@peterchijioke/marketplace-w9-compliance';

// Use a high-entropy 32+ byte secret from your KMS or environment (e.g. `openssl rand -hex 32`)
const SECRET_KEY = process.env.W9_TIN_ENCRYPTION_KEY!;

// 1. Encrypt an SSN before database storage
const encryptedSsn = encryptTin('123-45-6789', SECRET_KEY, 'SSN');
console.log(encryptedSsn);
// {
//   encrypted: '<ciphertext_hex>:<iv_hex>:<auth_tag_hex>',
//   last4: '6789',
//   masked: '***-**-6789',
//   tinType: 'SSN'
// }

// 2. Decrypt when needed for annual IRS 1099-NEC / 1099-K filing
const rawTin = decryptTin(encryptedSsn.encrypted, SECRET_KEY);
console.log(rawTin); // '123456789'

// 3. Mask any TIN for safe UI rendering or logs
console.log(maskTin('123-45-6789', 'SSN')); // '***-**-6789'
console.log(maskTin('12-3456789', 'EIN'));  // '**-***6789'
```

---

### 3. Guard Partner Payouts Before Withdrawal

Call `isEligibleForPayout` in your payout/withdrawal service (e.g., before triggering a Stripe Connect transfer) to block unverified US payees.

```typescript
import { isEligibleForPayout } from '@peterchijioke/marketplace-w9-compliance';

// US payee without a verified W-9 -> blocked
const blocked = isEligibleForPayout({
  country: 'US',
  status: 'NOT_SUBMITTED',
});

if (!blocked.eligible) {
  console.log(blocked.code);    // 'W9_REQUIRED'
  console.log(blocked.message); // 'Payouts blocked: A verified IRS Form W-9 is legally required...'
}

// Rejected W-9 (TIN mismatch) -> blocked with W9_REJECTED
const rejected = isEligibleForPayout({
  country: 'US',
  status: 'REJECTED',
});
// { eligible: false, code: 'W9_REJECTED', message: '...' }

// Verified US payee -> allowed
const verified = isEligibleForPayout({
  country: 'US',
  status: 'VERIFIED',
});
// { eligible: true }

// Non-US payee -> allowed (W-9 is only required for US persons)
const international = isEligibleForPayout({
  country: 'GB',
  status: 'NOT_SUBMITTED',
});
// { eligible: true }
```

**Supported `W9ComplianceStatus` values:**
`NOT_SUBMITTED` | `PENDING_TIN_MATCH` | `VERIFIED` | `REJECTED` | `ACTION_REQUIRED` | `EXEMPT`

---

### 4. Verify Avalara Track1099 Webhooks

Use `verifyTrack1099Webhook` to verify HMAC-SHA256 signatures on incoming tax webhook events. Pass the **raw request body** (`string` or `Buffer`).

```typescript
import { verifyTrack1099Webhook } from '@peterchijioke/marketplace-w9-compliance';

// Example Express / Node.js webhook handler (using raw body middleware)
export function handleTrack1099Webhook(req: { rawBody: Buffer; headers: Record<string, string> }) {
  const signature = req.headers['x-track1099-signature'] || '';

  const isValid = verifyTrack1099Webhook({
    payload: req.rawBody, // raw string or Buffer
    signature,            // supports both raw hex and 'sha256=<hex>'
    webhookSecret: process.env.TRACK1099_WEBHOOK_SECRET!,
  });

  if (!isValid) {
    throw new Error('Invalid webhook signature');
  }

  // Safe to process webhook payload
  const event = JSON.parse(req.rawBody.toString('utf8'));
  return event;
}
```

---

### 5. Generate a Printable Substitute Form W-9 (HTML)

Use `generateSubstituteW9Html` to produce an audit-ready HTML document you can display to admins, archive in S3, or convert to PDF (e.g., with Puppeteer).

```typescript
import { validateW9Payload, generateSubstituteW9Html } from '@peterchijioke/marketplace-w9-compliance';

const { valid, sanitized } = validateW9Payload({
  legalName: 'Jane Doe Logistics LLC',
  federalTaxClassification: 'LLC',
  llcTaxClassification: 'S',
  address: {
    addressLine1: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
  },
  tinType: 'EIN',
  tin: '12-3456789',
  signatureName: 'Jane Doe',
  certificationAccepted: true,
});

if (valid && sanitized) {
  const html = generateSubstituteW9Html(sanitized, {
    platformName: 'Acme Marketplace',
    // maskedTin is automatically derived from sanitized.tin if omitted
  });

  // Save to S3, send as HTML response, or render to PDF
  console.log(html);
}
```

---

## API Reference

| Function | Description |
| --- | --- |
| `validateW9Payload(payload)` | Validates and sanitizes an IRS Form W-9 submission (`{ valid, errors, sanitized }`). |
| `encryptTin(rawTin, secretKey, type?)` | Encrypts a 9-digit SSN/EIN with AES-256-GCM and returns `{ encrypted, last4, masked, tinType }`. |
| `decryptTin(encryptedString, secretKey)` | Decrypts a `ciphertext:iv:tag` string back to the 9-digit TIN. |
| `maskTin(rawTin, type?)` | Masks a 9-digit TIN (`***-**-6789` for SSN, `**-***6789` for EIN). |
| `isEligibleForPayout({ country?, status })` | Checks whether a payee can withdraw funds (`{ eligible, code?, message? }`). |
| `verifyTrack1099Webhook({ payload, signature, webhookSecret })` | Performs constant-time HMAC-SHA256 verification on tax webhooks. |
| `generateSubstituteW9Html(data, options?)` | Renders an audit-ready printable HTML Substitute Form W-9. |

---

## Security Best Practices

- Generate `W9_TIN_ENCRYPTION_KEY` with at least 32 bytes of cryptographically secure randomness (e.g., `openssl rand -hex 32`) and store it in a secrets manager / KMS.
- Never log raw `tin` values or `decryptTin` outputs. Store and display `masked` (`***-**-6789`) or `last4` instead.
- Always pass the raw, unparsed request body (`Buffer` or raw `string`) to `verifyTrack1099Webhook`.

---

## Disclaimer

This library is a technical developer utility provided "as is" under the MIT License and does **not** constitute legal, tax, or regulatory compliance advice. Platform operators are solely responsible for ensuring their W-9 collection, electronic signature consent, TIN storage, encryption key management (e.g., KMS), and IRS 1099 reporting comply with applicable federal and state laws.

---

## License

MIT © [Peter Chukwu](https://github.com/peterchijioke)
