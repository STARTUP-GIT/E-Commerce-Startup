import type { Request } from "express";

/**
 * Extracts all candidate authentication tokens from an incoming Express request.
 *
 * Browsers can send multiple cookies with the same name under several scenarios:
 *  1. Partitioned (CHIPS) cookies vs unpartitioned cookies.
 *  2. Cookies set on different domain levels (e.g. host-only vs wildcard domain).
 *  3. Cookies set on different path scopes (e.g. '/' vs '/api/admin').
 *
 * In standard Express with cookie-parser, only the first matching cookie is exposed on
 * req.cookies, which in Chrome is often an older or partitioned cookie that may be expired.
 *
 * This utility parses the raw Cookie header and extracts every occurrence of the cookie,
 * returning candidates with the latest/most recently emitted ones first, combined with
 * any Authorization Bearer header or custom header.
 */
export function extractCandidateTokens(req: Request, cookieName: string, headerName?: string): string[] {
    const tokens: string[] = [];

    // 1. Authorization header: Bearer <token> (highest priority for fresh tokens)
    const authHeader = req.headers?.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        const bearer = authHeader.substring(7).trim();
        if (bearer) tokens.push(bearer);
    }

    // 2. Custom header if provided (e.g. x-admin-token, x-customer-token, x-seller-token)
    if (headerName && req.headers) {
        const hVal = req.headers[headerName.toLowerCase()];
        if (typeof hVal === "string" && hVal.trim()) {
            const trimmed = hVal.trim();
            if (!tokens.includes(trimmed)) tokens.push(trimmed);
        }
    }

    // 3. Raw Cookie header: extract every occurrence of cookieName
    const rawCookie = req.headers?.cookie;
    if (rawCookie) {
        const headerTokens: string[] = [];
        const parts = rawCookie.split(";");
        for (const part of parts) {
            const eqIdx = part.indexOf("=");
            if (eqIdx !== -1) {
                const name = part.slice(0, eqIdx).trim();
                const val = part.slice(eqIdx + 1).trim();
                if (name === cookieName && val) {
                    headerTokens.push(val);
                }
            }
        }
        // Test in reverse order (Chrome appends newer re-emitted cookies after older ones)
        for (let i = headerTokens.length - 1; i >= 0; i--) {
            if (!tokens.includes(headerTokens[i])) {
                tokens.push(headerTokens[i]);
            }
        }
    }

    // 4. Fallback to Express cookie-parser parsed cookies if not already captured
    const parsedCookie = req.cookies?.[cookieName];
    if (typeof parsedCookie === "string" && parsedCookie && !tokens.includes(parsedCookie)) {
        tokens.push(parsedCookie);
    } else if (Array.isArray(parsedCookie)) {
        for (const v of parsedCookie) {
            if (typeof v === "string" && v && !tokens.includes(v)) {
                tokens.push(v);
            }
        }
    }

    return tokens;
}
