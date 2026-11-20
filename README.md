# marketplace-w9-compliance

> **Turnkey IRS Form W-9 collection, AES-256-GCM TIN encryption, Avalara Track1099 integration, and payout compliance guards for marketplaces.**

[![npm version](https://img.shields.io/npm/v/marketplace-w9-compliance.svg)](https://www.npmjs.com/package/marketplace-w9-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Marketplace and gig-economy platforms (food delivery, rideshare, creator networks, e-commerce) paying US contractors and merchants are legally required by the IRS to collect Form W-9, verify Taxpayer Identification Numbers (TIN), and protect themselves from backup withholding penalties (24% IRS penalty).

`marketplace-w9-compliance` provides an audit-ready, end-to-end toolkit to collect, validate, encrypt, and guard payouts.

---

## Features

- 🛡️ **Zero Plain-Text Storage**: Built-in AES-256-GCM authenticated encryption for SSNs & EINs (`ciphertext:iv:authTag`).
- 📝 **IRS Form W-9 (Rev. March 2024) Validation**: Compliant validator for 7 federal entity classifications, LLC sub-types, and electronic perjury certification.
- 🔒 **Automatic TIN Masking**: Converts sensitive TINs to masked formats (`***-**-6789` or `**-***6789`).
- 🛑 **Payout Guard**: Protects your platform by blocking withdrawals for US accounts until W-9 verification is confirmed.
- ⚡ **Avalara Track1099 Webhook Verifier**: Validates cryptographic HMAC-SHA256 signatures on incoming tax webhooks.
- 📄 **Printable Substitute W-9 HTML**: Generates clean, audit-proof IRS substitute Form W-9 documents.

---

## Installation

```bash
npm install marketplace-w9-compliance
```

---

## Quick Start

### 1. Encrypt & Mask Sensitive TINs
```typescript
import { encryptTin, decryptTin, maskTin } from 'marketplace-w9-compliance';

const SECRET_KEY = process.env.W9_TIN_ENCRYPTION_KEY!; // 32-byte secret

// Encrypt before saving to database
const encryptedData = encryptTin('123456789', SECRET_KEY, 'SSN');
console.log(encryptedData);
// {
//   encrypted: 'e9a...:f4c...:8b1...',
//   last4: '6789',
//   masked: '***-**-6789',
//   tinType: 'SSN'
// }

// Decrypt for authorized 1099 annual filing
const rawTin = decryptTin(encryptedData.encrypted, SECRET_KEY);
// '123456789'
```

### 2. Validate Form W-9 Submissions
```typescript
import { validateW9Payload } from 'marketplace-w9-compliance';

const result = validateW9Payload({
  legalName: 'Acme Logistics LLC',
  federalTaxClassification: 'LLC',
  llcTaxClassification: 'S',
  address: {
    addressLine1: '100 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
  },
  tinType: 'EIN',
  tin: '12-3456789',
  signatureName: 'John Doe',
  certificationAccepted: true,
});

if (!result.valid) {
  console.error(result.errors);
} else {
  console.log('Sanitized data ready to store:', result.sanitized);
}
```

### 3. Guard Cashouts / Payouts
```typescript
import { isEligibleForPayout } from 'marketplace-w9-compliance';

// Inside your cashout/withdrawal endpoint
const guard = isEligibleForPayout({
  country: partner.country, // 'US', 'CA', 'NG', etc.
  status: partner.w9Status,  // 'NOT_SUBMITTED', 'VERIFIED', etc.
});

if (!guard.eligible) {
  throw new Error(guard.message); // HTTP 400 W9_REQUIRED
}
```

---

## License

MIT © [Peter Chukwu](https://github.com/petechukwu)
