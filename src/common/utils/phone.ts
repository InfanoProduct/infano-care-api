/**
 * Normalizes phone numbers to +91XXXXXXXXXX format for Indian numbers.
 * Supports 10-digit numbers and already formatted +91 numbers.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  const trimmed = phone.trim();
  
  // If it's exactly 10 digits, prepend +91
  if (/^\d{10}$/.test(trimmed)) {
    return `+91${trimmed}`;
  }
  
  // If it already starts with +91 and has 10 digits after it
  if (/^\+91\d{10}$/.test(trimmed)) {
    return trimmed;
  }
  
  // If it's 91 followed by 10 digits (no +)
  if (/^91\d{10}$/.test(trimmed)) {
    return `+${trimmed}`;
  }

  return trimmed;
}
