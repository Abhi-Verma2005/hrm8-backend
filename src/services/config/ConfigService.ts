import { SystemSettingsService } from '../hrm8/SystemSettingsService';

export class ConfigService {
  /**
   * Get Stripe Configuration
   */
  static async getStripeConfig() {
    const setting = await SystemSettingsService.getSetting('stripe_config');
    if (setting && setting.value) {
      const config = setting.value as any;
      if (config.secretKey) return config; // Return DB config if valid
    }

    // Fallback to env
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    };
  }

  /**
   * Get OpenAI Configuration
   */
  static async getOpenAIConfig() {
    const setting = await SystemSettingsService.getSetting('openai_config');
    if (setting && setting.value) {
      const config = setting.value as any;
      if (config.apiKey) return config;
    }

    return {
      apiKey: process.env.OPENAI_API_KEY,
    };
  }

  /**
   * Get Email Provider Configuration
   */
  static async getEmailConfig() {
    const setting = await SystemSettingsService.getSetting('email_config');
    if (setting && setting.value) {
      return setting.value as any;
    }

    // Fallback to env-based selection logic (legacy)
    // We return a structure that mimics what we want to store in DB
    return {
      provider: (process.env.EMAIL_IDP || '').toLowerCase(),
      google: {
        serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        adminEmail: process.env.GOOGLE_ADMIN_EMAIL,
      },
      microsoft: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
      }
    };
  }

  /**
   * Get Branding Configuration
   */
  static async getBrandingConfig() {
    const setting = await SystemSettingsService.getSetting('branding_config');
    if (setting && setting.value) {
      return setting.value;
    }

    // Default branding
    return {
      logoUrl: '/images/hrm8-logo.png', // Default path
      primaryColor: '#3B82F6', // Default blue
      companyName: 'HRM8',
    };
  }
}
