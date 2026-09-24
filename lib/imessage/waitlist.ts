export const IMESSAGE_WAITLIST_CONSENT =
  'I agree to receive Daybreak iMessages about beta access. Message and data rates may apply. Reply STOP to opt out.';

export function normalizeImessagePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let phone = value.trim();
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  phone = phone.replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function maskImessagePhone(phone: string) {
  return `•••• ${phone.slice(-4)}`;
}
