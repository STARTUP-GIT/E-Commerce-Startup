import { renderBaseTemplate } from './base.template.js';

export const renderVerificationTemplate = ({ firstName = 'there', verificationUrl }: { firstName?: string; verificationUrl: string }) => renderBaseTemplate({
  title: 'Verify your email',
  preheader: 'Confirm your email address',
  content: `
    <p>Hello ${firstName},</p>
    <p>Please verify your email address to activate your account and keep your account secure.</p>
  `,
  ctaLabel: 'Verify email',
  ctaUrl: verificationUrl,
  footerNote: 'If you did not create this account, you can ignore this email.',
});
