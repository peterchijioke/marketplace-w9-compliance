package w9compliance

import "strings"

// IsEligibleForPayout checks whether a partner is legally cleared to receive payouts.
func IsEligibleForPayout(country string, status ComplianceStatus) PayoutEligibilityResult {
	c := strings.ToUpper(strings.TrimSpace(country))
	if c == "" {
		c = "US"
	}

	// Non-US accounts do not require IRS Form W-9
	if c != "US" {
		return PayoutEligibilityResult{Eligible: true}
	}

	if status == StatusVerified || status == StatusExempt {
		return PayoutEligibilityResult{Eligible: true}
	}

	if status == StatusRejected {
		return PayoutEligibilityResult{
			Eligible: false,
			Code:     "W9_REJECTED",
			Message:  "Payouts blocked: Your IRS Form W-9 was rejected due to a TIN mismatch. Please resubmit.",
		}
	}

	if status == StatusActionRequired {
		return PayoutEligibilityResult{
			Eligible: false,
			Code:     "W9_ACTION_REQUIRED",
			Message:  "Payouts blocked: Further documentation required for your tax verification.",
		}
	}

	return PayoutEligibilityResult{
		Eligible: false,
		Code:     "W9_REQUIRED",
		Message:  "Payouts blocked: A verified IRS Form W-9 is legally required before receiving payouts in the United States.",
	}
}
