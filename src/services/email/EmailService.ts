/**
 * Email Service
 * Handles sending emails for verification, invitations, etc.
 */

import nodemailer from 'nodemailer';

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // For development, use console logging
    // For production, configure SMTP settings
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    };

    // If no SMTP credentials, use a test account (for development)
    if (!emailConfig.auth) {
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
      });
    }

    return this.transporter;
  }

  /**
   * Send verification email to company admin
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    companyName: string,
    verificationUrl: string
  ): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `Verify Your Company: ${companyName}`,
        html: this.getVerificationEmailTemplate(companyName, verificationUrl, token),
        text: this.getVerificationEmailText(companyName, verificationUrl, token),
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Get HTML template for verification email
   */
  private getVerificationEmailTemplate(
    companyName: string,
    verificationUrl: string,
    _token: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Verify Your Company</h1>
            
            <p>Hello,</p>
            
            <p>Thank you for registering <strong>${companyName}</strong> on HRM8.</p>
            
            <p>To complete your registration and verify your company, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Company
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${verificationUrl}</p>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <p>If you didn't register this company, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The HRM8 Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of verification email
   */
  private getVerificationEmailText(
    companyName: string,
    verificationUrl: string,
    _token: string
  ): string {
    return `
Verify Your Company

Hello,

Thank you for registering ${companyName} on HRM8.

To complete your registration and verify your company, please visit:
${verificationUrl}

This verification link will expire in 24 hours.

If you didn't register this company, please ignore this email.

Best regards,
The HRM8 Team
    `.trim();
  }
}

export const emailService = new EmailService();

