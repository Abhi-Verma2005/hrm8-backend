/**
 * Email Validation Utilities
 */

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // More comprehensive email validation regex
  // Checks for: local-part@domain.extension
  // - Local part: alphanumeric, dots, hyphens, underscores, plus signs
  // - Domain: alphanumeric, dots, hyphens
  // - Extension: at least 2 characters, alphanumeric
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Additional checks
  if (email.length > 254) { // RFC 5321 limit
    return false;
  }
  
  if (email.startsWith('.') || email.startsWith('@') || email.endsWith('.') || email.endsWith('@')) {
    return false;
  }
  
  if (email.includes('..') || email.includes('@@')) {
    return false;
  }
  
  return emailRegex.test(email.trim());
}

/**
 * Normalize email (lowercase and trim)
 * @param email - Email address to normalize
 * @returns Normalized email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

