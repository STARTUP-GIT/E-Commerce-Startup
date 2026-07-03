import { renderBaseTemplate } from './base.template.js';

export const renderForgotPasswordTemplate = ({ firstName = 'there', otp, resetUrl }: { firstName?: string; otp: string; resetUrl: string }) => renderBaseTemplate({
  title: 'Reset your password',
  preheader: 'We received a password reset request',
  content: `
    <p>Hello ${firstName},</p>
    <p>We received a request to reset your password. Use the code below or open the secure link to continue.</p>
    <div style="margin:24px 0;padding:20px 24px;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;text-align:center;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Verification code</div>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#ffffff;margin-top:8px;">${otp}</div>
    </div>
    <p>The link below will take you to the reset experience for your account.</p>
  `,
  ctaLabel: 'Reset password',
  ctaUrl: resetUrl,
  footerNote: 'If you did not request a password reset, you can safely ignore this email. Your account will remain secure.',
});
