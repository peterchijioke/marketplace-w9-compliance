export type FederalTaxClassification =
  | 'INDIVIDUAL_SOLE_PROP'
  | 'C_CORP'
  | 'S_CORP'
  | 'PARTNERSHIP'
  | 'TRUST_ESTATE'
  | 'LLC'
  | 'OTHER';

export type LlcTaxClassification = 'C' | 'S' | 'P';

export type TinType = 'SSN' | 'EIN';

export type W9ComplianceStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_TIN_MATCH'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ACTION_REQUIRED'
  | 'EXEMPT';

export interface W9Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface W9FormData {
  legalName: string;
  businessName?: string;
  federalTaxClassification: FederalTaxClassification;
  llcTaxClassification?: LlcTaxClassification;
  exemptPayeeCode?: string;
  fatcaExemptionCode?: string;
  address: W9Address;
  tinType: TinType;
  tin: string; // 9-digit raw or formatted TIN
  signatureName: string;
  certificationAccepted: boolean;
  signedAt?: Date;
}

export interface EncryptedTinPayload {
  encrypted: string; // ciphertext:iv:tag
  last4: string;
  masked: string;
  tinType: TinType;
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  code?: 'W9_REQUIRED' | 'W9_ACTION_REQUIRED' | 'W9_REJECTED';
  message?: string;
}
