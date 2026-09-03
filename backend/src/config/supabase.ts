import { importJWK, jwtVerify } from 'jose';

let cachedSupabaseJwks: { keys: any[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour

export const getSupabaseUrl = (): string =>
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL || '';

export const getSupabaseAnonKey = (): string =>
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

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

    try {
        const payload = await verifySupabaseAccessTokenViaJwks(token, supabaseUrl);
        return payload;
    } catch (jwksErr) {
        // Fall back to a round-trip verification against Supabase Auth. This
        // covers projects still on the legacy symmetric (HS256) JWT secret,
        // whose JWKS endpoint returns an empty key set (JWKS only publishes
        // asymmetric public keys). Round-trip verification with the public anon
        // key is safe and always resolves the user regardless of signing setup.
        const payload = await fetchSupabaseUser(token, supabaseUrl);
        return payload;
    }
}

function getJwksUrl(supabaseUrl: string): string {
    // Supabase publishes the public JWKS at /auth/v1/.well-known/jwks.json,
    // NOT at the project root. The issuer of a Supabase access token is
    // <SUPABASE_URL>/auth/v1, so the discovery path lives under auth/v1 too.
    return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
}

async function verifySupabaseAccessTokenViaJwks(token: string, supabaseUrl: string): Promise<any> {
    const jwksUrl = getJwksUrl(supabaseUrl);

    if (!cachedSupabaseJwks || Date.now() - cachedSupabaseJwks.fetchedAt > JWKS_CACHE_TTL) {
        const res = await fetch(jwksUrl);
        if (!res.ok) throw new Error(`Failed to fetch Supabase JWKS: ${res.status}`);
        const data = await res.json() as { keys: any[] };
        cachedSupabaseJwks = { keys: data.keys, fetchedAt: Date.now() };
        console.log(`[GOOGLE_AUTH] Fetched Supabase JWKS (status ${res.status}, ${data.keys?.length ?? 0} keys)`);
    }

    // An empty key set means the project is not on asymmetric signing keys; the
    // caller (verifySupabaseAccessToken) will fall back to round-trip auth.
    if (!cachedSupabaseJwks.keys || cachedSupabaseJwks.keys.length === 0) {
        throw new Error('Supabase JWKS returned an empty key set (project likely on symmetric HS256)');
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

async function fetchSupabaseUser(token: string, supabaseUrl: string): Promise<any> {
    const anonKey = getSupabaseAnonKey();
    const userEndpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`;

    const res = await fetch(userEndpoint, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        console.log(`[GOOGLE_AUTH] Supabase /auth/v1/user verification failed (status ${res.status})`);
        throw new Error(`Supabase user verification failed: ${res.status}`);
    }

    const user = await res.json() as any;
    console.log(`[GOOGLE_AUTH] Supabase /auth/v1/user verification succeeded (status ${res.status})`);
    return {
        sub: user?.id,
        email: user?.email,
        user_metadata: user?.user_metadata,
        ...(user || {}),
    };
}
