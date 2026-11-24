# marketplace-w9-compliance

> **Turnkey IRS Form W-9 collection, validation, AES-256-GCM TIN encryption, Avalara Track1099 webhook verification, printable substitute W-9 HTML generation, and payout compliance guards for marketplaces.**  
> *Available in both **Go (Golang)** and **TypeScript / Node.js**.*

[![Go Reference](https://pkg.go.dev/badge/github.com/peterchijioke/marketplace-w9-compliance.svg)](https://pkg.go.dev/github.com/peterchijioke/marketplace-w9-compliance)
[![npm version](https://img.shields.io/npm/v/@peterchijioke/marketplace-w9-compliance.svg)](https://www.npmjs.com/package/@peterchijioke/marketplace-w9-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Marketplace and gig-economy platforms (food delivery, rideshare, creator networks, e-commerce, staffing, and SaaS payouts) that pay US contractors, vendors, or merchants are required by the IRS to collect **Form W-9 (Rev. March 2024)**, validate Taxpayer Identification Numbers (**SSN / EIN**), store TINs securely, and prevent payouts when tax compliance is incomplete (avoiding 24% IRS backup withholding penalties).

`marketplace-w9-compliance` provides an audit-ready, zero-dependency toolkit in both Go and TypeScript/Node.js covering encryption, validation, payout guards, webhook verification, and substitute W-9 generation.

---

## Features

- 🛡️ **Zero Plain-Text Storage**: AES-256-GCM authenticated encryption for SSNs & EINs (`ciphertext:nonce:tag`) — wire-compatible between Go and TypeScript.
- 📝 **IRS Form W-9 Validation**: Validates all 7 federal entity classifications, LLC sub-types (`C`, `S`, `P`), US state & ZIP/ZIP+4 codes, TIN prefix checks, and electronic perjury certification.
- 🔒 **Automatic TIN Masking**: Converts sensitive TINs to masked formats (`***-**-6789` for SSN, `**-***6789` for EIN).
- 🛑 **Payout Compliance Guard**: Blocks US withdrawals until W-9 status is `VERIFIED` or `EXEMPT`, while allowing non-US payees.
- ⚡ **Avalara Track1099 Webhook Verifier**: Constant-time HMAC-SHA256 signature verification on incoming tax webhooks.
- 📄 **Substitute Form W-9 HTML Generator**: Produces a clean, printable IRS Substitute Form W-9 HTML document with masked TIN and signature metadata.
- 🚀 **Zero Dependencies**: Pure standard library in both Go and TypeScript.

---

## Installation

### For Go (Golang)
```bash
go get github.com/peterchijioke/marketplace-w9-compliance
```

### For Node.js / TypeScript
```bash
npm install @peterchijioke/marketplace-w9-compliance
```

---

## Go (Golang) Implementation Examples

### Encrypt, Decrypt, Mask TIN & Guard Payouts

```go
package main

import (
	"fmt"
	"log"
	"os"

	w9 "github.com/peterchijioke/marketplace-w9-compliance"
)

func main() {
	// Use a high-entropy 32+ byte secret from your KMS or environment
	secretKey := os.Getenv("W9_TIN_ENCRYPTION_KEY")

	// 1. Encrypt raw SSN before database storage
	payload, err := w9.EncryptTIN("123-45-6789", secretKey, w9.TINTypeSSN)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Ciphertext: %s\n", payload.Encrypted)
	fmt.Printf("Masked:     %s\n", payload.Masked) // ***-**-6789
	fmt.Printf("Last 4:     %s\n", payload.Last4)  // 6789

	// 2. Mask an EIN for safe display
	fmt.Printf("Masked EIN: %s\n", w9.MaskTIN("12-3456789", w9.TINTypeEIN)) // **-***6789

	// 3. Decrypt when needed for IRS 1099 annual filing
	rawTIN, err := w9.DecryptTIN(payload.Encrypted, secretKey)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Decrypted:  %s\n", rawTIN) // 123456789

	// 4. Guard partner payouts before withdrawal
	guard := w9.IsEligibleForPayout("US", w9.StatusNotSubmitted)
	if !guard.Eligible {
		fmt.Printf("Payout Blocked: %s (Code: %s)\n", guard.Message, guard.Code)
	}

	// Non-US accounts are eligible without W-9
	nonUS := w9.IsEligibleForPayout("GB", w9.StatusNotSubmitted)
	fmt.Printf("Non-US Eligible: %v\n", nonUS.Eligible) // true
}
```

---

## TypeScript / Node.js Implementation Examples

### 1. Validate an IRS Form W-9 Submission

```typescript
import { validateW9Payload } from '@peterchijioke/marketplace-w9-compliance';

const result = validateW9Payload({
  legalName: 'Jane Doe Logistics LLC',
  businessName: 'Doe Express',
  federalTaxClassification: 'LLC',
  llcTaxClassification: 'S', // 'C' | 'S' | 'P' (required for LLC)
  address: {
    addressLine1: '123 Market St',
    addressLine2: 'Suite 400',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
  },
  tinType: 'EIN',
  tin: '12-3456789',
  signatureName: 'Jane Doe',
  certificationAccepted: true,
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
} else {
  console.log('Sanitized W-9:', result.sanitized);
}
```

### 2. Encrypt, Decrypt, and Mask TINs

```typescript
import { encryptTin, decryptTin, maskTin } from '@peterchijioke/marketplace-w9-compliance';

const SECRET_KEY = process.env.W9_TIN_ENCRYPTION_KEY!;

const encrypted = encryptTin('123-45-6789', SECRET_KEY, 'SSN');
console.log(encrypted.masked); // ***-**-6789
console.log(encrypted.last4);  // 6789

const rawTin = decryptTin(encrypted.encrypted, SECRET_KEY);
console.log(rawTin); // 123456789

console.log(maskTin('12-3456789', 'EIN')); // **-***6789
```

### 3. Guard Partner Payouts

```typescript
import { isEligibleForPayout } from '@peterchijioke/marketplace-w9-compliance';

const guard = isEligibleForPayout({
  country: 'US',
  status: 'NOT_SUBMITTED', // NOT_SUBMITTED | PENDING_TIN_MATCH | VERIFIED | REJECTED | ACTION_REQUIRED | EXEMPT
});

if (!guard.eligible) {
  throw new Error(`${guard.code}: ${guard.message}`); // W9_REQUIRED
}
```

### 4. Verify Avalara Track1099 Webhooks

```typescript
import { verifyTrack1099Webhook } from '@peterchijioke/marketplace-w9-compliance';

const isValid = verifyTrack1099Webhook({
  payload: rawRequestBody, // raw string or Buffer
  signature: req.headers['x-track1099-signature'],
  webhookSecret: process.env.TRACK1099_WEBHOOK_SECRET!,
});

if (!isValid) {
  throw new Error('Invalid Track1099 webhook signature');
}
```

### 5. Generate Printable Substitute Form W-9 HTML

```typescript
import { generateSubstituteW9Html } from '@peterchijioke/marketplace-w9-compliance';

const html = generateSubstituteW9Html(sanitizedW9Data, {
  platformName: 'Acme Marketplace',
});
```

---

## Disclaimer

This library is a technical developer utility provided "as is" under the MIT License and does **not** constitute legal, tax, or regulatory compliance advice. Platform operators are solely responsible for ensuring their W-9 collection, electronic signature consent, TIN storage, encryption key management (e.g., KMS), and IRS 1099 reporting comply with applicable federal and state laws.

---

## License

MIT © [Peter Chukwu](https://github.com/peterchijioke)
