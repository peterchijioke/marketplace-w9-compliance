package w9compliance

import "time"

// FederalTaxClassification represents IRS Form W-9 federal tax entities.
type FederalTaxClassification string

const (
	ClassificationIndividualSoleProp FederalTaxClassification = "INDIVIDUAL_SOLE_PROP"
	ClassificationCCorp              FederalTaxClassification = "C_CORP"
	ClassificationSCorp              FederalTaxClassification = "S_CORP"
	ClassificationPartnership        FederalTaxClassification = "PARTNERSHIP"
	ClassificationTrustEstate        FederalTaxClassification = "TRUST_ESTATE"
	ClassificationLLC                FederalTaxClassification = "LLC"
	ClassificationOther              FederalTaxClassification = "OTHER"
)

// TINType specifies SSN vs EIN.
type TINType string

const (
	TINTypeSSN TINType = "SSN"
	TINTypeEIN TINType = "EIN"
)

// ComplianceStatus represents partner tax onboarding verification state.
type ComplianceStatus string

const (
	StatusNotSubmitted   ComplianceStatus = "NOT_SUBMITTED"
	StatusPendingTINMatch ComplianceStatus = "PENDING_TIN_MATCH"
	StatusVerified       ComplianceStatus = "VERIFIED"
	StatusRejected       ComplianceStatus = "REJECTED"
	StatusActionRequired ComplianceStatus = "ACTION_REQUIRED"
	StatusExempt         ComplianceStatus = "EXEMPT"
)

// Address holds official US tax address lines.
type Address struct {
	AddressLine1 string `json:"addressLine1"`
	AddressLine2 string `json:"addressLine2,omitempty"`
	City         string `json:"city"`
	State        string `json:"state"`
	PostalCode   string `json:"postalCode"`
	Country      string `json:"country,omitempty"`
}

// W9FormData holds validated substitute Form W-9 data.
type W9FormData struct {
	LegalName                 string                   `json:"legalName"`
	BusinessName              string                   `json:"businessName,omitempty"`
	FederalTaxClassification  FederalTaxClassification `json:"federalTaxClassification"`
	LLCTaxClassification     string                   `json:"llcTaxClassification,omitempty"`
	ExemptPayeeCode           string                   `json:"exemptPayeeCode,omitempty"`
	FATCAExemptionCode        string                   `json:"fatcaExemptionCode,omitempty"`
	Address                   Address                  `json:"address"`
	TINType                   TINType                  `json:"tinType"`
	TIN                       string                   `json:"tin"`
	SignatureName             string                   `json:"signatureName"`
	CertificationAccepted     bool                     `json:"certificationAccepted"`
	SignedAt                  time.Time                `json:"signedAt"`
}

// EncryptedTINPayload holds the AES-256-GCM ciphertext along with safe masked previews.
type EncryptedTINPayload struct {
	Encrypted string  `json:"encrypted"` // ciphertext:iv:tag in hex
	Last4     string  `json:"last4"`
	Masked    string  `json:"masked"`
	TINType   TINType `json:"tinType"`
}

// PayoutEligibilityResult indicates whether a payee is legally cleared for withdrawals.
type PayoutEligibilityResult struct {
	Eligible bool   `json:"eligible"`
	Code     string `json:"code,omitempty"`
	Message  string `json:"message,omitempty"`
}
