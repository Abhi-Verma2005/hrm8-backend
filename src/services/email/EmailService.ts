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
      
      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('📧 Verification Email (Development Mode):');
        console.log('To:', email);
        console.log('Subject:', mailOptions.subject);
        console.log('Verification URL:', verificationUrl);
        console.log('Token:', token);
        console.log('---');
      }
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

  /**
   * Send invitation email to employee
   */
  async sendInvitationEmail(
    email: string,
    token: string,
    companyName: string,
    invitationUrl: string
  ): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `You've been invited to join ${companyName} on HRM8`,
        html: this.getInvitationEmailTemplate(companyName, invitationUrl, token),
        text: this.getInvitationEmailText(companyName, invitationUrl, token),
      };

      await transporter.sendMail(mailOptions);
      
      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('📧 Invitation Email (Development Mode):');
        console.log('To:', email);
        console.log('Subject:', mailOptions.subject);
        console.log('Invitation URL:', invitationUrl);
        console.log('Token:', token);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error('Failed to send invitation email');
    }
  }

  /**
   * Get HTML template for invitation email
   */
  private getInvitationEmailTemplate(
    companyName: string,
    invitationUrl: string,
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
            <h1 style="color: #4a5568; margin-top: 0;">You've been invited!</h1>
            
            <p>Hello,</p>
            
            <p>You've been invited to join <strong>${companyName}</strong> on HRM8.</p>
            
            <p>To accept this invitation and create your account, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${invitationUrl}</p>
            
            <p>This invitation link will expire in 7 days.</p>
            
            <p>If you didn't expect this invitation, please ignore this email.</p>
            
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
   * Get plain text version of invitation email
   */
  private getInvitationEmailText(
    companyName: string,
    invitationUrl: string,
    _token: string
  ): string {
    return `
You've been invited!

Hello,

You've been invited to join ${companyName} on HRM8.

To accept this invitation and create your account, please visit:
${invitationUrl}

This invitation link will expire in 7 days.

If you didn't expect this invitation, please ignore this email.

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Send signup request notification to admin
   */
  async sendSignupRequestNotification(
    adminEmail: string,
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    requestId: string
  ): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      // Send admins to the dashboard page where they can approve or reject
      const reviewUrl = `${baseUrl}/signup-requests?requestId=${requestId}`;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: adminEmail,
        subject: `New Signup Request: ${employeeName} wants to join ${companyName}`,
        html: this.getSignupRequestNotificationTemplate(
          employeeEmail,
          employeeName,
          companyName,
          reviewUrl,
          requestId
        ),
        text: this.getSignupRequestNotificationText(
          employeeEmail,
          employeeName,
          companyName,
          reviewUrl,
          requestId
        ),
      };

      await transporter.sendMail(mailOptions);
      
      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('📧 Signup Request Notification (Development Mode):');
        console.log('To:', adminEmail);
        console.log('Subject:', mailOptions.subject);
        console.log('Employee:', employeeName, `(${employeeEmail})`);
        console.log('Review URL:', reviewUrl);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send signup request notification:', error);
      throw new Error('Failed to send signup request notification');
    }
  }

  /**
   * Get HTML template for signup request notification
   */
  private getSignupRequestNotificationTemplate(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    reviewUrl: string,
    _requestId: string
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
            <h1 style="color: #4a5568; margin-top: 0;">New Signup Request</h1>
            
            <p>Hello,</p>
            
            <p>A new employee has requested to join <strong>${companyName}</strong> on HRM8.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${employeeName}</p>
              <p><strong>Email:</strong> ${employeeEmail}</p>
            </div>
            
            <p>Please review this request in your admin dashboard. From there you can approve or reject it.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Review Request
              </a>
            </div>
            
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
   * Get plain text version of signup request notification
   */
  private getSignupRequestNotificationText(
    employeeEmail: string,
    employeeName: string,
    companyName: string,
    reviewUrl: string,
    _requestId: string
  ): string {
    return `
New Signup Request

Hello,

A new employee has requested to join ${companyName} on HRM8.

Name: ${employeeName}
Email: ${employeeEmail}

Please review this request in your admin dashboard. From there you can approve or reject it:
${reviewUrl}

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Send signup request approval email to employee
   */
  async sendSignupRequestApprovalEmail(
    email: string,
    name: string,
    companyName: string
  ): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const loginUrl = `${baseUrl}/login`;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `Your signup request has been approved - Welcome to ${companyName}!`,
        html: this.getSignupRequestApprovalTemplate(name, companyName, loginUrl),
        text: this.getSignupRequestApprovalText(name, companyName, loginUrl),
      };

      await transporter.sendMail(mailOptions);
      
      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('📧 Signup Request Approval (Development Mode):');
        console.log('To:', email);
        console.log('Subject:', mailOptions.subject);
        console.log('Login URL:', loginUrl);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send signup request approval email:', error);
      throw new Error('Failed to send signup request approval email');
    }
  }

  /**
   * Get HTML template for signup request approval email
   */
  private getSignupRequestApprovalTemplate(
    name: string,
    companyName: string,
    loginUrl: string
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
            <h1 style="color: #4a5568; margin-top: 0;">Welcome to ${companyName}!</h1>
            
            <p>Hello ${name},</p>
            
            <p>Great news! Your signup request to join <strong>${companyName}</strong> has been approved.</p>
            
            <p>You can now log in to your account using the password you set during signup.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Log In
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${loginUrl}</p>
            
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
   * Get plain text version of signup request approval email
   */
  private getSignupRequestApprovalText(
    name: string,
    companyName: string,
    loginUrl: string
  ): string {
    return `
Welcome to ${companyName}!

Hello ${name},

Great news! Your signup request to join ${companyName} has been approved.

You can now log in to your account using the password you set during signup.

Login URL: ${loginUrl}

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Send signup request rejection email to employee
   */
  async sendSignupRequestRejectionEmail(
    email: string,
    name: string,
    companyName: string,
    reason?: string
  ): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `Your signup request for ${companyName} has been reviewed`,
        html: this.getSignupRequestRejectionTemplate(name, companyName, reason),
        text: this.getSignupRequestRejectionText(name, companyName, reason),
      };

      await transporter.sendMail(mailOptions);
      
      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('📧 Signup Request Rejection (Development Mode):');
        console.log('To:', email);
        console.log('Subject:', mailOptions.subject);
        if (reason) {
          console.log('Reason:', reason);
        }
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send signup request rejection email:', error);
      throw new Error('Failed to send signup request rejection email');
    }
  }

  /**
   * Get HTML template for signup request rejection email
   */
  private getSignupRequestRejectionTemplate(
    name: string,
    companyName: string,
    reason?: string
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
            <h1 style="color: #4a5568; margin-top: 0;">Signup Request Update</h1>
            
            <p>Hello ${name},</p>
            
            <p>We're writing to inform you that your signup request to join <strong>${companyName}</strong> has been reviewed.</p>
            
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            
            <p>If you believe this is an error, please contact your company administrator.</p>
            
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
   * Get plain text version of signup request rejection email
   */
  private getSignupRequestRejectionText(
    name: string,
    companyName: string,
    reason?: string
  ): string {
    return `
Signup Request Update

Hello ${name},

We're writing to inform you that your signup request to join ${companyName} has been reviewed.

${reason ? `Reason: ${reason}\n\n` : ''}If you believe this is an error, please contact your company administrator.

Best regards,
The HRM8 Team
    `.trim();
  }
}

export const emailService = new EmailService();

