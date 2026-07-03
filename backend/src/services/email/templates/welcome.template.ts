import { renderBaseTemplate } from './base.template.js';

export const renderWelcomeTemplate = ({ firstName = 'there', loginUrl }: { firstName?: string; loginUrl: string }) => renderBaseTemplate({
  title: 'Welcome aboard',
  preheader: 'Your account is ready',
  content: `
    <p>Hello ${firstName},</p>
    <p>Welcome to the marketplace. Your account is now ready to use.</p>
    <p>Sign in to explore sellers, products, and orders.</p>
  `,
  ctaLabel: 'Go to dashboard',
  ctaUrl: loginUrl,
  footerNote: 'Need help? Reach out to our support team and we will be happy to assist.',
});
