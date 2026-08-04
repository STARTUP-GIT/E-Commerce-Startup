import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  activeDialog: string | null;
  setActiveDialog: (dialogId: string | null) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeDialog: null,
  setActiveDialog: (dialogId) => set({ activeDialog: dialogId }),
  toasts: [],
  showToast: (message, type = 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
