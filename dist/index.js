"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  decryptTin: () => decryptTin,
  encryptTin: () => encryptTin,
  generateSubstituteW9Html: () => generateSubstituteW9Html,
  isEligibleForPayout: () => isEligibleForPayout,
  maskTin: () => maskTin,
  validateW9Payload: () => validateW9Payload,
  verifyTrack1099Webhook: () => verifyTrack1099Webhook
});
module.exports = __toCommonJS(index_exports);

// src/crypto.ts
var crypto = __toESM(require("crypto"));
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 12;
function deriveKey(secret) {
  return crypto.createHash("sha256").update(secret).digest();
}
function maskTin(rawTin, type = "SSN") {
  const digits = rawTin.replace(/\D/g, "");
  if (digits.length !== 9) return "***-**-****";
  const last4 = digits.slice(-4);
  return type === "EIN" ? `**-***${last4}` : `***-**-${last4}`;
}
function encryptTin(rawTin, secretKey, type = "SSN") {
  if (!secretKey) {
    throw new Error("Encryption secretKey is required");
  }
  const cleanTin = rawTin.replace(/\D/g, "");
  if (cleanTin.length !== 9) {
    throw new Error("TIN must contain exactly 9 numeric digits");
  }
  const key = deriveKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(cleanTin, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  const encryptedString = `${encrypted}:${iv.toString("hex")}:${tag}`;
  const last4 = cleanTin.slice(-4);
  const masked = maskTin(cleanTin, type);
  return {
    encrypted: encryptedString,
    last4,
    masked,
    tinType: type
  };
}
function decryptTin(encryptedString, secretKey) {
  if (!secretKey) {
    throw new Error("Decryption secretKey is required");
  }
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format (expected ciphertext:iv:tag)");
  }
  const [ciphertext, ivHex, tagHex] = parts;
  const key = deriveKey(secretKey);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// src/validator.ts
var US_STATES = /* @__PURE__ */ new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY"
]);
function validateW9Payload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Invalid payload: expected an object"] };
  }
  const legalName = String(payload.legalName || "").trim();
  if (!legalName || legalName.length < 2) {
    errors.push("Legal Name (Line 1) is required");
  }
  const validClassifications = [
    "INDIVIDUAL_SOLE_PROP",
    "C_CORP",
    "S_CORP",
    "PARTNERSHIP",
    "TRUST_ESTATE",
    "LLC",
    "OTHER"
  ];
  if (!validClassifications.includes(payload.federalTaxClassification)) {
    errors.push(`Federal Tax Classification must be one of: ${validClassifications.join(", ")}`);
  }
  if (payload.federalTaxClassification === "LLC" && !["C", "S", "P"].includes(payload.llcTaxClassification)) {
    errors.push("LLC Tax Classification (C, S, or P) is required when entity is LLC");
  }
  const addr = payload.address;
  if (!addr || typeof addr !== "object") {
    errors.push("Address is required");
  } else {
    if (!addr.addressLine1 || String(addr.addressLine1).trim().length < 3) {
      errors.push("Address Line 1 is required");
    }
    if (!addr.city || String(addr.city).trim().length < 2) {
      errors.push("City is required");
    }
    const state = String(addr.state || "").trim().toUpperCase();
    if (!state || !US_STATES.has(state)) {
      errors.push("Valid 2-letter US State abbreviation is required");
    }
    const postalCode = String(addr.postalCode || "").trim();
    if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
      errors.push("Postal Code must be 5 digits (e.g. 90210) or ZIP+4");
    }
  }
  const tinType = payload.tinType === "EIN" ? "EIN" : "SSN";
  const cleanTin = String(payload.tin || "").replace(/\D/g, "");
  if (cleanTin.length !== 9) {
    errors.push("TIN must be exactly 9 digits");
  } else {
    if (/^000|666|^9/.test(cleanTin) && tinType === "SSN") {
      errors.push("Invalid SSN prefix");
    }
    if (/^00/.test(cleanTin) && tinType === "EIN") {
      errors.push("Invalid EIN prefix");
    }
  }
  if (!payload.certificationAccepted) {
    errors.push("You must accept the perjury statement certification");
  }
  const signatureName = String(payload.signatureName || "").trim();
  if (!signatureName || signatureName.length < 2) {
    errors.push("Electronic Signature Name is required");
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  const sanitized = {
    legalName,
    businessName: payload.businessName ? String(payload.businessName).trim() : void 0,
    federalTaxClassification: payload.federalTaxClassification,
    llcTaxClassification: payload.llcTaxClassification,
    exemptPayeeCode: payload.exemptPayeeCode,
    fatcaExemptionCode: payload.fatcaExemptionCode,
    address: {
      addressLine1: String(addr.addressLine1).trim(),
      addressLine2: addr.addressLine2 ? String(addr.addressLine2).trim() : void 0,
      city: String(addr.city).trim(),
      state: String(addr.state).trim().toUpperCase(),
      postalCode: String(addr.postalCode).trim(),
      country: addr.country || "US"
    },
    tinType,
    tin: cleanTin,
    signatureName,
    certificationAccepted: true,
    signedAt: payload.signedAt ? new Date(payload.signedAt) : /* @__PURE__ */ new Date()
  };
  return { valid: true, errors: [], sanitized };
}

