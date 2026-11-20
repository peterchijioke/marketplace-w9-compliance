import { W9FormData } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: W9FormData;
}

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
  'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]);

/**
 * Validates a Form W-9 submission according to IRS instructions (Rev. March 2024).
 */
export function validateW9Payload(payload: any): ValidationResult {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Invalid payload: expected an object'] };
  }

  // 1. Legal Name
  const legalName = String(payload.legalName || '').trim();
  if (!legalName || legalName.length < 2) {
    errors.push('Legal Name (Line 1) is required');
  }

  // 2. Federal Tax Classification
  const validClassifications = [
    'INDIVIDUAL_SOLE_PROP',
    'C_CORP',
    'S_CORP',
    'PARTNERSHIP',
    'TRUST_ESTATE',
    'LLC',
    'OTHER',
  ];
  if (!validClassifications.includes(payload.federalTaxClassification)) {
    errors.push(`Federal Tax Classification must be one of: ${validClassifications.join(', ')}`);
  }

  // LLC classification check
  if (payload.federalTaxClassification === 'LLC' && !['C', 'S', 'P'].includes(payload.llcTaxClassification)) {
    errors.push('LLC Tax Classification (C, S, or P) is required when entity is LLC');
  }

  // 3. Address
  const addr = payload.address;
  if (!addr || typeof addr !== 'object') {
    errors.push('Address is required');
  } else {
    if (!addr.addressLine1 || String(addr.addressLine1).trim().length < 3) {
      errors.push('Address Line 1 is required');
    }
    if (!addr.city || String(addr.city).trim().length < 2) {
      errors.push('City is required');
    }
    const state = String(addr.state || '').trim().toUpperCase();
    if (!state || !US_STATES.has(state)) {
      errors.push('Valid 2-letter US State abbreviation is required');
    }
    const postalCode = String(addr.postalCode || '').trim();
    if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
      errors.push('Postal Code must be 5 digits (e.g. 90210) or ZIP+4');
    }
  }

  // 4. TIN validation
  const tinType = payload.tinType === 'EIN' ? 'EIN' : 'SSN';
  const cleanTin = String(payload.tin || '').replace(/\D/g, '');
  if (cleanTin.length !== 9) {
    errors.push('TIN must be exactly 9 digits');
  } else {
    // Basic IRS sanity check
    if (/^000|666|^9/.test(cleanTin) && tinType === 'SSN') {
      errors.push('Invalid SSN prefix');
    }
    if (/^00/.test(cleanTin) && tinType === 'EIN') {
      errors.push('Invalid EIN prefix');
    }
  }

  // 5. Certification & Signature
  if (!payload.certificationAccepted) {
    errors.push('You must accept the perjury statement certification');
  }
  const signatureName = String(payload.signatureName || '').trim();
  if (!signatureName || signatureName.length < 2) {
    errors.push('Electronic Signature Name is required');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitized: W9FormData = {
    legalName,
    businessName: payload.businessName ? String(payload.businessName).trim() : undefined,
    federalTaxClassification: payload.federalTaxClassification,
    llcTaxClassification: payload.llcTaxClassification,
    exemptPayeeCode: payload.exemptPayeeCode,
    fatcaExemptionCode: payload.fatcaExemptionCode,
    address: {
      addressLine1: String(addr.addressLine1).trim(),
      addressLine2: addr.addressLine2 ? String(addr.addressLine2).trim() : undefined,
      city: String(addr.city).trim(),
      state: String(addr.state).trim().toUpperCase(),
      postalCode: String(addr.postalCode).trim(),
      country: addr.country || 'US',
    },
    tinType,
    tin: cleanTin,
    signatureName,
    certificationAccepted: true,
    signedAt: payload.signedAt ? new Date(payload.signedAt) : new Date(),
  };

  return { valid: true, errors: [], sanitized };
}
