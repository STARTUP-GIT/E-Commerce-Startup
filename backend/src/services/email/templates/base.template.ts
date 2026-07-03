const APP_NAME = process.env.APP_NAME || 'E-Commerce Startup';
const BRAND_COLOR = '#6366f1';

export interface BaseTemplateOptions {
  title: string;
  preheader: string;
  content: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export const renderBaseTemplate = ({
  title,
  preheader,
  content,
  ctaLabel,
  ctaUrl,
  footerNote,
}: BaseTemplateOptions) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#07111f;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e5e7eb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#07111f;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:linear-gradient(135deg,#111827,#1f2937);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <tr>
              <td style="background:${BRAND_COLOR};padding:24px 32px;">
                <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);">${APP_NAME}</div>
                <div style="font-size:24px;font-weight:700;color:#ffffff;margin-top:8px;">${title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <div style="font-size:15px;line-height:1.7;color:#d1d5db;">${content}</div>
                ${ctaLabel && ctaUrl ? `<div style="margin-top:24px;"><a href="${ctaUrl}" style="display:inline-block;padding:12px 20px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;">${ctaLabel}</a></div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;color:#9ca3af;font-size:12px;line-height:1.7;">
                ${footerNote || 'This message was sent by the marketplace platform. If you did not request this action, you can safely ignore it.'}
                <div style="margin-top:12px;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
