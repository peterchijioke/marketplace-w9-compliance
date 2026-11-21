package w9compliance

import (
	"testing"
)

func TestTINEncryption(t *testing.T) {
	secretKey := "my-super-secret-32-byte-key-w9!!"
	rawTIN := "123456789"

	payload, err := EncryptTIN(rawTIN, secretKey, TINTypeSSN)
	if err != nil {
		t.Fatalf("unexpected encrypt error: %v", err)
	}

	if payload.Last4 != "6789" {
		t.Errorf("expected last4 6789, got %s", payload.Last4)
	}
	if payload.Masked != "***-**-6789" {
		t.Errorf("expected masked ***-**-6789, got %s", payload.Masked)
	}

	decrypted, err := DecryptTIN(payload.Encrypted, secretKey)
	if err != nil {
		t.Fatalf("unexpected decrypt error: %v", err)
	}
	if decrypted != rawTIN {
		t.Errorf("expected decrypted %s, got %s", rawTIN, decrypted)
	}
}

func TestMaskTIN(t *testing.T) {
	if mask := MaskTIN("12-3456789", TINTypeEIN); mask != "**-***6789" {
		t.Errorf("expected **-***6789, got %s", mask)
	}
	if mask := MaskTIN("123-45-6789", TINTypeSSN); mask != "***-**-6789" {
		t.Errorf("expected ***-**-6789, got %s", mask)
	}
}

func TestPayoutEligibility(t *testing.T) {
	// Non-US accounts
	ng := IsEligibleForPayout("NG", StatusNotSubmitted)
	if !ng.Eligible {
		t.Errorf("expected NG to be eligible without W-9")
	}

	// US unverified accounts
	usUnsubmitted := IsEligibleForPayout("US", StatusNotSubmitted)
	if usUnsubmitted.Eligible || usUnsubmitted.Code != "W9_REQUIRED" {
		t.Errorf("expected US unsubmitted to be blocked")
	}

	// US verified accounts
	usVerified := IsEligibleForPayout("US", StatusVerified)
	if !usVerified.Eligible {
		t.Errorf("expected US verified to be eligible")
	}
}
