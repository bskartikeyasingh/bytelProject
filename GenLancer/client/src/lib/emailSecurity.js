/**
 * Email Security & Disposable Email Protection Utility
 * 
 * Provides:
 * 1. RFC 5322 standard email format validation.
 * 2. Rejection of known throwaway / disposable / temporary inbox services.
 * 3. Safe email masking for UI display.
 * 4. Preservation of legitimate business and personal domains.
 */

// Comprehensive list of known disposable / temporary email domains
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'tempmail.net',
  'temp-mail.io',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  '10minutemail.com',
  '10minutemail.net',
  '10minmail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'dispostable.com',
  'getairmail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'crazymailing.com',
  'maildrop.cc',
  'inboxkitten.com',
  'burnerdirect.com',
  'tempail.com',
  'mohmal.com',
  'dropmail.me',
  'emailondeck.com',
  'generator.email',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'tinmail.net',
  'nada.ltd',
  'nada.email',
  'getnada.com',
  'inboxbear.com',
  'disposablemail.com',
  'fakemail.net',
  'emailfake.com',
  'mytemp.email',
  'burnermail.io',
  'minuteinbox.com',
  'mohmal.im',
  'crazymail.com',
  'tempinbox.com',
  'tmail.ws',
  'zillamail.com'
]);

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate email syntax
 */
export function validateEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }

  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address exceeds maximum length (254 characters).' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address (e.g., name@company.com).' };
  }

  return { valid: true, sanitized: trimmed.toLowerCase() };
}

/**
 * Check if the email domain belongs to a known disposable provider
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];
  
  // Direct domain match
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Check subdomains (e.g. mail.mailinator.com)
  for (const disposable of DISPOSABLE_DOMAINS) {
    if (domain.endsWith(`.${disposable}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Full pre-registration email validation
 */
export function validateRegistrationEmail(email) {
  const formatCheck = validateEmailFormat(email);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  if (isDisposableEmail(formatCheck.sanitized)) {
    return {
      valid: false,
      error: 'Temporary and disposable email addresses are not permitted. Please use a verified work or personal email address.'
    };
  }

  return {
    valid: true,
    sanitized: formatCheck.sanitized
  };
}

/**
 * Safely masks an email address for public display on verification screens
 * Example: 'alex.rivera@brandcorp.com' -> 'a***a@brandcorp.com'
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'your email';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return email;

  const [username, domain] = parts;
  if (username.length <= 2) {
    return `${username[0]}*@${domain}`;
  }

  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  return `${firstChar}***${lastChar}@${domain}`;
}
