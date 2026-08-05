import { Resend } from 'resend';
import { renderBaseTemplate } from './templates/base.template.js';
import { renderOtpTemplate } from './templates/otp.template.js';
import { renderForgotPasswordTemplate } from './templates/forgotPassword.template.js';
import { renderVerificationTemplate } from './templates/emailVerification.template.js';
import { renderWelcomeTemplate } from './templates/welcome.template.js';
import { getPlatformBranding } from '../../modules/platform/services/settingsService.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const isDev = process.env.NODE_ENV?.toLowerCase() === 'development';
const isUsingResendDev = !!(EMAIL_FROM && EMAIL_FROM.includes('resend.dev'));

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const resolveUrl = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  return value.replace(/\/$/, '');
};

const customerFrontendUrl = resolveUrl(process.env.CUSTOMER_FRONTEND_URL || process.env.FRONTEND_CUSTOMER_URL, 'http://localhost:3000');
const sellerFrontendUrl = resolveUrl(process.env.SELLER_FRONTEND_URL || process.env.FRONTEND_SELLER_URL, 'http://localhost:5173');
const adminFrontendUrl = resolveUrl(process.env.ADMIN_FRONTEND_URL || process.env.FRONTEND_ADMIN_URL, 'http://localhost:8001');

class EmailService {
  private static async resolveBranding(): Promise<{ marketplaceName: string; logoUrl?: string }> {
    const branding = await getPlatformBranding().catch(() => null);
    return {
      marketplaceName: branding?.marketplaceName || branding?.name || 'Marketplace',
      logoUrl: branding?.logo || branding?.logoUrl || undefined,
    };
  }

  private static log(level: 'info' | 'warn' | 'error', event: string, payload?: Record<string, unknown>) {
    const prefix = `[EMAIL]`;
    const message = payload ? `${prefix} ${event} ${JSON.stringify(payload)}` : `${prefix} ${event}`;
    if (level === 'error') {
      console.error(message);
    } else if (level === 'warn') {
      console.warn(message);
    }
    // info-level email events are suppressed in production to keep server logs clean
  }

  private static async sendWithRetry(
    to: string,
    subject: string,
    html: string,
    branding: { marketplaceName: string; logoUrl?: string },
    isRetry = false,
  ): Promise<EmailSendResult> {
    if (!resend) {
      this.log('error', '✗ RESEND_API_KEY not configured', { to, subject });
      return { success: false, error: 'Email service is not configured. Please set RESEND_API_KEY.' };
    }

    if (!EMAIL_FROM) {
      this.log('error', '✗ EMAIL_FROM not configured', { to, subject });
      return { success: false, error: 'Email sender is not configured. Please set EMAIL_FROM.' };
    }

    const mktName = branding.marketplaceName || 'Marketplace';
    const fullSubject = `${mktName} • ${subject}`;

    if (isDev && isUsingResendDev) {
      this.log('warn', '⚠ Development mode: Resend free tier only delivers to your own verified email', {
        to,
        subject: fullSubject,
        sender: EMAIL_FROM,
        note: 'Only the email address registered with Resend can receive emails. Other recipients will be rejected.'
      });
    }

    this.log('info', '→ Sending email', { to, subject: fullSubject });

    try {
      const response = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: fullSubject,
        html,
      });

      this.log('info', '← Resend response received', {
        statusCode: 200,
        hasError: !!response.error,
        messageId: response.data?.id || null,
      });

      if (response.error) {
        this.log('error', '✗ Resend returned an error', {
          statusCode: 403,
          error: JSON.stringify(response.error),
        });
        return { success: false, error: `Email delivery failed: ${response.error.message || 'Unknown Resend error'}` };
      }

      this.log('info', '✓ Email delivered', { to, messageId: response.data?.id });
      return { success: true, messageId: response.data?.id };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const statusCode = error?.statusCode || error?.status || 500;

      this.log('error', '✗ Email delivery failed', {
        statusCode,
        error: errorMessage,
        isRetry,
      });

      if (!isRetry) {
        this.log('info', '↻ Retrying email once...', { to, subject: fullSubject });
        return this.sendWithRetry(to, subject, html, branding, true);
      }

