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
}

export const emailService = new EmailService();

