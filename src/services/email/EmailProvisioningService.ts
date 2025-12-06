/**
 * Email Provisioning Service
 * Handles creation of real mailboxes for consultants in Google Workspace or Microsoft 365.
 *
 * Provider is selected via EMAIL_IDP env:
 *  - "google"    -> Google Workspace (Admin SDK Directory API)
 *  - "microsoft" -> Microsoft 365 (Microsoft Graph API)
 *  - anything else / unset -> provisioning disabled (no-op)
 */

// We rely on Node's global fetch at runtime; declare for TypeScript.
declare const fetch: any;

import { google } from 'googleapis';
import { ClientSecretCredential } from '@azure/identity';

export type EmailIdpProvider = 'google' | 'microsoft';

export interface EmailProvisioningResult {
  success: boolean;
  provider?: EmailIdpProvider;
  email?: string;
  providerUserId?: string;
  tempPassword?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface EmailIdentityProvider {
  readonly provider: EmailIdpProvider;

  checkUserExists(email: string): Promise<boolean>;

  createUser(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<{
    email: string;
    providerUserId: string;
    tempPassword?: string;
  }>;
}

/**
 * Google Workspace implementation using Admin SDK Directory API.
 */
class GoogleWorkspaceIdp implements EmailIdentityProvider {
  public readonly provider: EmailIdpProvider = 'google';
  private adminClient: any = null;

  private async getClient() {
    if (this.adminClient) return this.adminClient;

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;

    if (!serviceAccountKey || !adminEmail) {
      throw new Error('Google Workspace email provisioning is misconfigured');
    }

    let credentials: { client_email: string; private_key: string };
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be a JSON string');
    }

    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
      subject: adminEmail,
    });

    await jwtClient.authorize();
    this.adminClient = google.admin({ version: 'directory_v1', auth: jwtClient });
    return this.adminClient;
  }

  async checkUserExists(email: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.users.get({ userKey: email });
      return true;
    } catch (error: any) {
      if (error?.code === 404) {
        return false;
      }
      console.error('GoogleWorkspaceIdp.checkUserExists error:', error);
      throw error;
    }
  }

  async createUser(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<{ email: string; providerUserId: string; tempPassword?: string }> {
    const client = await this.getClient();

    // NOTE: Keep temp password generation simple here; real strength / policy
    // should be enforced via Google admin policies.
    const tempPassword = `HrM8!${Math.random().toString(36).slice(2, 10)}`;

    const res = await client.users.insert({
      requestBody: {
        primaryEmail: email,
        name: {
          givenName: firstName,
          familyName: lastName,
        },
        password: tempPassword,
        changePasswordAtNextLogin: true,
      },
    });

    const user = res.data;

    return {
      email: user.primaryEmail || email,
      providerUserId: user.id || '',
      tempPassword,
    };
  }
}

/**
 * Microsoft 365 implementation using Microsoft Graph (client credentials flow).
 */
class Microsoft365Idp implements EmailIdentityProvider {
  public readonly provider: EmailIdpProvider = 'microsoft';
  private credential: ClientSecretCredential | null = null;

  private getCredential(): ClientSecretCredential {
    if (this.credential) return this.credential;

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Microsoft 365 email provisioning is misconfigured');
    }

    this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    return this.credential;
  }

  private async getAccessToken(): Promise<string> {
    const credential = this.getCredential();
    const token = await credential.getToken('https://graph.microsoft.com/.default');
    if (!token?.token) {
      throw new Error('Failed to obtain Microsoft Graph access token');
    }
    return token.token;
  }

  async checkUserExists(email: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 404) return false;
      if (!res.ok) {
        const body = await res.text();
        console.error('Microsoft365Idp.checkUserExists error:', res.status, body);
        throw new Error(`Graph error ${res.status}`);
      }

      return true;
    } catch (error) {
      console.error('Microsoft365Idp.checkUserExists unexpected error:', error);
      throw error;
    }
  }

  async createUser(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<{ email: string; providerUserId: string; tempPassword?: string }> {
    const accessToken = await this.getAccessToken();

    const tempPassword = `HrM8!${Math.random().toString(36).slice(2, 10)}`;
    const displayName = `${firstName} ${lastName}`.trim();
    const localPart = email.split('@')[0];

    const body = {
      accountEnabled: true,
      displayName,
      mailNickname: localPart,
      userPrincipalName: email,
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: tempPassword,
      },
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Microsoft365Idp.createUser error:', res.status, text);
      throw new Error(`Graph create user error ${res.status}`);
    }

    const user = (await res.json()) as { id?: string; userPrincipalName?: string };

    return {
      email: user.userPrincipalName || email,
      providerUserId: user.id || '',
      tempPassword,
    };
  }
}

/**
 * Factory + high-level provisioning API used by business services.
 */
export class EmailProvisioningService {
  private static getProvider(): EmailIdentityProvider | null {
    const idp = (process.env.EMAIL_IDP || '').toLowerCase();

    if (idp === 'google') {
      return new GoogleWorkspaceIdp();
    }

    if (idp === 'microsoft') {
      return new Microsoft365Idp();
    }

    return null;
  }

  /**
   * Provision mailbox for a consultant, if EMAIL_IDP is configured.
   *
   * Never throws: returns a structured result instead.
   */
  static async provisionEmail(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<EmailProvisioningResult> {
    const provider = this.getProvider();

    if (!provider) {
      // Provisioning disabled – treat as a no-op.
      return {
        success: false,
      };
    }

    try {
      const exists = await provider.checkUserExists(email);
      if (exists) {
        return {
          success: true,
          provider: provider.provider,
          email,
        };
      }

      const created = await provider.createUser(email, firstName, lastName);
      return {
        success: true,
        provider: provider.provider,
        email: created.email,
        providerUserId: created.providerUserId,
        tempPassword: created.tempPassword,
      };
    } catch (error: any) {
      const errMessage = error?.message || 'Unknown error';
      return {
        success: false,
        provider: provider.provider,
        email,
        errorMessage: errMessage,
      };
    }
  }
}


