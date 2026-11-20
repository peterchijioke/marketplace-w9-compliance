type FederalTaxClassification = 'INDIVIDUAL_SOLE_PROP' | 'C_CORP' | 'S_CORP' | 'PARTNERSHIP' | 'TRUST_ESTATE' | 'LLC' | 'OTHER';
type LlcTaxClassification = 'C' | 'S' | 'P';
type TinType = 'SSN' | 'EIN';
type W9ComplianceStatus = 'NOT_SUBMITTED' | 'PENDING_TIN_MATCH' | 'VERIFIED' | 'REJECTED' | 'ACTION_REQUIRED' | 'EXEMPT';
interface W9Address {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
}
interface W9FormData {
    legalName: string;
    businessName?: string;
    federalTaxClassification: FederalTaxClassification;
    llcTaxClassification?: LlcTaxClassification;
    exemptPayeeCode?: string;
    fatcaExemptionCode?: string;
    address: W9Address;
    tinType: TinType;
    tin: string;
    signatureName: string;
    certificationAccepted: boolean;
    signedAt?: Date;
}
interface EncryptedTinPayload {
    encrypted: string;
    last4: string;
    masked: string;
    tinType: TinType;
}
interface PayoutEligibilityResult {
    eligible: boolean;
    code?: 'W9_REQUIRED' | 'W9_ACTION_REQUIRED' | 'W9_REJECTED';
    message?: string;
}

/**
 * Formats a 9-digit TIN with standard IRS masking.
 * SSN: ***-**-1234
 * EIN: **-***1234
 */
declare function maskTin(rawTin: string, type?: TinType): string;
/**
 * Encrypts a TIN using AES-256-GCM authenticated encryption.
 * Format output: ciphertext_hex:iv_hex:auth_tag_hex
 */
declare function encryptTin(rawTin: string, secretKey: string, type?: TinType): EncryptedTinPayload;
/**
 * Decrypts a TIN encrypted with encryptTin.
 */
declare function decryptTin(encryptedString: string, secretKey: string): string;

interface ValidationResult {
    valid: boolean;
    errors: string[];
    sanitized?: W9FormData;
}
/**
 * Validates a Form W-9 submission according to IRS instructions (Rev. March 2024).
 */
declare function validateW9Payload(payload: any): ValidationResult;

/**
 * Checks whether an actor (vendor, contractor, courier) is legally eligible to withdraw funds.
 * Blocks US payouts if W-9 is not verified, preventing the 24% IRS backup withholding liability.
 */
declare function isEligibleForPayout(params: {
    country?: string;
    status: W9ComplianceStatus;
}): PayoutEligibilityResult;

interface Track1099WebhookOptions {
    payload: string | Buffer;
    signature: string;
    webhookSecret: string;
}
/**
 * Validates an HMAC-SHA256 signature from Avalara Track1099 or compatible tax webhook providers.
 */
declare function verifyTrack1099Webhook(options: Track1099WebhookOptions): boolean;

/**
 * Generates an audit-ready, printable IRS Substitute Form W-9 HTML document.
 */
declare function generateSubstituteW9Html(data: W9FormData, options?: {
    maskedTin?: string;
    platformName?: string;
}): string;

export { type EncryptedTinPayload, type FederalTaxClassification, type LlcTaxClassification, type PayoutEligibilityResult, type TinType, type Track1099WebhookOptions, type ValidationResult, type W9Address, type W9ComplianceStatus, type W9FormData, decryptTin, encryptTin, generateSubstituteW9Html, isEligibleForPayout, maskTin, validateW9Payload, verifyTrack1099Webhook };