      return { success: false, error: 'Email delivery failed' };
    }
  }

  static async sendOTPEmail(to: string, otp: string, options?: { firstName?: string; expiresInMinutes?: number }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const html = renderOtpTemplate({ otp, expiresInMinutes: options?.expiresInMinutes, recipientName: options?.firstName, marketplaceName: branding.marketplaceName, logoUrl: branding.logoUrl });
    return this.sendWithRetry(to, 'Verification code', html, branding);
  }

  static async sendPasswordResetEmail(to: string, token: string, options?: { firstName?: string; resetUrl?: string }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const resetUrl = options?.resetUrl || `${sellerFrontendUrl}/forgot-password#otp=${token}&username=${encodeURIComponent(to)}`;
    const html = renderForgotPasswordTemplate({ firstName: options?.firstName, otp: token, resetUrl, marketplaceName: branding.marketplaceName, logoUrl: branding.logoUrl });
    return this.sendWithRetry(to, 'Reset your password', html, branding);
  }

  static async sendVerificationEmail(to: string, options?: { firstName?: string; verificationUrl?: string }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const verificationUrl = options?.verificationUrl || `${customerFrontendUrl}/verify-email?email=${encodeURIComponent(to)}`;
    const html = renderVerificationTemplate({ firstName: options?.firstName, verificationUrl, marketplaceName: branding.marketplaceName, logoUrl: branding.logoUrl });
    return this.sendWithRetry(to, 'Verify your email', html, branding);
  }

  static async sendWelcomeEmail(to: string, options?: { firstName?: string; loginUrl?: string }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const loginUrl = options?.loginUrl || `${customerFrontendUrl}/login`;
    const html = renderWelcomeTemplate({ firstName: options?.firstName, loginUrl, marketplaceName: branding.marketplaceName, logoUrl: branding.logoUrl });
    return this.sendWithRetry(to, 'Welcome aboard', html, branding);
  }

  static async sendOTP(to: string, otp: string, options?: { firstName?: string; expiresInMinutes?: number }): Promise<EmailSendResult> {
    return this.sendOTPEmail(to, otp, options);
  }

  static async sendForgotPassword(to: string, otp: string, options?: { firstName?: string; resetUrl?: string }): Promise<EmailSendResult> {
    return this.sendPasswordResetEmail(to, otp, options);
  }

  static async sendOrderPlaced(to: string, options?: { firstName?: string; orderUrl?: string }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const orderUrl = options?.orderUrl || `${customerFrontendUrl}/orders`;
    const html = renderBaseTemplate({
      title: 'Order placed',
      preheader: 'Your order has been received',
      content: `<p>Hello ${options?.firstName || 'there'},</p><p>Your order has been successfully placed and is being prepared.</p>`,
      ctaLabel: 'View order',
      ctaUrl: orderUrl,
      footerNote: 'Thanks for shopping with us.',
      marketplaceName: branding.marketplaceName,
      logoUrl: branding.logoUrl,
    });
    return this.sendWithRetry(to, 'Order placed', html, branding);
  }

  static async sendSellerApproved(to: string, options?: { firstName?: string; sellerUrl?: string }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const sellerUrl = options?.sellerUrl || `${sellerFrontendUrl}/dashboard`;
    const html = renderBaseTemplate({
      title: 'Seller approved',
      preheader: 'Your seller account is now active',
      content: `<p>Hello ${options?.firstName || 'there'},</p><p>Your seller account has been approved. You can now start managing your shop.</p>`,
      ctaLabel: 'Open seller dashboard',
      ctaUrl: sellerUrl,
      footerNote: 'Welcome to the marketplace.',
      marketplaceName: branding.marketplaceName,
      logoUrl: branding.logoUrl,
    });
    return this.sendWithRetry(to, 'Seller approved', html, branding);
  }

  static async sendDeliveryAssigned(to: string, options?: { firstName?: string; trackingUrl?: string }): Promise<EmailSendResult> {
    const branding = await this.resolveBranding();
    const trackingUrl = options?.trackingUrl || `${customerFrontendUrl}/orders`;
    const html = renderBaseTemplate({
      title: 'Delivery assigned',
      preheader: 'A delivery agent has been assigned',
      content: `<p>Hello ${options?.firstName || 'there'},</p><p>Your order is now assigned to a delivery partner and is on the way.</p>`,
      ctaLabel: 'Track order',
      ctaUrl: trackingUrl,
      footerNote: 'We will keep you updated on the delivery progress.',
      marketplaceName: branding.marketplaceName,
      logoUrl: branding.logoUrl,
    });
    return this.sendWithRetry(to, 'Delivery assigned', html, branding);
  }
}

export default EmailService;
