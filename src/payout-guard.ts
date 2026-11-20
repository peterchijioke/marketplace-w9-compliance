import { PayoutEligibilityResult, W9ComplianceStatus } from './types';

/**
 * Checks whether an actor (vendor, contractor, courier) is legally eligible to withdraw funds.
 * Blocks US payouts if W-9 is not verified, preventing the 24% IRS backup withholding liability.
 */
export function isEligibleForPayout(params: {
  country?: string;
  status: W9ComplianceStatus;
}): PayoutEligibilityResult {
  const country = (params.country || 'US').trim().toUpperCase();

  // Non-US accounts do not require US IRS Form W-9
  if (country !== 'US') {
    return { eligible: true };
  }

  if (params.status === 'VERIFIED' || params.status === 'EXEMPT') {
    return { eligible: true };
  }

  if (params.status === 'REJECTED') {
    return {
      eligible: false,
      code: 'W9_REJECTED',
      message: 'Payouts blocked: Your IRS Form W-9 was rejected due to a TIN mismatch. Please resubmit.',
    };
  }

  if (params.status === 'ACTION_REQUIRED') {
    return {
      eligible: false,
      code: 'W9_ACTION_REQUIRED',
      message: 'Payouts blocked: Further documentation required for your tax verification.',
    };
  }

  return {
    eligible: false,
    code: 'W9_REQUIRED',
    message: 'Payouts blocked: A verified IRS Form W-9 is legally required before receiving payouts in the United States.',
  };
}
