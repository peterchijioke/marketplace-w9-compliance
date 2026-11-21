# marketplace-w9-compliance

> **Turnkey IRS Form W-9 collection, AES-256-GCM TIN encryption, Avalara Track1099 integration, and payout compliance guards for marketplaces.**  
> *Available in both **Go (Golang)** and **TypeScript / Node.js**.*

[![Go Reference](https://pkg.go.dev/badge/github.com/peterchijioke/marketplace-w9-compliance.svg)](https://pkg.go.dev/github.com/peterchijioke/marketplace-w9-compliance)
[![npm version](https://img.shields.io/npm/v/@peterchijioke/marketplace-w9-compliance.svg)](https://www.npmjs.com/package/@peterchijioke/marketplace-w9-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Marketplace and gig-economy platforms (food delivery, rideshare, creator networks, e-commerce) paying US contractors and merchants are legally required by the IRS to collect Form W-9, verify Taxpayer Identification Numbers (TIN), and protect themselves from backup withholding penalties (24% IRS penalty).

`marketplace-w9-compliance` provides an audit-ready toolkit to collect, validate, encrypt, and guard payouts.

---

## Features

- 🛡️ **Zero Plain-Text Storage**: Built-in AES-256-GCM authenticated encryption for SSNs & EINs (`ciphertext:nonce:tag`).
- 📝 **IRS Form W-9 Validation**: Compliant validator for 7 federal entity classifications, LLC sub-types, and electronic perjury certification.
- 🔒 **Automatic TIN Masking**: Converts sensitive TINs to masked formats (`***-**-6789` or `**-***6789`).
- 🛑 **Payout Guard**: Protects your platform by blocking withdrawals for US accounts until W-9 verification is confirmed.
- ⚡ **Avalara Track1099 Webhook Verifier**: Validates cryptographic HMAC-SHA256 signatures on incoming tax webhooks.
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

## Go (Golang) Quick Start

```go
package main

import (
	"fmt"
	"log"

	w9 "github.com/peterchijioke/marketplace-w9-compliance"
)

func main() {
	secretKey := "YOUR_32_BYTE_ENCRYPTION_SECRET!!"

	// 1. Encrypt raw SSN before database storage
	payload, err := w9.EncryptTIN("123456789", secretKey, w9.TINTypeSSN)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Ciphertext: %s\n", payload.Encrypted)
	fmt.Printf("Masked:     %s\n", payload.Masked) // ***-**-6789
	fmt.Printf("Last 4:     %s\n", payload.Last4)  // 6789

	// 2. Decrypt when needed for IRS 1099 annual filing
	rawTIN, err := w9.DecryptTIN(payload.Encrypted, secretKey)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Decrypted:  %s\n", rawTIN)

	// 3. Guard partner payouts before withdrawal
	guard := w9.IsEligibleForPayout("US", w9.StatusNotSubmitted)
	if !guard.Eligible {
		fmt.Printf("Payout Blocked: %s (Code: %s)\n", guard.Message, guard.Code)
	}
}
```

---

## TypeScript / Node.js Quick Start

```typescript
import { encryptTin, decryptTin, maskTin, isEligibleForPayout } from '@peterchijioke/marketplace-w9-compliance';

const SECRET_KEY = process.env.W9_TIN_ENCRYPTION_KEY!;

const encryptedData = encryptTin('123456789', SECRET_KEY, 'SSN');
console.log(encryptedData.masked); // ***-**-6789

const guard = isEligibleForPayout({
  country: 'US',
  status: 'NOT_SUBMITTED',
});

if (!guard.eligible) {
  throw new Error(guard.message); // W9_REQUIRED
}
```

---

## License

MIT © [Peter Chukwu](https://github.com/peterchijioke)
