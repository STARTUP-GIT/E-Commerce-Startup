import { importJWK, jwtVerify } from 'jose';

let cachedSupabaseJwks: { keys: any[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour

export const getSupabaseUrl = (): string =>
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL || '';

/**
 * Verify a Supabase user access token (the JWT the frontend receives from
 * supabase.auth after a user signs in) using the project's public JWKS.
 *
 * The token is verified cryptographically against the SAME Supabase project
 * (issuer = <SUPABASE_URL>/auth/v1). No service-role key is required here —
 * only the public project URL is needed to fetch the JWKS.
 *
 * Returns the decoded payload (contains sub = the Supabase user id, email, etc.)
 * or throws if the token is invalid / expired / signed by another project.
 */
export async function verifySupabaseAccessToken(token: string): Promise<any> {
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');

    const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/.well-known/jwks.json`;

    if (!cachedSupabaseJwks || Date.now() - cachedSupabaseJwks.fetchedAt > JWKS_CACHE_TTL) {
        const res = await fetch(jwksUrl);
        if (!res.ok) throw new Error(`Failed to fetch Supabase JWKS: ${res.status}`);
        const data = await res.json() as { keys: any[] };
        cachedSupabaseJwks = { keys: data.keys, fetchedAt: Date.now() };
    }

    const { payload } = await jwtVerify(
        token,
        async (header) => {
            const key = cachedSupabaseJwks!.keys.find((k) => k.kid === header.kid);
            if (!key) throw new Error(`No matching JWKS key for kid: ${header.kid}`);
            return importJWK(key, key.alg);
        },
        { issuer: `${supabaseUrl.replace(/\/$/, '')}/auth/v1` }
    );

    return payload;
}
