/**
 * Normalizes phone numbers to +91XXXXXXXXXX format for Indian numbers.
 * Supports 10-digit numbers and already formatted +91 numbers.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Strip all non-digits except +
  let cleaned = phone.replace(/[^\d+]/g, '').trim();
  
  // Strip leading 0 if followed by exactly 10 digits
  if (/^0\d{10}$/.test(cleaned)) {
    cleaned = cleaned.substring(1);
  }
  
  // If it's exactly 10 digits, prepend +91
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  
  // If it already starts with +91 and has 10 digits after it
  if (/^\+91\d{10}$/.test(cleaned)) {
    return cleaned;
  }
  
  // If it's 91 followed by 10 digits (no +)
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned;
}
