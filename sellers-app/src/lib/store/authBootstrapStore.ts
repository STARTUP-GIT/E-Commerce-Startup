import { create } from 'zustand';

// Tracks whether the initial auth bootstrap has completed. The Seller app
// restores the Supabase session in App.tsx (which may re-sync via Google and
// store the seller_token). The profile query in useAuth must not fire until
// this bootstrap settles, otherwise it 401s with no token and, for Google
// users, would wipe the session before the sync finishes.
interface AuthBootstrapStore {
  bootstrapped: boolean;
  setBootstrapped: (value: boolean) => void;
}

export const useAuthBootstrapStore = create<AuthBootstrapStore>((set) => ({
  bootstrapped: false,
  setBootstrapped: (value) => set({ bootstrapped: value }),
}));
