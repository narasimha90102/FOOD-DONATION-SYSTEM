import nodemailer from 'nodemailer';
import { env } from '../config/env';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Builds a fresh transporter from current env vars.
   * Always re-reads env so .env changes are picked up after restart.
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      console.log(`[EmailService] Using SMTP: ${env.SMTP_HOST}:${env.SMTP_PORT} / user: ${env.SMTP_USER}`);
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,         // Brevo port 587 uses STARTTLS, NOT SSL
        requireTLS: true,      // Force STARTTLS upgrade
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: true,
        },
      } as any);
    }

    // Dev/Fallback mock transporter
    console.warn('[EmailService] ⚠️  SMTP credentials missing. Falling back to console-log mock mailer.');
    return {
      sendMail: async (options: any) => {
        console.log('\n=================== MOCK EMAIL SENT ===================');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body:\n${options.text || '(html only)'}`);
        console.log('========================================================\n');
        return { messageId: 'console-mock-' + Date.now() };
      },
    } as unknown as nodemailer.Transporter;
  }

  /**
   * Sends a general email.
   */
  public static async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      const mailOptions = {
        from: `"${env.FROM_NAME}" <${env.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] ✅ Email sent to ${options.to} — messageId: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[EmailService] ❌ Send failed:');
      console.error(`  To:      ${options.to}`);
      console.error(`  Subject: ${options.subject}`);
      console.error(`  Code:    ${error.code || 'N/A'}`);
      console.error(`  Response:${error.response || error.message}`);
      return false;
    }
  }

  /**
   * Sends the registration verification code.
   */
  public static async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const subject = 'Verify your FoodBridge AI Account';
    const text = `Welcome to FoodBridge AI! Please use this verification code to complete your signup: ${code}. This code is valid for 1 hour.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #10b981; text-align: center;">Welcome to FoodBridge AI</h2>
        <p>Thank you for registering. You are helping build a zero-hunger world!</p>
        <p>Please enter the verification code below on the signup portal to activate your account:</p>
        <div style="background-color: #f0fdf4; border: 2px dashed #10b981; font-size: 28px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; color: #047857; letter-spacing: 4px;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #718096; text-align: center;">This code is active for 1 hour. If you did not request this code, please ignore this email.</p>
      </div>
    `;

    return await this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Sends a secure password reset link (URL token — 1 hour expiry).
   */
  public static async sendPasswordResetLink(email: string, name: string, resetUrl: string): Promise<boolean> {
    const subject = 'Reset your FoodBridge AI Password';
    const text = `Hi ${name},\n\nYou requested a password reset for your FoodBridge AI account.\n\nClick the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please ignore this email — your password will remain unchanged.`;
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#030712;padding:40px 20px;min-height:100vh;">
        <div style="max-width:560px;margin:0 auto;background:#0f1827;border:1px solid rgba(16,185,129,0.2);border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#065f46,#0f766e);padding:32px 32px 24px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:24px;">🌱</span>
              <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">FoodBridge AI</span>
            </div>
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Zero Hunger Platform</p>
          </div>

          <!-- Body -->
          <div style="padding:36px 32px;">
            <h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Password Reset Request</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi <strong style="color:#e2e8f0;">${name}</strong>,<br><br>
              We received a request to reset the password for your FoodBridge AI account. Click the button below to choose a new password.
            </p>

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}"
                 style="display:inline-block;background:#10b981;color:#030712;font-size:15px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                🔐 Reset My Password
              </a>
            </div>

            <!-- Fallback link -->
            <p style="color:#64748b;font-size:12px;text-align:center;margin:0 0 4px;">Or copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#10b981;font-size:11px;text-align:center;margin:0 0 28px;">
              <a href="${resetUrl}" style="color:#10b981;">${resetUrl}</a>
            </p>

            <!-- Warning Box -->
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:14px 16px;">
              <p style="color:#fca5a5;font-size:12px;margin:0;line-height:1.6;">
                ⚠️ <strong>This link expires in 1 hour.</strong> If you did not request a password reset, please ignore this email — your account remains secure.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;text-align:center;">
            <p style="color:#475569;font-size:11px;margin:0;">
              © 2026 FoodBridge AI · Building a zero-hunger world<br>
              This is an automated message — please do not reply.
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Sends warning alert when a donation is approaching estimated expiry time.
   */
  public static async sendExpiryWarning(
    email: string,
    foodName: string,
    timeLeftHours: number
  ): Promise<boolean> {
    const subject = `CRITICAL: Donation Expiry Alert - ${foodName}`;
    const text = `Your food donation "${foodName}" is estimated to expire in ${timeLeftHours} hours. Please speed up the distribution process immediately.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #f59e0b; text-align: center;">Food Expiry Alert</h2>
        <p>Attention, dynamic action is needed!</p>
        <p>Your food donation for <strong>${foodName}</strong> is approaching its safe storage limit and is estimated to expire in:</p>
        <div style="background-color: #fffbeb; border: 1px solid #f59e0b; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; color: #b45309;">
          ${timeLeftHours} Hours Remaining
        </div>
        <p>Please ensure that active routing to pickup and delivery is prioritized. If the food is already un-consumable, please cancel the donation.</p>
      </div>
    `;

    return await this.sendEmail({ to: email, subject, text, html });
  }
}
