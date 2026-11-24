import * as crypto from 'crypto';

export interface Track1099WebhookOptions {
  payload: string | Buffer;
  signature: string;
  webhookSecret: string;
}

/**
 * Validates an HMAC-SHA256 signature from Avalara Track1099 or compatible tax webhook providers.
 */
export function verifyTrack1099Webhook(options: Track1099WebhookOptions): boolean {
  const { payload, signature, webhookSecret } = options;
  if (!signature || !webhookSecret) return false;

  const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const normalizedSig = signature.replace(/^sha256=/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(normalizedSig)) {
    return false;
  }

  const sigBuffer = Buffer.from(normalizedSig, 'hex');
  const expBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}
