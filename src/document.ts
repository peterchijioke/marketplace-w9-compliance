import { W9FormData } from './types';
import { maskTin } from './crypto';

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates an audit-ready, printable IRS Substitute Form W-9 HTML document.
 */
export function generateSubstituteW9Html(
  data: W9FormData,
  options?: { maskedTin?: string; platformName?: string }
): string {
  const platform = escapeHtml(options?.platformName || 'Marketplace Platform');
  const displayTin = escapeHtml(options?.maskedTin || maskTin(data.tin, data.tinType));
  const signDate = escapeHtml(
    data.signedAt
      ? new Date(data.signedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const legalName = escapeHtml(data.legalName);
  const businessName = data.businessName ? escapeHtml(data.businessName) : '';
  const taxClass = escapeHtml(data.federalTaxClassification);
  const llcClass = data.llcTaxClassification ? escapeHtml(data.llcTaxClassification) : '';
  const addressLine1 = escapeHtml(data.address.addressLine1);
  const addressLine2 = data.address.addressLine2 ? escapeHtml(data.address.addressLine2) : '';
  const city = escapeHtml(data.address.city);
  const state = escapeHtml(data.address.state);
  const postalCode = escapeHtml(data.address.postalCode);
  const tinType = escapeHtml(data.tinType);
  const signatureName = escapeHtml(data.signatureName);

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
    <div class="row"><div class="label">1. Legal Name:</div><div class="val">${legalName}</div></div>
    ${businessName ? `<div class="row"><div class="label">2. Business / Trade Name:</div><div class="val">${businessName}</div></div>` : ''}
    <div class="row"><div class="label">3. Federal Tax Classification:</div><div class="val">${taxClass}${llcClass ? ` (${llcClass})` : ''}</div></div>
    <div class="row"><div class="label">4. Address:</div><div class="val">${addressLine1}${addressLine2 ? `, ${addressLine2}` : ''}</div></div>
    <div class="row"><div class="label">5. City, State, ZIP:</div><div class="val">${city}, ${state} ${postalCode}</div></div>
  </div>

  <div class="box">
    <div style="font-weight: 700; margin-bottom: 4px;">Part I: Taxpayer Identification Number (TIN)</div>
    <div class="tin-box">
      <strong>${tinType}:</strong> ${displayTin}
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
      <div><strong>Electronic Signature:</strong> ${signatureName}</div>
      <div><strong>Date Signed:</strong> ${signDate}</div>
    </div>
  </div>
</body>
</html>`;
}
