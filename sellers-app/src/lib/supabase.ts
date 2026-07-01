export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    given_name?: string;
    family_name?: string;
  };
}

export interface SupabaseSession {
  access_token: string;
  id_token?: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
}

type AuthStateCallback = (event: string, session: SupabaseSession | null) => void;

class SupabaseAuthClient {
  private listeners = new Set<AuthStateCallback>();
  private storageKey = 'aura-supabase-session';

  constructor() {
    // Listen for hash fragment changes to capture the redirect callback parameters
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', this.handleHashChange.bind(this));
      // Process initial hash if present
      setTimeout(() => this.handleHashChange(), 100);
    }
  }

  private handleHashChange() {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');
    const errorDescription = params.get('error_description');

    if (errorDescription) {
      console.error('Supabase Auth Redirect Error:', errorDescription);
      return;
    }

    if (accessToken && idToken) {
      // Decode simulated or real id_token
      try {
        let userProfile: any = {};
        if (idToken.startsWith('mock_id_token_')) {
          // Decode mock user data embedded in the mock token
          const base64Data = idToken.replace('mock_id_token_', '');
          userProfile = JSON.parse(decodeURIComponent(atob(base64Data)));
        } else {
          // Fallback parsing for real JWTs
          const base64Url = idToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          userProfile = JSON.parse(decodeURIComponent(atob(base64)));
        }

        const session: SupabaseSession = {
          access_token: accessToken,
          id_token: idToken,
          refresh_token: params.get('refresh_token') || 'mock_refresh_token',
          expires_in: parseInt(params.get('expires_in') || '3600', 10),
          user: {
            id: userProfile.sub || userProfile.id || `mock_${Date.now()}`,
            email: userProfile.email,
            user_metadata: {
              full_name: userProfile.name,
              name: userProfile.name,
              avatar_url: userProfile.picture || userProfile.avatar_url,
              given_name: userProfile.given_name,
              family_name: userProfile.family_name,
            },
          },
        };

        this.setSession(session);
        // Clear hash so it doesn't pollute the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        this.notify('SIGNED_IN', session);
      } catch (err) {
        console.error('Failed to parse redirect session hash:', err);
      }
    }
  }

  private setSession(session: SupabaseSession | null) {
    if (typeof window === 'undefined') return;
    if (session) {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  public getSessionSync(): SupabaseSession | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(this.storageKey);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public async getSession(): Promise<{ data: { session: SupabaseSession | null }; error: any }> {
    return { data: { session: this.getSessionSync() }, error: null };
  }

  public async signInWithOAuth(options: {
    provider: 'google';
    options?: { redirectTo?: string };
  }): Promise<{ data: any; error: any }> {
    if (typeof window === 'undefined') return { data: null, error: 'Window undefined' };

    const redirectUri = options.options?.redirectTo || window.location.origin + '/login';
    const clientId = '1039406575053-en4kn2rcvbc8ksajqlqcc5rce0f219r2.apps.googleusercontent.com';
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token+id_token&scope=${encodeURIComponent('email profile openid')}&nonce=nonce_${Date.now()}`;
    
    window.location.href = googleOAuthUrl;

    return { data: { provider: 'google', url: googleOAuthUrl }, error: null };
  }

  public async signOut(): Promise<{ error: any }> {
    this.setSession(null);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  public onAuthStateChange(callback: AuthStateCallback): {
    data: { subscription: { unsubscribe: () => void } };
  } {
    this.listeners.add(callback);
    // Emit the initial state immediately
    const session = this.getSessionSync();
    callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners.delete(callback);
          },
        },
      },
    };
  }

  private notify(event: string, session: SupabaseSession | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, session);
      } catch (err) {
        console.error('Error in onAuthStateChange listener:', err);
      }
    });
  }
}

export const supabase = {
  auth: new SupabaseAuthClient(),
};