// src/payout-guard.ts
function isEligibleForPayout(params) {
  const country = (params.country || "US").trim().toUpperCase();
  if (country !== "US") {
    return { eligible: true };
  }
  if (params.status === "VERIFIED" || params.status === "EXEMPT") {
    return { eligible: true };
  }
  if (params.status === "REJECTED") {
    return {
      eligible: false,
      code: "W9_REJECTED",
      message: "Payouts blocked: Your IRS Form W-9 was rejected due to a TIN mismatch. Please resubmit."
    };
  }
  if (params.status === "ACTION_REQUIRED") {
    return {
      eligible: false,
      code: "W9_ACTION_REQUIRED",
      message: "Payouts blocked: Further documentation required for your tax verification."
    };
  }
  return {
    eligible: false,
    code: "W9_REQUIRED",
    message: "Payouts blocked: A verified IRS Form W-9 is legally required before receiving payouts in the United States."
  };
}

// src/track1099.ts
var crypto2 = __toESM(require("crypto"));
function verifyTrack1099Webhook(options) {
  const { payload, signature, webhookSecret } = options;
  if (!signature || !webhookSecret) return false;
  const rawBody = typeof payload === "string" ? payload : payload.toString("utf8");
  const expectedSignature = crypto2.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  const expBuffer = Buffer.from(expectedSignature, "hex");
  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }
  return crypto2.timingSafeEqual(sigBuffer, expBuffer);
}

// src/document.ts
function generateSubstituteW9Html(data, options) {
  const platform = options?.platformName || "Marketplace Platform";
  const displayTin = options?.maskedTin || maskTin(data.tin, data.tinType);
  const signDate = data.signedAt ? new Date(data.signedAt).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IRS Substitute Form W-9</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 40px; line-height: 1.5; font-size: 13px; }
    .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .title p { margin: 2px 0 0 0; font-size: 11px; color: #4B5563; }
    .box { border: 1px solid #9CA3AF; padding: 12px; margin-bottom: 16px; border-radius: 4px; }
    .row { display: flex; margin-bottom: 8px; }
    .label { font-weight: 700; width: 220px; color: #374151; }
    .val { flex: 1; }
    .tin-box { background-color: #F3F4F6; border: 1px dashed #6B7280; padding: 12px; margin: 16px 0; font-family: monospace; font-size: 16px; letter-spacing: 2px; }
    .certification { font-size: 11px; color: #4B5563; border-top: 1px solid #D1D5DB; padding-top: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h1>Form W-9 (Substitute)</h1>
      <p>Request for Taxpayer Identification Number and Certification</p>
    </div>
    <div style="text-align: right; font-size: 11px;">
      <div><strong>Platform:</strong> ${platform}</div>
      <div><strong>Rev:</strong> March 2024</div>
    </div>
  </div>

  <div class="box">
    <div class="row"><div class="label">1. Legal Name:</div><div class="val">${data.legalName}</div></div>
    ${data.businessName ? `<div class="row"><div class="label">2. Business / Trade Name:</div><div class="val">${data.businessName}</div></div>` : ""}
    <div class="row"><div class="label">3. Federal Tax Classification:</div><div class="val">${data.federalTaxClassification}${data.llcTaxClassification ? ` (${data.llcTaxClassification})` : ""}</div></div>
    <div class="row"><div class="label">4. Address:</div><div class="val">${data.address.addressLine1}${data.address.addressLine2 ? `, ${data.address.addressLine2}` : ""}</div></div>
    <div class="row"><div class="label">5. City, State, ZIP:</div><div class="val">${data.address.city}, ${data.address.state} ${data.address.postalCode}</div></div>
  </div>

  <div class="box">
    <div style="font-weight: 700; margin-bottom: 4px;">Part I: Taxpayer Identification Number (TIN)</div>
    <div class="tin-box">
      <strong>${data.tinType}:</strong> ${displayTin}
    </div>
  </div>

  <div class="box">
    <div style="font-weight: 700; margin-bottom: 4px;">Part II: Certification</div>
    <div class="certification">
      Under penalties of perjury, I certify that:
      1. The number shown on this form is my correct taxpayer identification number;
      2. I am not subject to backup withholding; and
      3. I am a U.S. citizen or other U.S. person.
    </div>
    <div style="margin-top: 16px; display: flex; justify-content: space-between;">
      <div><strong>Electronic Signature:</strong> ${data.signatureName}</div>
      <div><strong>Date Signed:</strong> ${signDate}</div>
    </div>
  </div>
</body>
</html>`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  decryptTin,
  encryptTin,
  generateSubstituteW9Html,
  isEligibleForPayout,
  maskTin,
  validateW9Payload,
  verifyTrack1099Webhook
});
//# sourceMappingURL=index.js.map