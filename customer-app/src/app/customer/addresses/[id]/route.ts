import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '');

async function proxyRequestWithId(req: NextRequest, id: string) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { success: false, message: 'Backend URL not configured' },
      { status: 500 }
    );
  }

  const method = req.method;
  const headers: Record<string, string> = {};

  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;

  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;

  const custToken = req.headers.get('x-customer-token');
  if (custToken) headers['x-customer-token'] = custToken;

  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  let body: string | undefined = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await req.text();
    } catch {
      // no body
    }
  }

  const primaryUrl = `${BACKEND_URL}/customer/addresses/${encodeURIComponent(id)}`;
  const fallbackUrl = `${BACKEND_URL}/users/api/addresses/${encodeURIComponent(id)}`;

  try {
    let res = await fetch(primaryUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });

    // If 404 with HTML response, attempt fallback URL
    if (res.status === 404) {
      const clonedRes = res.clone();
      const text = await clonedRes.text().catch(() => '');
      if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('Cannot ')) {
        const fallbackRes = await fetch(fallbackUrl, {
          method,
          headers,
          body,
          cache: 'no-store',
        }).catch(() => null);

        if (fallbackRes && fallbackRes.status !== 404) {
          res = fallbackRes;
        }
      }
    }

    const contentTypeHeader = res.headers.get('content-type') || '';
    if (contentTypeHeader.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // If non-JSON returned
    const textData = await res.text();
    if (textData.includes('<!DOCTYPE') || textData.includes('<html')) {
      return NextResponse.json(
        {
          success: false,
          message: res.status === 404 ? 'Address not found or endpoint unavailable' : 'Unexpected server error response',
        },
        { status: res.status }
      );
    }

    return new NextResponse(textData, {
      status: res.status,
      headers: { 'content-type': contentTypeHeader || 'text/plain' },
    });
  } catch (error: any) {
    console.error(`[addresses/[id]/route] Error connecting to backend:`, error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Unable to connect to the server. Check your connection.' },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  return proxyRequestWithId(req, id);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  return proxyRequestWithId(req, id);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  return proxyRequestWithId(req, id);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  return proxyRequestWithId(req, id);
}
