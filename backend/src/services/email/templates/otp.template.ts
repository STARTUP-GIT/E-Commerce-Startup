import { renderBaseTemplate } from './base.template.js';

export const renderOtpTemplate = ({ otp, expiresInMinutes = 10, recipientName = 'there' }: { otp: string; expiresInMinutes?: number; recipientName?: string }) => renderBaseTemplate({
  title: 'Your verification code',
  preheader: 'Use this secure code to continue',
  content: `
    <p>Hello ${recipientName},</p>
    <p>Use the code below to continue with your secure verification request.</p>
    <div style="margin:24px 0;padding:20px 24px;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;text-align:center;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">One-time password</div>
      <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#ffffff;margin-top:8px;">${otp}</div>
    </div>
    <p>This code expires in ${expiresInMinutes} minutes and should never be shared with anyone.</p>
  `,
  footerNote: 'For your security, do not share this code with anyone. If you did not request this, please ignore this message.',
});
