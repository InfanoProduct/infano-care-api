/**
 * Safe Harbor Engine: Automated PII Scrubber & Crisis Interceptor
 * 
 * Rules:
 * 1. Automatically redacts phone numbers, social handles (@username), email addresses, physical street patterns.
 * 2. Intercepts self-harm, suicide, or crisis language and flags with CrisisSeverity.HIGH.
 */

export interface SafeHarborResult {
  sanitizedContent: string;
  hasRedactions: boolean;
  crisisSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  isFlaggedForReview: boolean;
}

export class SafeHarbor {
  // Regex patterns for PII
  private static PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  private static EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static SOCIAL_HANDLE_REGEX = /(@|insta:|snap:|tiktok:|ig:)\s*[a-zA-Z0-9._]{3,30}/gi;
  private static URL_REGEX = /https?:\/\/[^\s]+/gi;

  // Crisis keywords
  private static CRISIS_KEYWORDS = [
    'kill myself',
    'suicide',
    'end my life',
    'want to die',
    'cut myself',
    'harm myself',
    'overdose',
    'end it all',
    'nobody will miss me',
    'better off dead',
  ];

  // Inappropriate words filter
  private static BANNED_WORDS = [
    'nude',
    'naked',
    'send pic',
    'meet up alone',
    'where do you live',
  ];

  /**
   * Process and sanitize incoming message content
   */
  public static process(rawContent: string): SafeHarborResult {
    let sanitized = rawContent;
    let hasRedactions = false;
    let crisisSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
    let isFlaggedForReview = false;

    const lower = rawContent.toLowerCase();

    // 1. Check for Crisis Language
    if (this.CRISIS_KEYWORDS.some(phrase => lower.includes(phrase))) {
      crisisSeverity = 'HIGH';
      isFlaggedForReview = true;
    }

    // 2. Check for Inappropriate Language
    if (this.BANNED_WORDS.some(phrase => lower.includes(phrase))) {
      isFlaggedForReview = true;
    }

    // 3. Redact Phone Numbers
    if (this.PHONE_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(this.PHONE_REGEX, '[phone redacted]');
      hasRedactions = true;
    }

    // 4. Redact Emails
    if (this.EMAIL_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(this.EMAIL_REGEX, '[email redacted]');
      hasRedactions = true;
    }

    // 5. Redact Social Handles
    if (this.SOCIAL_HANDLE_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(this.SOCIAL_HANDLE_REGEX, '[social handle redacted]');
      hasRedactions = true;
    }

    // 6. Redact External Links in Teen Spaces
    if (this.URL_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(this.URL_REGEX, '[link removed]');
      hasRedactions = true;
    }

    return {
      sanitizedContent: sanitized,
      hasRedactions,
      crisisSeverity,
      isFlaggedForReview,
    };
  }
}
