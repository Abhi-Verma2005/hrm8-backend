/**
 * Domain Extraction Utilities
 * Used for extracting and validating company domains from websites
 */

/**
 * Extract domain from a website URL
 * @param website - Website URL (e.g., "https://www.tata.com" or "www.tata.com" or "tata.com")
 * @returns Extracted domain (e.g., "tata.com")
 */
export function extractDomain(website: string): string {
  try {
    // Remove protocol if present
    let domain = website.replace(/^https?:\/\//, '');
    
    // Remove www. prefix if present
    domain = domain.replace(/^www\./, '');
    
    // Remove trailing slashes and paths
    domain = domain.split('/')[0];
    
    // Remove port if present
    domain = domain.split(':')[0];
    
    // Remove whitespace
    domain = domain.trim().toLowerCase();
    
    return domain;
  } catch (error) {
    throw new Error(`Invalid website format: ${website}`);
  }
}

/**
 * Extract email domain from email address
 * @param email - Email address (e.g., "admin@tata.com")
 * @returns Email domain (e.g., "tata.com")
 */
export function extractEmailDomain(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) {
    throw new Error(`Invalid email format: ${email}`);
  }
  return parts[1].toLowerCase().trim();
}

/**
 * Check if email domain matches company domain
 * @param email - Email address
 * @param companyDomain - Company domain
 * @returns true if domains match
 */
export function isEmailDomainMatching(email: string, companyDomain: string): boolean {
  try {
    const emailDomain = extractEmailDomain(email);
    return emailDomain === companyDomain.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Validate if a domain is a valid format
 * @param domain - Domain to validate
 * @returns true if domain format is valid
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Check if two domains belong to the same organization
 * This compares the base domains (e.g., "tata.com" matches "tata.com")
 * @param domain1 - First domain
 * @param domain2 - Second domain
 * @returns true if domains belong to the same organization
 */
export function doDomainsBelongToSameOrg(domain1: string, domain2: string): boolean {
  try {
    // Normalize both domains
    const normalized1 = domain1.toLowerCase().trim();
    const normalized2 = domain2.toLowerCase().trim();
    
    // Direct match
    if (normalized1 === normalized2) {
      return true;
    }
    
    // Extract base domain (remove subdomains)
    // For example: "mail.tata.com" -> "tata.com"
    const getBaseDomain = (domain: string): string => {
      const parts = domain.split('.');
      // If domain has 2 or fewer parts, return as is
      if (parts.length <= 2) {
        return domain;
      }
      // Return last two parts (e.g., "tata.com" from "mail.tata.com")
      return parts.slice(-2).join('.');
    };
    
    const base1 = getBaseDomain(normalized1);
    const base2 = getBaseDomain(normalized2);
    
    return base1 === base2;
  } catch {
    return false;
  }
}

