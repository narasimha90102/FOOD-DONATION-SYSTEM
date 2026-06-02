import nodemailer from 'nodemailer';
import { env } from '../config/env';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initializes the transporter, falling back to a mock test account or log mechanism if credentials are empty.
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    // Check if configuration exists
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      } as any);
      return this.transporter;
    }

    // Dev/Fallback mock transporter
    console.log('[EmailService] SMTP credentials missing. Scaffolding dynamic mock nodemailer mailer...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return this.transporter;
    } catch (err) {
      console.warn('[EmailService] Failed to create Ethereal mock account. Falling back to console-logging emails.');
      // Create a dummy transporter that prints to console
      this.transporter = {
        sendMail: async (options: any) => {
          console.log('\n=================== MOCK EMAIL SENT ===================');
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`Body:\n${options.text || options.html}`);
          console.log('========================================================\n');
          return { messageId: 'console-mock-' + Date.now() };
        },
      } as unknown as nodemailer.Transporter;
      return this.transporter;
    }
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
      console.log(`[EmailService] Email sent successfully: ${info.messageId}`);
      
      // If using ethereal test account, log url
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log(`[EmailService] Ethereal Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (error) {
      console.error('[EmailService] Send email failed:', error);
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
   * Sends the password reset verification.
   */
  public static async sendResetPasswordCode(email: string, code: string): Promise<boolean> {
    const subject = 'Reset your FoodBridge AI Password';
    const text = `You requested a password reset. Use this code to complete the process: ${code}. This code is valid for 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ef4444; text-align: center;">Password Reset Request</h2>
        <p>We received a request to reset your password for FoodBridge AI.</p>
        <p>Please use the verification code below to establish a new password:</p>
        <div style="background-color: #fef2f2; border: 2px dashed #ef4444; font-size: 28px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; color: #991b1b; letter-spacing: 4px;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #718096; text-align: center;">This code is valid for 10 minutes. If you did not request a password reset, please contact support immediately.</p>
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
