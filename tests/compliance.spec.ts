import * as crypto from 'crypto';
import { encryptTin, decryptTin, maskTin } from '../src/crypto';
import { validateW9Payload } from '../src/validator';
import { isEligibleForPayout } from '../src/payout-guard';
import { verifyTrack1099Webhook } from '../src/track1099';

describe('Marketplace W-9 Compliance', () => {
  const TEST_KEY = 'a-super-secret-encryption-key-32b!';

  describe('TIN Cryptography', () => {
    it('encrypts and decrypts SSN cleanly with AES-256-GCM', () => {
      const rawTin = '123456789';
      const enc = encryptTin(rawTin, TEST_KEY, 'SSN');
      expect(enc.last4).toBe('6789');
      expect(enc.masked).toBe('***-**-6789');

      const decrypted = decryptTin(enc.encrypted, TEST_KEY);
      expect(decrypted).toBe(rawTin);
    });

    it('masks EIN correctly', () => {
      expect(maskTin('123456789', 'EIN')).toBe('**-***6789');
    });

    it('throws error when secretKey is missing or TIN is not 9 digits', () => {
      expect(() => encryptTin('123', TEST_KEY)).toThrow();
    });
  });

  describe('W-9 Form Validation', () => {
    it('validates a compliant substitute W-9 payload', () => {
      const payload = {
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
      };

      const result = validateW9Payload(payload);
      expect(result.valid).toBe(true);
      expect(result.sanitized?.tin).toBe('123456789');
    });

    it('rejects unaccepted perjury certification', () => {
      const payload = {
        legalName: 'John Doe',
        federalTaxClassification: 'INDIVIDUAL_SOLE_PROP',
        address: { addressLine1: '123 Main', city: 'Austin', state: 'TX', postalCode: '78701' },
        tinType: 'SSN',
        tin: '123456789',
        signatureName: 'John Doe',
        certificationAccepted: false,
      };

      const result = validateW9Payload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('You must accept the perjury statement certification');
    });

    it('accepts valid SSN containing 666 outside the prefix and rejects 666 prefix', () => {
      const base = {
        legalName: 'John Doe',
        federalTaxClassification: 'INDIVIDUAL_SOLE_PROP',
        address: { addressLine1: '123 Main', city: 'Austin', state: 'TX', postalCode: '78701' },
        tinType: 'SSN',
        signatureName: 'John Doe',
        certificationAccepted: true,
      };

      expect(validateW9Payload({ ...base, tin: '123-45-6660' }).valid).toBe(true);
      const invalid = validateW9Payload({ ...base, tin: '666-12-3456' });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Invalid SSN prefix');
    });
  });

  describe('Track1099 Webhook Verification', () => {
    it('verifies valid HMAC-SHA256 webhook signatures and rejects invalid ones', () => {
      const secret = 'whsec_test_secret';
      const payload = JSON.stringify({ event: 'w9.verified', payeeId: '123' });
      const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyTrack1099Webhook({ payload, signature: digest, webhookSecret: secret })).toBe(true);
      expect(verifyTrack1099Webhook({ payload, signature: `sha256=${digest}`, webhookSecret: secret })).toBe(true);
      expect(verifyTrack1099Webhook({ payload, signature: '00'.repeat(32), webhookSecret: secret })).toBe(false);
    });
  });

  describe('Payout Compliance Guard', () => {
    it('allows non-US accounts without Form W-9', () => {
      const res = isEligibleForPayout({ country: 'NG', status: 'NOT_SUBMITTED' });
      expect(res.eligible).toBe(true);
    });

    it('blocks US accounts if W-9 is not submitted', () => {
      const res = isEligibleForPayout({ country: 'US', status: 'NOT_SUBMITTED' });
      expect(res.eligible).toBe(false);
      expect(res.code).toBe('W9_REQUIRED');
    });

    it('allows verified US accounts to cashout', () => {
      const res = isEligibleForPayout({ country: 'US', status: 'VERIFIED' });
      expect(res.eligible).toBe(true);
    });
  });
});
