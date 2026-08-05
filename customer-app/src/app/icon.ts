import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const resolveUrl = (value?: string): string | null => {
  if (!value || value.trim() === '' || value === '/favicon.ico') return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (BACKEND_URL) {
    return `${BACKEND_URL}${value.startsWith('/') ? value : `/${value}`}`;
  }
  return null;
};

export default async function GET() {
  let iconUrl: string | null = null;

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/branding/public`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const b = await res.json();
        iconUrl = resolveUrl(b?.favicon || b?.faviconUrl || b?.logo || b?.logoUrl);
      }
    } catch {
      // Fall through to no icon.
    }
  }

  if (iconUrl) {
    try {
      const img = await fetch(iconUrl, { cache: 'no-store' });
      if (img.ok) {
        const body = Buffer.from(await img.arrayBuffer());
        return new NextResponse(body, {
          headers: {
            'Content-Type': img.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      }
    } catch {
      // Fall through to no icon.
    }
  }

  return new NextResponse(null, { status: 204 });
}
