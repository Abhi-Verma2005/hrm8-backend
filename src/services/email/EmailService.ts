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
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim().replace(/^["']|["']$/g, ''), // Remove quotes if present
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
   * Send password reset email with secure link
   */
  async sendPasswordResetEmail(data: {
    to: string;
    name: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: 'Reset your HRM8 password',
        html: this.getPasswordResetTemplate(data.name, data.resetUrl, data.expiresAt),
        text: this.getPasswordResetText(data.name, data.resetUrl, data.expiresAt),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Password Reset Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Reset URL:', data.resetUrl);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send password change confirmation
   */
  async sendPasswordChangeConfirmation(data: {
    to: string;
    name: string;
    changedAt: Date;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: 'Your HRM8 password was changed',
        html: this.getPasswordChangedTemplate(data.name, data.changedAt),
        text: this.getPasswordChangedText(data.name, data.changedAt),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Password Changed Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Changed At:', data.changedAt.toISOString());
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send password change confirmation:', error);
      throw new Error('Failed to send password change confirmation');
    }
  }

  /**
   * Send application confirmation email with login details
   */
  async sendApplicationConfirmationEmail(data: {
    to: string;
    name: string;
    jobTitle: string;
    applicationId: string;
    applicationTrackingUrl: string;
    loginEmail: string;
    loginPassword: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Application Submitted: ${data.jobTitle}`,
        html: this.getApplicationConfirmationTemplate(data),
        text: this.getApplicationConfirmationText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Application Confirmation Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Application ID:', data.applicationId);
        console.log('Tracking URL:', data.applicationTrackingUrl);
        console.log('Login Email:', data.loginEmail);
        console.log('Login Password:', data.loginPassword);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send application confirmation email:', error);
      throw new Error('Failed to send application confirmation email');
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
   * Get HTML template for password reset email
   */
  private getPasswordResetTemplate(name: string, resetUrl: string, expiresAt: Date): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Reset your password</h1>
            
            <p>Hello ${name || 'there'},</p>
            
            <p>We received a request to reset the password for your HRM8 account. Click the button below to choose a new password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset password
              </a>
            </div>
            
            <p>If you did not request a password reset, you can safely ignore this email. This link will expire on <strong>${expiresAt.toUTCString()}</strong>.</p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${resetUrl}</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              If you continue to receive unexpected password reset emails, please contact support immediately.
            </p>
            
            <p style="color: #718096; font-size: 14px;">
              Stay secure,<br>
              The HRM8 Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetText(name: string, resetUrl: string, expiresAt: Date): string {
    return `
Password Reset

Hello ${name || 'there'},

We received a request to reset the password for your HRM8 account. Visit the link below to choose a new password:
${resetUrl}

This link will expire on ${expiresAt.toUTCString()}.

If you didn't request this, please ignore this email.

Stay secure,
The HRM8 Team
    `.trim();
  }

  private getPasswordChangedTemplate(name: string, changedAt: Date): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Your password was changed</h1>
            
            <p>Hello ${name || 'there'},</p>
            
            <p>This is a confirmation that your HRM8 password was changed on <strong>${changedAt.toUTCString()}</strong>.</p>
            
            <p>If you made this change, no further action is required.</p>
            <p>If you did not change your password, please reset it immediately or contact support.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              Stay secure,<br>
              The HRM8 Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordChangedText(name: string, changedAt: Date): string {
    return `
Password Changed

Hello ${name || 'there'},

This is a confirmation that your HRM8 password was changed on ${changedAt.toUTCString()}.

If you made this change, no further action is required. If you did not change your password, please reset it immediately or contact support.

Stay secure,
The HRM8 Team
    `.trim();
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

  /**
   * Send hiring team invitation email
   */
  async sendHiringTeamInvitation(data: {
    to: string;
    name: string;
    jobTitle: string;
    role: string;
    permissions: {
      canViewApplications: boolean;
      canShortlist: boolean;
      canScheduleInterviews: boolean;
      canMakeOffers: boolean;
    };
    invitationToken: string;
    inviterName: string;
    companyName?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const invitationUrl = `${baseUrl}/accept-invitation?token=${data.invitationToken}`;

      const permissionsList = [];
      if (data.permissions.canViewApplications) permissionsList.push('View Applications');
      if (data.permissions.canShortlist) permissionsList.push('Shortlist Candidates');
      if (data.permissions.canScheduleInterviews) permissionsList.push('Schedule Interviews');
      if (data.permissions.canMakeOffers) permissionsList.push('Make Offers');

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `You've been invited to join the hiring team for: ${data.jobTitle}`,
        html: this.getHiringTeamInvitationTemplate(data, invitationUrl, permissionsList),
        text: this.getHiringTeamInvitationText(data, invitationUrl, permissionsList),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Hiring Team Invitation Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Invitation URL:', invitationUrl);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send hiring team invitation email:', error);
      throw new Error('Failed to send hiring team invitation email');
    }
  }

  /**
   * Send hiring team notification (for existing users)
   */
  async sendHiringTeamNotification(data: {
    to: string;
    name: string;
    jobTitle: string;
    role: string;
    permissions: {
      canViewApplications: boolean;
      canShortlist: boolean;
      canScheduleInterviews: boolean;
      canMakeOffers: boolean;
    };
    inviterName: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

      const permissionsList = [];
      if (data.permissions.canViewApplications) permissionsList.push('View Applications');
      if (data.permissions.canShortlist) permissionsList.push('Shortlist Candidates');
      if (data.permissions.canScheduleInterviews) permissionsList.push('Schedule Interviews');
      if (data.permissions.canMakeOffers) permissionsList.push('Make Offers');

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `You've been added to the hiring team for: ${data.jobTitle}`,
        html: this.getHiringTeamNotificationTemplate(data, baseUrl, permissionsList),
        text: this.getHiringTeamNotificationText(data, baseUrl, permissionsList),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Hiring Team Notification Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send hiring team notification email:', error);
      throw new Error('Failed to send hiring team notification email');
    }
  }

  /**
   * Get HTML template for hiring team invitation email
   */
  private getHiringTeamInvitationTemplate(
    data: {
      name: string;
      jobTitle: string;
      role: string;
      inviterName: string;
      companyName?: string;
    },
    invitationUrl: string,
    permissionsList: string[]
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
            <h1 style="color: #4a5568; margin-top: 0;">You've been invited to join a hiring team!</h1>
            
            <p>Hello ${data.name},</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join the hiring team for the position:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">Role: ${data.role}</p>
            </div>
            
            <p><strong>Your permissions:</strong></p>
            <ul style="margin: 10px 0;">
              ${permissionsList.map(perm => `<li>${perm}</li>`).join('')}
            </ul>
            
            <p>To accept this invitation and create your account, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${invitationUrl}</p>
            
            <p style="color: #718096; font-size: 14px;">This invitation link will expire in 7 days.</p>
            
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
   * Get plain text version of hiring team invitation email
   */
  private getHiringTeamInvitationText(
    data: {
      name: string;
      jobTitle: string;
      role: string;
      inviterName: string;
      companyName?: string;
    },
    invitationUrl: string,
    permissionsList: string[]
  ): string {
    return `
You've been invited to join a hiring team!

Hello ${data.name},

${data.inviterName} has invited you to join the hiring team for the position: ${data.jobTitle}

Role: ${data.role}

Your permissions:
${permissionsList.map(perm => `- ${perm}`).join('\n')}

To accept this invitation and create your account, please visit:
${invitationUrl}

This invitation link will expire in 7 days.

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Get HTML template for hiring team notification email
   */
  private getHiringTeamNotificationTemplate(
    data: {
      name: string;
      jobTitle: string;
      role: string;
      inviterName: string;
    },
    baseUrl: string,
    permissionsList: string[]
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
            <h1 style="color: #4a5568; margin-top: 0;">You've been added to a hiring team!</h1>
            
            <p>Hello ${data.name},</p>
            
            <p><strong>${data.inviterName}</strong> has added you to the hiring team for the position:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">Role: ${data.role}</p>
            </div>
            
            <p><strong>Your permissions:</strong></p>
            <ul style="margin: 10px 0;">
              ${permissionsList.map(perm => `<li>${perm}</li>`).join('')}
            </ul>
            
            <p>You can now access this job and manage applications in your HRM8 dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/jobs" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Job
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
   * Get plain text version of hiring team notification email
   */
  private getHiringTeamNotificationText(
    data: {
      name: string;
      jobTitle: string;
      role: string;
      inviterName: string;
    },
    baseUrl: string,
    permissionsList: string[]
  ): string {
    return `
You've been added to a hiring team!

Hello ${data.name},

${data.inviterName} has added you to the hiring team for the position: ${data.jobTitle}

Role: ${data.role}

Your permissions:
${permissionsList.map(perm => `- ${perm}`).join('\n')}

You can now access this job and manage applications in your HRM8 dashboard.

Visit: ${baseUrl}/jobs

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Send job invitation email to candidate (non-user)
   */
  async sendJobInvitationEmail(data: {
    to: string;
    jobTitle: string;
    companyName: string;
    jobUrl: string;
    recruiterName?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `You've been invited to apply: ${data.jobTitle} at ${data.companyName}`,
        html: this.getJobInvitationTemplate(data),
        text: this.getJobInvitationText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Job Invitation Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Job URL:', data.jobUrl);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send job invitation email:', error);
      throw new Error('Failed to send job invitation email');
    }
  }

  /**
   * Get HTML template for job invitation email
   */
  private getJobInvitationTemplate(data: {
    jobTitle: string;
    companyName: string;
    jobUrl: string;
    recruiterName?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">You've been invited to apply!</h1>
            
            <p>Hello,</p>
            
            ${data.recruiterName ? `<p><strong>${data.recruiterName}</strong> from <strong>${data.companyName}</strong> has invited you to apply for a position that matches your profile.</p>` : `<p><strong>${data.companyName}</strong> has invited you to apply for a position that matches your profile.</p>`}
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            <p>We think you'd be a great fit for this role. Click the button below to view the job details and submit your application.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.jobUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Job & Apply
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${data.jobUrl}</p>
            
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
   * Get plain text version of job invitation email
   */
  private getJobInvitationText(data: {
    jobTitle: string;
    companyName: string;
    jobUrl: string;
    recruiterName?: string;
  }): string {
    return `
You've been invited to apply!

Hello,

${data.recruiterName ? `${data.recruiterName} from ${data.companyName} has invited you to apply for a position that matches your profile.` : `${data.companyName} has invited you to apply for a position that matches your profile.`}

Position: ${data.jobTitle}
Company: ${data.companyName}

We think you'd be a great fit for this role. Visit the link below to view the job details and submit your application:

${data.jobUrl}

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Get HTML template for application confirmation email
   */
  private getApplicationConfirmationTemplate(data: {
    name: string;
    jobTitle: string;
    applicationId: string;
    applicationTrackingUrl: string;
    loginEmail: string;
    loginPassword: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Application Submitted Successfully!</h1>
            
            <p>Hello ${data.name || 'there'},</p>
            
            <p>Thank you for applying to <strong>${data.jobTitle}</strong> on HRM8. Your application has been received and is being reviewed.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">Application Details</h2>
              <p style="margin: 10px 0 5px 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
              <p style="margin: 5px 0;"><strong>Position:</strong> ${data.jobTitle}</p>
            </div>
            
            <h2 style="color: #4a5568; margin-top: 30px;">Track Your Application</h2>
            <p>You can track the status of your application at any time:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.applicationTrackingUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Application Status
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${data.applicationTrackingUrl}</p>
            
            <h2 style="color: #4a5568; margin-top: 30px;">Your Account Details</h2>
            <p>We've created an account for you so you can track your application and apply to more jobs. Here are your login credentials:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.loginEmail}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${data.loginPassword}</p>
            </div>
            
            <p style="color: #e53e3e; font-weight: bold;">⚠️ Please save this password in a secure location. For security reasons, we recommend changing it after your first login.</p>
            
            <h2 style="color: #4a5568; margin-top: 30px;">Next Steps</h2>
            <ul style="padding-left: 20px;">
              <li>Complete your profile to increase your chances of being selected</li>
              <li>Upload additional documents (resume, cover letter, portfolio)</li>
              <li>Set up job alerts to be notified of new opportunities</li>
              <li>Explore other job openings that match your skills</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.applicationTrackingUrl.replace('/applications/' + data.applicationId, '/profile')}" 
                 style="background-color: #48bb78; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Complete Your Profile
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
   * Get plain text version of application confirmation email
   */
  private getApplicationConfirmationText(data: {
    name: string;
    jobTitle: string;
    applicationId: string;
    applicationTrackingUrl: string;
    loginEmail: string;
    loginPassword: string;
  }): string {
    return `
Application Submitted Successfully!

Hello ${data.name || 'there'},

Thank you for applying to ${data.jobTitle} on HRM8. Your application has been received and is being reviewed.

Application Details:
- Application ID: ${data.applicationId}
- Position: ${data.jobTitle}

Track Your Application:
You can track the status of your application at any time by visiting:
${data.applicationTrackingUrl}

Your Account Details:
We've created an account for you so you can track your application and apply to more jobs.

Email: ${data.loginEmail}
Password: ${data.loginPassword}

⚠️ Please save this password in a secure location. For security reasons, we recommend changing it after your first login.

Next Steps:
- Complete your profile to increase your chances of being selected
- Upload additional documents (resume, cover letter, portfolio)
- Set up job alerts to be notified of new opportunities
- Explore other job openings that match your skills

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Send account creation email (for direct registration)
   */
  async sendAccountCreationEmail(data: {
    to: string;
    name: string;
    loginEmail: string;
    loginPassword: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: 'Welcome to HRM8 - Your Account Has Been Created',
        html: this.getAccountCreationTemplate(data),
        text: this.getAccountCreationText(data),
      };

      await transporter.sendMail(mailOptions);

      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('\n📧 ===== ACCOUNT CREATION EMAIL (Development Mode) =====');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Login Email:', data.loginEmail);
        console.log('Login Password:', data.loginPassword);
        console.log('===========================================================\n');
      } else {
        console.log('✅ Account creation email sent successfully to:', data.to);
      }
    } catch (error) {
      console.error('Failed to send account creation email:', error);
      throw new Error('Failed to send account creation email');
    }
  }

  /**
   * Send application submitted email (for authenticated users)
   */
  async sendApplicationSubmittedEmail(data: {
    to: string;
    name: string;
    jobTitle: string;
    applicationId: string;
    applicationTrackingUrl: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Application Submitted: ${data.jobTitle}`,
        html: this.getApplicationSubmittedTemplate(data),
        text: this.getApplicationSubmittedText(data),
      };

      await transporter.sendMail(mailOptions);

      // In development without SMTP, log the email
      if (!process.env.SMTP_USER) {
        console.log('\n📧 ===== APPLICATION SUBMITTED EMAIL (Development Mode) =====');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Application ID:', data.applicationId);
        console.log('Tracking URL:', data.applicationTrackingUrl);
        console.log('===========================================================\n');
      } else {
        console.log('✅ Application submitted email sent successfully to:', data.to);
      }
    } catch (error) {
      console.error('Failed to send application submitted email:', error);
      throw new Error('Failed to send application submitted email');
    }
  }

  /**
   * Get HTML template for account creation email
   */
  private getAccountCreationTemplate(data: {
    name: string;
    loginEmail: string;
    loginPassword: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Welcome to HRM8!</h1>
            
            <p>Hello ${data.name || 'there'},</p>
            
            <p>Your HRM8 account has been successfully created. You can now start exploring job opportunities and managing your applications.</p>
            
            <h2 style="color: #4a5568; margin-top: 30px;">Your Account Details</h2>
            <p>Here are your login credentials:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.loginEmail}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${data.loginPassword}</p>
            </div>
            
            <p style="color: #e53e3e; font-weight: bold;">⚠️ Please save this password in a secure location. For security reasons, we recommend changing it after your first login.</p>
            
            <h2 style="color: #4a5568; margin-top: 30px;">Get Started</h2>
            <ul style="padding-left: 20px;">
              <li>Complete your profile to increase your chances of being selected</li>
              <li>Upload your resume, cover letter, and portfolio</li>
              <li>Browse and apply to jobs that match your skills</li>
              <li>Set up job alerts to be notified of new opportunities</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/dashboard" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Go to Dashboard
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
   * Get plain text version of account creation email
   */
  private getAccountCreationText(data: {
    name: string;
    loginEmail: string;
    loginPassword: string;
  }): string {
    return `
Welcome to HRM8!

Hello ${data.name || 'there'},

Your HRM8 account has been successfully created. You can now start exploring job opportunities and managing your applications.

Your Account Details:
Email: ${data.loginEmail}
Password: ${data.loginPassword}

⚠️ Please save this password in a secure location. For security reasons, we recommend changing it after your first login.

Get Started:
- Complete your profile to increase your chances of being selected
- Upload your resume, cover letter, and portfolio
- Browse and apply to jobs that match your skills
- Set up job alerts to be notified of new opportunities

Visit your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/dashboard

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Get HTML template for application submitted email (authenticated users)
   */
  private getApplicationSubmittedTemplate(data: {
    name: string;
    jobTitle: string;
    applicationId: string;
    applicationTrackingUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Application Submitted Successfully!</h1>
            
            <p>Hello ${data.name || 'there'},</p>
            
            <p>Thank you for applying to <strong>${data.jobTitle}</strong> on HRM8. Your application has been received and is being reviewed.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">Application Details</h2>
              <p style="margin: 10px 0 5px 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
              <p style="margin: 5px 0;"><strong>Position:</strong> ${data.jobTitle}</p>
            </div>
            
            <h2 style="color: #4a5568; margin-top: 30px;">Track Your Application</h2>
            <p>You can track the status of your application at any time:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.applicationTrackingUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Application Status
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${data.applicationTrackingUrl}</p>
            
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
   * Get plain text version of application submitted email
   */
  private getApplicationSubmittedText(data: {
    name: string;
    jobTitle: string;
    applicationId: string;
    applicationTrackingUrl: string;
  }): string {
    return `
Application Submitted Successfully!

Hello ${data.name || 'there'},

Thank you for applying to ${data.jobTitle} on HRM8. Your application has been received and is being reviewed.

Application Details:
- Application ID: ${data.applicationId}
- Position: ${data.jobTitle}

Track Your Application:
You can track the status of your application at any time by visiting:
${data.applicationTrackingUrl}

Best regards,
The HRM8 Team
    `.trim();
  }

  /**
   * Send interview invitation email to candidate
   */
  async sendInterviewInvitationEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    interviewDate: Date;
    interviewDuration: number; // in minutes
    interviewType: string; // VIDEO, PHONE, etc.
    meetingLink?: string;
    recruiterName?: string;
    recruiterEmail?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Interview Invitation: ${data.jobTitle} at ${data.companyName}`,
        html: this.getInterviewInvitationTemplate(data),
        text: this.getInterviewInvitationText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Interview Invitation Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Interview Date:', data.interviewDate.toISOString());
        console.log('Meeting Link:', data.meetingLink || 'N/A');
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send interview invitation email:', error);
      throw new Error('Failed to send interview invitation email');
    }
  }

  /**
   * Get HTML template for interview invitation email
   */
  private getInterviewInvitationTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    interviewDate: Date;
    interviewDuration: number;
    interviewType: string;
    meetingLink?: string;
    recruiterName?: string;
    recruiterEmail?: string;
    notes?: string;
  }): string {
    const interviewDateTime = data.interviewDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Interview Invitation</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>We were impressed with your application and would like to invite you for an interview for the position:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            <h3 style="color: #4a5568; margin-top: 30px;">Interview Details</h3>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${interviewDateTime}</p>
              <p style="margin: 8px 0;"><strong>Duration:</strong> ${data.interviewDuration} minutes</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}</p>
              ${data.meetingLink ? `<p style="margin: 8px 0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #7c3aed;">${data.meetingLink}</a></p>` : ''}
            </div>
            
            ${data.meetingLink && data.interviewType === 'VIDEO' ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.meetingLink}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Join Video Interview
              </a>
            </div>
            ` : ''}
            
            ${data.notes ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Additional Notes:</strong></p>
              <p style="margin: 8px 0 0 0;">${data.notes}</p>
            </div>
            ` : ''}
            
            <p>Please confirm your attendance by replying to this email. If the proposed time doesn't work for you, please let us know and we'll be happy to find an alternative time.</p>
            
            <p>We look forward to speaking with you!</p>
            
            ${data.recruiterName || data.recruiterEmail ? `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              ${data.recruiterName ? `Best regards,<br><strong>${data.recruiterName}</strong>` : 'Best regards,'}
              ${data.recruiterEmail ? `<br>${data.recruiterEmail}` : ''}
            </p>
            ` : `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The ${data.companyName} Hiring Team
            </p>
            `}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of interview invitation email
   */
  private getInterviewInvitationText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    interviewDate: Date;
    interviewDuration: number;
    interviewType: string;
    meetingLink?: string;
    recruiterName?: string;
    recruiterEmail?: string;
    notes?: string;
  }): string {
    const interviewDateTime = data.interviewDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
Interview Invitation

Hello ${data.candidateName},

We were impressed with your application and would like to invite you for an interview for the position: ${data.jobTitle} at ${data.companyName}

Interview Details:
- Date & Time: ${interviewDateTime}
- Duration: ${data.interviewDuration} minutes
- Type: ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}
${data.meetingLink ? `- Meeting Link: ${data.meetingLink}` : ''}

${data.notes ? `Additional Notes:\n${data.notes}\n\n` : ''}Please confirm your attendance by replying to this email. If the proposed time doesn't work for you, please let us know and we'll be happy to find an alternative time.

We look forward to speaking with you!

${data.recruiterName || data.recruiterEmail ? `Best regards,\n${data.recruiterName || ''}\n${data.recruiterEmail || ''}` : `Best regards,\nThe ${data.companyName} Hiring Team`}
    `.trim();
  }

  /**
   * Send assessment invitation email to candidate
   */
  async sendAssessmentInvitationEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentUrl: string;
    expiryDate?: Date | null;
    deadlineDays?: number;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Assessment Invitation: ${data.jobTitle} at ${data.companyName}`,
        html: this.getAssessmentInvitationTemplate(data),
        text: this.getAssessmentInvitationText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Assessment Invitation Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Assessment URL:', data.assessmentUrl);
        console.log('---');
      } else {
        console.log('✅ Assessment Invitation Email sent successfully via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('From:', fromEmail);
      }
    } catch (error) {
      console.error('Failed to send assessment invitation email:', error);
      throw new Error('Failed to send assessment invitation email');
    }
  }

  /**
   * Get HTML template for assessment invitation email
   */
  private getAssessmentInvitationTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentUrl: string;
    expiryDate?: Date | null;
    deadlineDays?: number;
  }): string {
    const deadlineText = data.deadlineDays
      ? `${data.deadlineDays} day${data.deadlineDays !== 1 ? 's' : ''}`
      : data.expiryDate
        ? data.expiryDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        : null;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Assessment Invitation</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>Thank you for your interest in the position at <strong>${data.companyName}</strong>. We'd like to invite you to complete an assessment for:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            ${deadlineText ? `<p><strong>Deadline:</strong> Complete this assessment within ${deadlineText}.</p>` : ''}
            
            <p>This assessment will help us better understand your skills and qualifications for this role. Please click the button below to begin:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.assessmentUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Start Assessment
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${data.assessmentUrl}</p>
            
            ${deadlineText ? `<p style="color: #718096; font-size: 14px;"><strong>Note:</strong> This assessment link will expire in ${deadlineText}. Please complete it before then.</p>` : ''}
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The ${data.companyName} Hiring Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of assessment invitation email
   */
  private getAssessmentInvitationText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentUrl: string;
    expiryDate?: Date | null;
    deadlineDays?: number;
  }): string {
    const deadlineText = data.deadlineDays
      ? `${data.deadlineDays} day${data.deadlineDays !== 1 ? 's' : ''}`
      : data.expiryDate
        ? data.expiryDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        : null;

    return `
Assessment Invitation

Hello ${data.candidateName},

Thank you for your interest in the position at ${data.companyName}. We'd like to invite you to complete an assessment for:

Position: ${data.jobTitle}
Company: ${data.companyName}

${deadlineText ? `Deadline: Complete this assessment within ${deadlineText}.\n\n` : ''}This assessment will help us better understand your skills and qualifications for this role. Please visit the link below to begin:

${data.assessmentUrl}

If you have any questions, please do not hesitate to contact us.

Best regards,
The ${data.companyName} Hiring Team
    `.trim();
  }

  /**
   * Send assessment completion email to candidate
   */
  async sendAssessmentCompletionEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    completedAt: Date;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Assessment Completed: ${data.jobTitle} at ${data.companyName}`,
        html: this.getAssessmentCompletionTemplate(data),
        text: this.getAssessmentCompletionText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Assessment Completion Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('---');
      } else {
        console.log('✅ Assessment Completion Email sent successfully via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
      }
    } catch (error) {
      console.error('Failed to send assessment completion email:', error);
      throw new Error('Failed to send assessment completion email');
    }
  }

  /**
   * Get HTML template for assessment completion email
   */
  private getAssessmentCompletionTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    completedAt: Date;
  }): string {
    const completionDate = data.completedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Thank You for Completing Your Assessment</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>We're pleased to confirm that we have received your completed assessment for:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            <p><strong>Completed on:</strong> ${completionDate}</p>
            
            <p>Our team will review your assessment and get back to you soon with the next steps in the hiring process. We typically review assessments within 2-3 business days.</p>
            
            <p>If you have any questions or need to update any information, please don't hesitate to reach out to us.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The ${data.companyName} Hiring Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of assessment completion email
   */
  private getAssessmentCompletionText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    completedAt: Date;
  }): string {
    const completionDate = data.completedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
Assessment Completed - Thank You

Hello ${data.candidateName},

We're pleased to confirm that we have received your completed assessment for:

Position: ${data.jobTitle}
Company: ${data.companyName}
Completed on: ${completionDate}

Our team will review your assessment and get back to you soon with the next steps in the hiring process. We typically review assessments within 2-3 business days.

If you have any questions or need to update any information, please don't hesitate to reach out to us.

Best regards,
The ${data.companyName} Hiring Team
    `.trim();
  }

  /**
   * Send assessment results notification to recruiter
   */
  async sendAssessmentResultsNotification(data: {
    to: string;
    recruiterName: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentScore?: number;
    passThreshold?: number;
    passed?: boolean;
    assessmentUrl: string;
    candidateProfileUrl: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Assessment Results: ${data.candidateName} - ${data.jobTitle}`,
        html: this.getAssessmentResultsTemplate(data),
        text: this.getAssessmentResultsText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Assessment Results Notification (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Candidate:', data.candidateName);
        console.log('Score:', data.assessmentScore);
        console.log('---');
      } else {
        console.log('✅ Assessment Results Notification sent successfully via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
      }
    } catch (error) {
      console.error('Failed to send assessment results notification:', error);
      throw new Error('Failed to send assessment results notification');
    }
  }

  /**
   * Get HTML template for assessment results notification
   */
  private getAssessmentResultsTemplate(data: {
    recruiterName: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentScore?: number;
    passThreshold?: number;
    passed?: boolean;
    assessmentUrl: string;
    candidateProfileUrl: string;
  }): string {
    const scoreDisplay = data.assessmentScore !== undefined
      ? `${data.assessmentScore}${data.passThreshold ? ` / ${data.passThreshold}` : ''}`
      : 'Pending Review';

    const statusBadge = data.passed !== undefined
      ? data.passed
        ? '<span style="background-color: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">PASSED</span>'
        : '<span style="background-color: #ef4444; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">DID NOT PASS</span>'
      : '<span style="background-color: #6b7280; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">PENDING REVIEW</span>';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Assessment Results Available</h1>
            
            <p>Hello ${data.recruiterName},</p>
            
            <p>A candidate has completed their assessment and the results are ready for review:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0 0 10px 0; color: #7c3aed;">${data.candidateName}</h2>
              <p style="margin: 5px 0; color: #718096;"><strong>Position:</strong> ${data.jobTitle}</p>
              <p style="margin: 5px 0; color: #718096;"><strong>Company:</strong> ${data.companyName}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #4a5568;">Assessment Results</h3>
              <p style="margin: 5px 0;"><strong>Score:</strong> ${scoreDisplay}</p>
              ${data.passThreshold ? `<p style="margin: 5px 0;"><strong>Pass Threshold:</strong> ${data.passThreshold}</p>` : ''}
              <p style="margin: 10px 0 0 0;"><strong>Status:</strong> ${statusBadge}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.assessmentUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 5px;">
                View Assessment
              </a>
              <a href="${data.candidateProfileUrl}" 
                 style="background-color: #4a5568; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 5px;">
                View Candidate Profile
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              HRM8 System
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of assessment results notification
   */
  private getAssessmentResultsText(data: {
    recruiterName: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    assessmentScore?: number;
    passThreshold?: number;
    passed?: boolean;
    assessmentUrl: string;
    candidateProfileUrl: string;
  }): string {
    const scoreDisplay = data.assessmentScore !== undefined
      ? `${data.assessmentScore}${data.passThreshold ? ` / ${data.passThreshold}` : ''}`
      : 'Pending Review';

    const statusText = data.passed !== undefined
      ? data.passed ? 'PASSED' : 'DID NOT PASS'
      : 'PENDING REVIEW';

    return `
Assessment Results Available

Hello ${data.recruiterName},

A candidate has completed their assessment and the results are ready for review:

Candidate: ${data.candidateName}
Position: ${data.jobTitle}
Company: ${data.companyName}

Assessment Results:
Score: ${scoreDisplay}
${data.passThreshold ? `Pass Threshold: ${data.passThreshold}\n` : ''}Status: ${statusText}

View Assessment: ${data.assessmentUrl}
View Candidate Profile: ${data.candidateProfileUrl}

Best regards,
HRM8 System
    `.trim();
  }

  /**
   * Send interview rescheduled email to candidate
   */
  async sendInterviewRescheduledEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    oldDate: Date;
    newDate: Date;
    interviewDuration: number;
    interviewType: string;
    meetingLink?: string;
    reason?: string;
    recruiterName?: string;
    recruiterEmail?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Interview Rescheduled: ${data.jobTitle} at ${data.companyName}`,
        html: this.getInterviewRescheduledTemplate(data),
        text: this.getInterviewRescheduledText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Interview Rescheduled Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Old Date:', data.oldDate.toISOString());
        console.log('New Date:', data.newDate.toISOString());
        console.log('---');
      } else {
        console.log('✅ Interview Rescheduled Email sent successfully via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
      }
    } catch (error) {
      console.error('Failed to send interview rescheduled email:', error);
      throw new Error('Failed to send interview rescheduled email');
    }
  }

  /**
   * Get HTML template for interview rescheduled email
   */
  private getInterviewRescheduledTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    oldDate: Date;
    newDate: Date;
    interviewDuration: number;
    interviewType: string;
    meetingLink?: string;
    reason?: string;
    recruiterName?: string;
    recruiterEmail?: string;
  }): string {
    const oldDateTime = data.oldDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const newDateTime = data.newDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Interview Rescheduled</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>We need to reschedule your interview for the following position:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            <h3 style="color: #4a5568; margin-top: 30px;">Schedule Change</h3>
            
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 5px 0;"><strong>Previous Date & Time:</strong></p>
              <p style="margin: 5px 0; color: #991b1b;">${oldDateTime}</p>
            </div>
            
            <div style="background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>New Date & Time:</strong></p>
              <p style="margin: 5px 0; color: #065f46; font-weight: bold; font-size: 16px;">${newDateTime}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Duration:</strong> ${data.interviewDuration} minutes</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}</p>
              ${data.meetingLink ? `<p style="margin: 8px 0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #7c3aed;">${data.meetingLink}</a></p>` : ''}
            </div>
            
            ${data.reason ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Reason for Rescheduling:</strong></p>
              <p style="margin: 8px 0 0 0;">${data.reason}</p>
            </div>
            ` : ''}
            
            ${data.meetingLink && data.interviewType === 'VIDEO' ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.meetingLink}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Join Video Interview
              </a>
            </div>
            ` : ''}
            
            <p>We apologize for any inconvenience this may cause. Please confirm that the new time works for you by replying to this email.</p>
            
            <p>If the new time doesn't work for you, please let us know and we'll be happy to find an alternative time.</p>
            
            ${data.recruiterName || data.recruiterEmail ? `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              ${data.recruiterName ? `Best regards,<br><strong>${data.recruiterName}</strong>` : 'Best regards,'}
              ${data.recruiterEmail ? `<br>${data.recruiterEmail}` : ''}
            </p>
            ` : `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The ${data.companyName} Hiring Team
            </p>
            `}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of interview rescheduled email
   */
  private getInterviewRescheduledText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    oldDate: Date;
    newDate: Date;
    interviewDuration: number;
    interviewType: string;
    meetingLink?: string;
    reason?: string;
    recruiterName?: string;
    recruiterEmail?: string;
  }): string {
    const oldDateTime = data.oldDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const newDateTime = data.newDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
Interview Rescheduled

Hello ${data.candidateName},

We need to reschedule your interview for the following position: ${data.jobTitle} at ${data.companyName}

Schedule Change:
Previous Date & Time: ${oldDateTime}
New Date & Time: ${newDateTime}

Interview Details:
- Duration: ${data.interviewDuration} minutes
- Type: ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}
${data.meetingLink ? `- Meeting Link: ${data.meetingLink}` : ''}

${data.reason ? `Reason for Rescheduling:\n${data.reason}\n\n` : ''}We apologize for any inconvenience this may cause. Please confirm that the new time works for you by replying to this email.

If the new time doesn't work for you, please let us know and we'll be happy to find an alternative time.

${data.recruiterName || data.recruiterEmail ? `Best regards,\n${data.recruiterName || ''}\n${data.recruiterEmail || ''}` : `Best regards,\nThe ${data.companyName} Hiring Team`}
    `.trim();
  }

  /**
   * Send interview cancelled email to candidate
   */
  async sendInterviewCancelledEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    originalDate: Date;
    interviewDuration: number;
    interviewType: string;
    reason: string;
    autoRescheduleEnabled?: boolean;
    recruiterName?: string;
    recruiterEmail?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Interview Cancelled: ${data.jobTitle} at ${data.companyName}`,
        html: this.getInterviewCancelledTemplate(data),
        text: this.getInterviewCancelledText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Interview Cancelled Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Original Date:', data.originalDate.toISOString());
        console.log('Reason:', data.reason);
        console.log('---');
      } else {
        console.log('✅ Interview Cancelled Email sent successfully via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
      }
    } catch (error) {
      console.error('Failed to send interview cancelled email:', error);
      throw new Error('Failed to send interview cancelled email');
    }
  }

  /**
   * Get HTML template for interview cancelled email
   */
  private getInterviewCancelledTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    originalDate: Date;
    interviewDuration: number;
    interviewType: string;
    reason: string;
    autoRescheduleEnabled?: boolean;
    recruiterName?: string;
    recruiterEmail?: string;
  }): string {
    const originalDateTime = data.originalDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Interview Cancelled</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>We're writing to inform you that the interview for the following position has been cancelled:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Cancelled Interview Date & Time:</strong> ${originalDateTime}</p>
              <p style="margin: 8px 0;"><strong>Duration:</strong> ${data.interviewDuration} minutes</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}</p>
            </div>
            
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0;"><strong>Reason for Cancellation:</strong></p>
              <p style="margin: 8px 0 0 0;">${data.reason}</p>
            </div>
            
            ${data.autoRescheduleEnabled ? `
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0;"><strong>Automatic Rescheduling:</strong></p>
              <p style="margin: 8px 0 0 0;">We will automatically reschedule your interview and send you a new invitation with updated details shortly.</p>
            </div>
            ` : `
            <p>We apologize for any inconvenience this cancellation may cause. If you're still interested in this position, we'd be happy to reschedule at a more convenient time. Please reply to this email or contact us directly to arrange a new interview date.</p>
            `}
            
            ${data.recruiterName || data.recruiterEmail ? `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              ${data.recruiterName ? `Best regards,<br><strong>${data.recruiterName}</strong>` : 'Best regards,'}
              ${data.recruiterEmail ? `<br>${data.recruiterEmail}` : ''}
            </p>
            ` : `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The ${data.companyName} Hiring Team
            </p>
            `}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of interview cancelled email
   */
  private getInterviewCancelledText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    originalDate: Date;
    interviewDuration: number;
    interviewType: string;
    reason: string;
    autoRescheduleEnabled?: boolean;
    recruiterName?: string;
    recruiterEmail?: string;
  }): string {
    const originalDateTime = data.originalDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
Interview Cancelled

Hello ${data.candidateName},

We're writing to inform you that the interview for the following position has been cancelled: ${data.jobTitle} at ${data.companyName}

Cancelled Interview Details:
- Date & Time: ${originalDateTime}
- Duration: ${data.interviewDuration} minutes
- Type: ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}

Reason for Cancellation:
${data.reason}

${data.autoRescheduleEnabled ? 'We will automatically reschedule your interview and send you a new invitation with updated details shortly.\n\n' : 'We apologize for any inconvenience this cancellation may cause. If you\'re still interested in this position, we\'d be happy to reschedule at a more convenient time. Please reply to this email or contact us directly to arrange a new interview date.\n\n'}${data.recruiterName || data.recruiterEmail ? `Best regards,\n${data.recruiterName || ''}\n${data.recruiterEmail || ''}` : `Best regards,\nThe ${data.companyName} Hiring Team`}
    `.trim();
  }

  /**
   * Send interview no-show email to candidate
   */
  async sendInterviewNoShowEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    originalDate: Date;
    interviewDuration: number;
    interviewType: string;
    reason?: string;
    autoRescheduleEnabled?: boolean;
    recruiterName?: string;
    recruiterEmail?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `Interview No-Show: ${data.jobTitle} at ${data.companyName}`,
        html: this.getInterviewNoShowTemplate(data),
        text: this.getInterviewNoShowText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Interview No-Show Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Original Date:', data.originalDate.toISOString());
        console.log('Reason:', data.reason || 'N/A');
        console.log('---');
      } else {
        console.log('✅ Interview No-Show Email sent successfully via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
      }
    } catch (error) {
      console.error('Failed to send interview no-show email:', error);
      throw new Error('Failed to send interview no-show email');
    }
  }

  /**
   * Get HTML template for interview no-show email
   */
  private getInterviewNoShowTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    originalDate: Date;
    interviewDuration: number;
    interviewType: string;
    reason?: string;
    autoRescheduleEnabled?: boolean;
    recruiterName?: string;
    recruiterEmail?: string;
  }): string {
    const originalDateTime = data.originalDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">Interview No-Show Notice</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>We noticed that you were unable to attend the scheduled interview for the following position:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0; color: #7c3aed;">${data.jobTitle}</h2>
              <p style="margin: 5px 0 0 0; color: #718096;">${data.companyName}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Scheduled Date & Time:</strong> ${originalDateTime}</p>
              <p style="margin: 8px 0;"><strong>Duration:</strong> ${data.interviewDuration} minutes</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}</p>
            </div>
            
            ${data.reason ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Note:</strong></p>
              <p style="margin: 8px 0 0 0;">${data.reason}</p>
            </div>
            ` : ''}
            
            ${data.autoRescheduleEnabled ? `
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0;"><strong>Automatic Rescheduling:</strong></p>
              <p style="margin: 8px 0 0 0;">We understand that unforeseen circumstances can arise. We will automatically reschedule your interview and send you a new invitation with updated details shortly.</p>
            </div>
            ` : `
            <p>We understand that unforeseen circumstances can arise that prevent attendance at scheduled interviews. If you're still interested in this position, we'd be happy to reschedule at a more convenient time.</p>
            
            <p>Please reply to this email or contact us directly to arrange a new interview date. We're here to help find a time that works for both of us.</p>
            `}
            
            ${data.recruiterName || data.recruiterEmail ? `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              ${data.recruiterName ? `Best regards,<br><strong>${data.recruiterName}</strong>` : 'Best regards,'}
              ${data.recruiterEmail ? `<br>${data.recruiterEmail}` : ''}
            </p>
            ` : `
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #718096; font-size: 14px;">
              Best regards,<br>
              The ${data.companyName} Hiring Team
            </p>
            `}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of interview no-show email
   */
  private getInterviewNoShowText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    originalDate: Date;
    interviewDuration: number;
    interviewType: string;
    reason?: string;
    autoRescheduleEnabled?: boolean;
    recruiterName?: string;
    recruiterEmail?: string;
  }): string {
    const originalDateTime = data.originalDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
Interview No-Show Notice

Hello ${data.candidateName},

We noticed that you were unable to attend the scheduled interview for the following position: ${data.jobTitle} at ${data.companyName}

Scheduled Interview Details:
- Date & Time: ${originalDateTime}
- Duration: ${data.interviewDuration} minutes
- Type: ${data.interviewType.charAt(0) + data.interviewType.slice(1).toLowerCase().replace('_', ' ')}

${data.reason ? `Note:\n${data.reason}\n\n` : ''}${data.autoRescheduleEnabled ? 'We understand that unforeseen circumstances can arise. We will automatically reschedule your interview and send you a new invitation with updated details shortly.\n\n' : 'We understand that unforeseen circumstances can arise that prevent attendance at scheduled interviews. If you\'re still interested in this position, we\'d be happy to reschedule at a more convenient time.\n\nPlease reply to this email or contact us directly to arrange a new interview date. We\'re here to help find a time that works for both of us.\n\n'}${data.recruiterName || data.recruiterEmail ? `Best regards,\n${data.recruiterName || ''}\n${data.recruiterEmail || ''}` : `Best regards,\nThe ${data.companyName} Hiring Team`}
    `.trim();
  }

  /**
   * Send offer email to candidate
   */
  async sendOfferEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    offerUrl: string;
    expiryDate?: Date;
    customMessage?: string;
    // Detailed offer information
    salary?: number;
    salaryCurrency?: string;
    salaryPeriod?: string;
    workLocation?: string;
    workArrangement?: string;
    startDate?: Date;
    benefits?: string[];
    vacationDays?: number;
    probationPeriod?: number;
    bonusStructure?: string;
    equityOptions?: string;
    offerType?: string;
    companyName?: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const subject = `🎉 Job Offer - ${data.jobTitle}`;
      const expiryDateFormatted = data.expiryDate
        ? new Date(data.expiryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : null;
      const expiryText = expiryDateFormatted
        ? `Please review the offer details and respond by <strong>${expiryDateFormatted}</strong>.`
        : 'Please review the offer details and respond at your earliest convenience.';
      const expiryTextPlain = expiryDateFormatted
        ? `Please review the offer details and respond by ${expiryDateFormatted}.`
        : 'Please review the offer details and respond at your earliest convenience.';

      // Format salary helper
      const formatSalary = () => {
        if (!data.salary) return null;
        const currency = data.salaryCurrency || 'USD';
        const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(data.salary);
        const period = data.salaryPeriod === 'annual' ? '/year' : data.salaryPeriod === 'monthly' ? '/month' : data.salaryPeriod === 'weekly' ? '/week' : data.salaryPeriod === 'hourly' ? '/hour' : '';
        return `${currencySymbol}${formatted}${period}`;
      };

      const formattedSalary = formatSalary();
      const formattedStartDate = data.startDate ? new Date(data.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null;
      const workArrangementLabel = data.workArrangement === 'remote' ? 'Remote' : data.workArrangement === 'hybrid' ? 'Hybrid' : data.workArrangement === 'on-site' ? 'On-Site' : data.workArrangement || 'Not specified';
      const offerTypeLabel = data.offerType === 'full-time' ? 'Full-Time' : data.offerType === 'part-time' ? 'Part-Time' : data.offerType === 'contract' ? 'Contract' : data.offerType === 'intern' ? 'Internship' : data.offerType || 'Full-Time';

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <style>
              @media only screen and (max-width: 600px) {
                .container { width: 100% !important; padding: 10px !important; }
                .content-box { padding: 20px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 20px 0;">
              <tr>
                <td align="center">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header with gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                          🎉 Congratulations!
                        </h1>
                        <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 400;">
                          You've Received a Job Offer
                        </p>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td class="content-box" style="padding: 40px 30px;">
                        
                        <!-- Greeting -->
                        <p style="margin: 0 0 20px; color: #2d3748; font-size: 16px; line-height: 1.6;">
                          Dear <strong>${data.candidateName}</strong>,
                        </p>
                        
                        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.7;">
                          We are thrilled to extend a job offer to you for the position of <strong style="color: #667eea;">${data.jobTitle}</strong>${data.companyName ? ` at ${data.companyName}` : ''}. We were impressed by your qualifications and believe you would be a valuable addition to our team.
                        </p>

                        <!-- Offer Details Card -->
                        <div style="background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; margin: 30px 0;">
                          
                          <h2 style="margin: 0 0 25px; color: #2d3748; font-size: 24px; font-weight: 700; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                            📋 Offer Details
                          </h2>

                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            ${formattedSalary ? `
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Compensation</strong>
                                <p style="margin: 5px 0 0; color: #2d3748; font-size: 28px; font-weight: 700; color: #667eea;">
                                  ${formattedSalary}
                                </p>
                              </td>
                            </tr>
                            ` : ''}
                            
                            ${formattedStartDate ? `
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Start Date</strong>
                                <p style="margin: 5px 0 0; color: #2d3748; font-size: 18px; font-weight: 600;">
                                  📅 ${formattedStartDate}
                                </p>
                              </td>
                            </tr>
                            ` : ''}

                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Employment Type</strong>
                                <p style="margin: 5px 0 0; color: #2d3748; font-size: 18px; font-weight: 600;">
                                  💼 ${offerTypeLabel}
                                </p>
                              </td>
                            </tr>

                            ${data.workLocation ? `
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Location & Work Arrangement</strong>
                                <p style="margin: 5px 0 0; color: #2d3748; font-size: 18px; font-weight: 600;">
                                  📍 ${data.workLocation} • ${workArrangementLabel}
                                </p>
                              </td>
                            </tr>
                            ` : ''}

                            ${data.vacationDays ? `
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Vacation Days</strong>
                                <p style="margin: 5px 0 0; color: #2d3748; font-size: 18px; font-weight: 600;">
                                  🏖️ ${data.vacationDays} days per year
                                </p>
                              </td>
                            </tr>
                            ` : ''}

                            ${data.probationPeriod ? `
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Probation Period</strong>
                                <p style="margin: 5px 0 0; color: #2d3748; font-size: 18px; font-weight: 600;">
                                  ⏱️ ${data.probationPeriod} months
                                </p>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </div>

                        ${data.benefits && data.benefits.length > 0 ? `
                        <!-- Benefits Section -->
                        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 25px; margin: 30px 0;">
                          <h3 style="margin: 0 0 15px; color: #1e40af; font-size: 20px; font-weight: 700;">
                            ✨ Benefits & Perks
                          </h3>
                          <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                            ${data.benefits.map(benefit => `<li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">${benefit}</li>`).join('')}
                          </ul>
                        </div>
                        ` : ''}

                        ${data.bonusStructure ? `
                        <!-- Bonus Structure -->
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                          <h3 style="margin: 0 0 10px; color: #92400e; font-size: 18px; font-weight: 700;">
                            💰 Bonus Structure
                          </h3>
                          <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
                            ${data.bonusStructure}
                          </p>
                        </div>
                        ` : ''}

                        ${data.equityOptions ? `
                        <!-- Equity Options -->
                        <div style="background-color: #f3e8ff; border-left: 4px solid #9333ea; border-radius: 8px; padding: 20px; margin: 20px 0;">
                          <h3 style="margin: 0 0 10px; color: #6b21a8; font-size: 18px; font-weight: 700;">
                            📈 Equity Options
                          </h3>
                          <p style="margin: 0; color: #581c87; font-size: 15px; line-height: 1.6;">
                            ${data.equityOptions}
                          </p>
                        </div>
                        ` : ''}

                        ${data.customMessage ? `
                        <!-- Custom Message -->
                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.7; font-style: italic;">
                            "${data.customMessage}"
                          </p>
                        </div>
                        ` : ''}

                        <!-- Expiry Date -->
                        ${data.expiryDate ? `
                        <div style="background-color: #fff7ed; border: 2px solid #fb923c; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                          <p style="margin: 0; color: #9a3412; font-size: 16px; font-weight: 600;">
                            ⏰ ${expiryText}
                          </p>
                        </div>
                        ` : ''}

                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 40px 0;">
                          <tr>
                            <td align="center">
                              <a href="${data.offerUrl}" 
                                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                                View Complete Offer Details →
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 30px 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                          You can view the full offer letter, accept, decline, or initiate negotiations by clicking the button above.
                        </p>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px; color: #4a5568; font-size: 16px; font-weight: 600;">
                          Best regards,
                        </p>
                        <p style="margin: 0; color: #718096; font-size: 14px;">
                          The Hiring Team${data.companyName ? ` at ${data.companyName}` : ''}
                        </p>
                        <p style="margin: 20px 0 0; color: #a0aec0; font-size: 12px;">
                          This is an automated email. Please do not reply directly to this message.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const text = `
🎉 Congratulations ${data.candidateName}!

We are thrilled to extend a job offer to you for the position of ${data.jobTitle}${data.companyName ? ` at ${data.companyName}` : ''}. We were impressed by your qualifications and believe you would be a valuable addition to our team.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 OFFER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formattedSalary ? `Compensation: ${formattedSalary}` : 'Compensation: Not specified'}
${formattedStartDate ? `Start Date: ${formattedStartDate}` : ''}
Employment Type: ${offerTypeLabel}
${data.workLocation ? `Location: ${data.workLocation} (${workArrangementLabel})` : ''}
${data.vacationDays ? `Vacation Days: ${data.vacationDays} days per year` : ''}
${data.probationPeriod ? `Probation Period: ${data.probationPeriod} months` : ''}

${data.benefits && data.benefits.length > 0 ? `
Benefits & Perks:
${data.benefits.map(b => `  • ${b}`).join('\n')}
` : ''}

${data.bonusStructure ? `Bonus Structure: ${data.bonusStructure}\n` : ''}
${data.equityOptions ? `Equity Options: ${data.equityOptions}\n` : ''}

${data.customMessage ? `\n"${data.customMessage}"\n` : ''}

${data.expiryDate ? `⏰ ${expiryTextPlain}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View Complete Offer Details: ${data.offerUrl}

You can view the full offer letter, accept, decline, or initiate negotiations by visiting the link above.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The Hiring Team${data.companyName ? ` at ${data.companyName}` : ''}

This is an automated email. Please do not reply directly to this message.
      `.trim();

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject,
        html,
        text,
      };

      console.log('[EmailService.sendOfferEmail] Sending email via transporter...');
      const result = await transporter.sendMail(mailOptions);
      console.log('[EmailService.sendOfferEmail] Email sent successfully:', result.messageId || 'N/A');

      if (!process.env.SMTP_USER) {
        console.log('📧 Offer Email (Development Mode - No SMTP configured):');
        console.log('To:', data.to);
        console.log('Subject:', subject);
        console.log('Offer URL:', data.offerUrl);
        console.log('Candidate Name:', data.candidateName);
        console.log('Job Title:', data.jobTitle);
        console.log('Expiry Date:', data.expiryDate?.toISOString() || 'Not set');
        console.log('---');
        console.log('⚠️  NOTE: Email is NOT actually being sent. Configure SMTP_USER and SMTP_PASS to send real emails.');
        console.log('---');
      } else {
        console.log('📧 Offer Email sent via SMTP');
        console.log('To:', data.to);
        console.log('Subject:', subject);
        console.log('Message ID:', result.messageId);
      }
    } catch (error: any) {
      console.error('[EmailService.sendOfferEmail] Failed to send offer email:', error);
      console.error('[EmailService.sendOfferEmail] Error details:', {
        message: error?.message,
        code: error?.code,
        command: error?.command,
        response: error?.response,
        responseCode: error?.responseCode,
        stack: error?.stack,
      });
      throw new Error(`Failed to send offer email: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Send negotiation update email
   */
  async sendNegotiationUpdateEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    negotiatorName: string;
    message: string;
    offerUrl: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const subject = `Negotiation Update - ${data.jobTitle}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h1 style="color: #4a5568; margin-top: 0;">Negotiation Update</h1>
              
              <p>Hello ${data.candidateName},</p>
              
              <p>${data.negotiatorName} has responded to your negotiation for the position of <strong>${data.jobTitle}</strong>.</p>
              
              <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0;">
                <p style="margin: 0;">${data.message}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.offerUrl}" 
                   style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Negotiation
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="color: #718096; font-size: 14px;">
                Best regards,<br>
                The Hiring Team
              </p>
            </div>
          </body>
        </html>
      `;

      const text = `
Negotiation Update

Hello ${data.candidateName},

${data.negotiatorName} has responded to your negotiation for the position of ${data.jobTitle}.

${data.message}

View Negotiation: ${data.offerUrl}

Best regards,
The Hiring Team
      `.trim();

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject,
        html,
        text,
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Negotiation Update Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', subject);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send negotiation update email:', error);
      throw new Error('Failed to send negotiation update email');
    }
  }

  /**
   * Send document request email
   */
  async sendDocumentRequestEmail(data: {
    to: string;
    candidateName: string;
    documentName: string;
    documentUrl: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const subject = `Document Request: ${data.documentName}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h1 style="color: #4a5568; margin-top: 0;">Document Request</h1>
              
              <p>Hello ${data.candidateName},</p>
              
              <p>We need you to upload the following document: <strong>${data.documentName}</strong></p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.documentUrl}" 
                   style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Upload Document
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="color: #718096; font-size: 14px;">
                Best regards,<br>
                The Hiring Team
              </p>
            </div>
          </body>
        </html>
      `;

      const text = `
Document Request

Hello ${data.candidateName},

We need you to upload the following document: ${data.documentName}

Upload Document: ${data.documentUrl}

Best regards,
The Hiring Team
      `.trim();

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject,
        html,
        text,
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Document Request Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', subject);
        console.log('Document:', data.documentName);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send document request email:', error);
      throw new Error('Failed to send document request email');
    }
  }

  /**
   * Send offer accepted confirmation email
   */
  async sendOfferAcceptedEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    startDate: Date;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const subject = `Offer Accepted - ${data.jobTitle}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h1 style="color: #4a5568; margin-top: 0;">Thank you ${data.candidateName}!</h1>
              
              <p>We have received your acceptance of the job offer for <strong>${data.jobTitle}</strong>.</p>
              
              <p>We look forward to welcoming you to the team!</p>
              
              <p>Your start date is scheduled for <strong>${data.startDate.toLocaleDateString()}</strong>.</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="color: #718096; font-size: 14px;">
                Best regards,<br>
                The Hiring Team
              </p>
            </div>
          </body>
        </html>
      `;

      const text = `
Thank you ${data.candidateName}!

We have received your acceptance of the job offer for ${data.jobTitle}.

We look forward to welcoming you to the team!

Your start date is scheduled for ${data.startDate.toLocaleDateString()}.

Best regards,
The Hiring Team
      `.trim();

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject,
        html,
        text,
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Offer Accepted Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', subject);
        console.log('Start Date:', data.startDate.toLocaleDateString());
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send offer accepted email:', error);
      throw new Error('Failed to send offer accepted email');
    }
  }

  /**
   * Render template with merge fields
   */
  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Replace all {{variableName}} with actual values
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value !== null && value !== undefined ? String(value) : '');
    });

    return rendered;
  }

  /**
   * Get template variables from candidate, application, and job data
   */
  async getTemplateVariables(data: {
    candidateId: string;
    applicationId?: string;
    jobId: string;
    jobRoundId?: string;
    recruiterId?: string;
    customVariables?: Record<string, any>;
  }): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};

    // Get candidate data
    const { CandidateModel } = await import('../../models/Candidate');
    const candidate = await CandidateModel.findById(data.candidateId);
    if (candidate) {
      variables.candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
      variables.candidateFirstName = candidate.firstName;
      variables.candidateLastName = candidate.lastName;
      variables.candidateEmail = candidate.email;
      variables.candidatePhone = candidate.phone || '';
    }

    // Get application data
    if (data.applicationId) {
      const { ApplicationModel } = await import('../../models/Application');
      const application = await ApplicationModel.findById(data.applicationId);
      if (application) {
        variables.applicationDate = application.appliedDate.toLocaleDateString();
        variables.currentStage = application.stage.replace(/_/g, ' ');
        variables.applicationStatus = application.status;
        variables.score = application.score || '';
        variables.rank = application.rank || '';
      }
    }

    // Get job data
    const { JobModel } = await import('../../models/Job');
    const job = await JobModel.findById(data.jobId);
    if (job) {
      variables.jobTitle = job.title;
      variables.jobLocation = job.location;
      variables.jobDepartment = job.department || '';

      // Get company name
      const { CompanyModel } = await import('../../models/Company');
      const company = await CompanyModel.findById(job.companyId);
      if (company) {
        variables.companyName = company.name;
      }
    }

    // Get job round data
    if (data.jobRoundId) {
      const { JobRoundModel } = await import('../../models/JobRound');
      const round = await JobRoundModel.findById(data.jobRoundId);
      if (round) {
        variables.roundName = round.name;
        variables.roundType = round.type;
      }
    }

    // Get recruiter data
    if (data.recruiterId) {
      const { prisma } = await import('../../lib/prisma');
      const recruiter = await prisma.user.findUnique({
        where: { id: data.recruiterId },
      });
      if (recruiter) {
        variables.recruiterName = recruiter.name;
        variables.recruiterEmail = recruiter.email;
      }
    }

    // Add custom variables
    if (data.customVariables) {
      Object.assign(variables, data.customVariables);
    }

    return variables;
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(data: {
    templateId: string;
    applicationId?: string;
    candidateId: string;
    jobId: string;
    jobRoundId?: string;
    senderId: string;
    customVariables?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get template
      const { EmailTemplateModel } = await import('../../models/EmailTemplate');
      const template = await EmailTemplateModel.findById(data.templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.isActive) {
        throw new Error('Template is not active');
      }

      // Get variables
      const variables = await this.getTemplateVariables({
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        jobId: data.jobId,
        jobRoundId: data.jobRoundId,
        recruiterId: data.senderId,
        customVariables: data.customVariables,
      });

      // Get sender info
      const { prisma } = await import('../../lib/prisma');
      const sender = await prisma.user.findUnique({
        where: { id: data.senderId },
      });
      if (!sender) {
        throw new Error('Sender not found');
      }

      // Render template
      const subject = this.renderTemplate(template.subject, variables);
      const body = this.renderTemplate(template.body, variables);

      // Get candidate email
      const { CandidateModel } = await import('../../models/Candidate');
      const candidate = await CandidateModel.findById(data.candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Send email
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || sender.email;
      const fromName = process.env.EMAIL_FROM_NAME || sender.name;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: candidate.email,
        subject,
        html: body,
        text: this.htmlToText(body),
      };

      await transporter.sendMail(mailOptions);

      // Save email message
      const { EmailMessageModel } = await import('../../models/EmailMessage');
      const emailMessage = await EmailMessageModel.create({
        templateId: data.templateId,
        applicationId: data.applicationId || null,
        candidateId: data.candidateId,
        jobId: data.jobId,
        jobRoundId: data.jobRoundId || null,
        to: candidate.email,
        subject,
        body,
        status: 'SENT',
        senderId: data.senderId,
        senderEmail: sender.email,
      });

      if (!process.env.SMTP_USER) {
        console.log('📧 Template Email (Development Mode):');
        console.log('To:', candidate.email);
        console.log('Subject:', subject);
        console.log('Template:', template.name);
        console.log('---');
      }

      return {
        success: true,
        messageId: emailMessage.id,
      };
    } catch (error) {
      console.error('Failed to send template email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send template email',
      };
    }
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Send job alert email to candidate
   */
  async sendJobAlertEmail(data: {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    location: string;
    employmentType?: string;
    workArrangement?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    jobUrl: string;
  }): Promise<void> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || 'noreply@hrm8.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'HRM8';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: data.to,
        subject: `New Job Alert: ${data.jobTitle} at ${data.companyName}`,
        html: this.getJobAlertEmailTemplate(data),
        text: this.getJobAlertEmailText(data),
      };

      await transporter.sendMail(mailOptions);

      if (!process.env.SMTP_USER) {
        console.log('📧 Job Alert Email (Development Mode):');
        console.log('To:', data.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Job URL:', data.jobUrl);
        console.log('---');
      }
    } catch (error) {
      console.error('Failed to send job alert email:', error);
      throw new Error('Failed to send job alert email');
    }
  }

  /**
   * Get HTML template for job alert email
   */
  private getJobAlertEmailTemplate(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    location: string;
    employmentType?: string;
    workArrangement?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    jobUrl: string;
  }): string {
    const formatSalary = (min?: number, max?: number, currency: string = 'USD') => {
      if (!min && !max) return null;
      const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
      if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
      if (min) return `From ${formatter.format(min)}`;
      if (max) return `Up to ${formatter.format(max)}`;
      return null;
    };

    const salary = formatSalary(data.salaryMin, data.salaryMax, data.salaryCurrency);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h1 style="color: #4a5568; margin-top: 0;">🔔 New Job Match!</h1>
            
            <p>Hello ${data.candidateName},</p>
            
            <p>Great news! A new job matching your alert criteria has been posted:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <h2 style="margin: 0 0 10px 0; color: #1a1a1a;">${data.jobTitle}</h2>
              <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${data.companyName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${data.location}${data.workArrangement ? ` (${data.workArrangement.replace('_', ' ')})` : ''}</p>
              ${data.employmentType ? `<p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${data.employmentType.replace('_', ' ')}</p>` : ''}
              ${salary ? `<p style="margin: 5px 0; color: #666;"><strong>Salary:</strong> ${salary}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.jobUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                View Job & Apply
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              You're receiving this email because you set up a job alert on HRM8. 
              You can manage your alerts in your <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/candidate/saved-jobs" style="color: #7c3aed;">dashboard</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #718096; font-size: 14px;">
              Good luck with your job search!<br>
              The HRM8 Team
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get plain text version of job alert email
   */
  private getJobAlertEmailText(data: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    location: string;
    employmentType?: string;
    workArrangement?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    jobUrl: string;
  }): string {
    const formatSalary = (min?: number, max?: number, currency: string = 'USD') => {
      if (!min && !max) return null;
      const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
      if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
      if (min) return `From ${formatter.format(min)}`;
      if (max) return `Up to ${formatter.format(max)}`;
      return null;
    };

    const salary = formatSalary(data.salaryMin, data.salaryMax, data.salaryCurrency);

    return `
New Job Match!

Hello ${data.candidateName},

Great news! A new job matching your alert criteria has been posted:

${data.jobTitle}
Company: ${data.companyName}
Location: ${data.location}${data.workArrangement ? ` (${data.workArrangement.replace('_', ' ')})` : ''}
${data.employmentType ? `Type: ${data.employmentType.replace('_', ' ')}` : ''}
${salary ? `Salary: ${salary}` : ''}

View and apply: ${data.jobUrl}

You're receiving this email because you set up a job alert on HRM8.

Good luck with your job search!
The HRM8 Team
    `.trim();
  }
}

export const emailService = new EmailService();
