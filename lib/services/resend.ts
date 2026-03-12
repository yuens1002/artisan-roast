import { Resend } from "resend";

let _resend: Resend | null = null;

/**
 * Returns the Resend client, or null if RESEND_API_KEY is not configured.
 * Lazily initializes the singleton on first call.
 */
export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Returns true if RESEND_API_KEY is set in environment variables.
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
