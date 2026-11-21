package w9compliance

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"regexp"
	"strings"
)

var nonDigitsRegex = regexp.MustCompile(`\D`)

// MaskTIN masks an SSN (***-**-1234) or EIN (**-***1234).
func MaskTIN(rawTIN string, tinType TINType) string {
	digits := nonDigitsRegex.ReplaceAllString(rawTIN, "")
	if len(digits) != 9 {
		return "***-**-****"
	}
	last4 := digits[len(digits)-4:]
	if tinType == TINTypeEIN {
		return fmt.Sprintf("**-***%s", last4)
	}
	return fmt.Sprintf("***-**-%s", last4)
}

func deriveKey(secretKey string) []byte {
	hash := sha256.Sum256([]byte(secretKey))
	return hash[:]
}

// EncryptTIN encrypts a 9-digit TIN using AES-256-GCM authenticated encryption.
func EncryptTIN(rawTIN, secretKey string, tinType TINType) (*EncryptedTINPayload, error) {
	if secretKey == "" {
		return nil, fmt.Errorf("encryption secretKey is required")
	}
	cleanTIN := nonDigitsRegex.ReplaceAllString(rawTIN, "")
	if len(cleanTIN) != 9 {
		return nil, fmt.Errorf("TIN must contain exactly 9 numeric digits")
	}

	key := deriveKey(secretKey)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Seal appends the ciphertext and 16-byte auth tag
	sealed := aesGCM.Seal(nil, nonce, []byte(cleanTIN), nil)
	tagSize := aesGCM.Overhead()
	ciphertext := sealed[:len(sealed)-tagSize]
	tag := sealed[len(sealed)-tagSize:]

	encryptedString := fmt.Sprintf("%s:%s:%s",
		hex.EncodeToString(ciphertext),
		hex.EncodeToString(nonce),
		hex.EncodeToString(tag),
	)

	return &EncryptedTINPayload{
		Encrypted: encryptedString,
		Last4:     cleanTIN[len(cleanTIN)-4:],
		Masked:    MaskTIN(cleanTIN, tinType),
		TINType:   tinType,
	}, nil
}

// DecryptTIN decrypts an AES-256-GCM formatted ciphertext:nonce:tag string.
func DecryptTIN(encryptedString, secretKey string) (string, error) {
	if secretKey == "" {
		return "", fmt.Errorf("decryption secretKey is required")
	}
	parts := strings.Split(encryptedString, ":")
	if len(parts) != 3 {
		return "", fmt.Errorf("invalid encrypted payload format (expected ciphertext:nonce:tag)")
	}

	ciphertext, err := hex.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("invalid ciphertext hex: %w", err)
	}
	nonce, err := hex.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid nonce hex: %w", err)
	}
	tag, err := hex.DecodeString(parts[2])
	if err != nil {
		return "", fmt.Errorf("invalid tag hex: %w", err)
	}

	key := deriveKey(secretKey)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Recombine ciphertext + tag for Go's Open method
	payload := append(ciphertext, tag...)
	plaintext, err := aesGCM.Open(nil, nonce, payload, nil)
	if err != nil {
		return "", fmt.Errorf("failed to authenticate and decrypt TIN: %w", err)
	}

	return string(plaintext), nil
}
