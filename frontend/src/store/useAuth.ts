import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
    token: string | null;
    email: string | null;
    authDialogOpen: boolean;
    setSession: (token: string, email: string) => void;
    logout: () => void;
    setAuthDialogOpen: (open: boolean) => void;
}

export const useAuth = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            email: null,
            authDialogOpen: false,
            setSession: (token, email) => set({ token, email, authDialogOpen: false }),
            logout: () => set({ token: null, email: null }),
            setAuthDialogOpen: (authDialogOpen) => set({ authDialogOpen }),
        }),
        {
            name: "exchange-auth",
            partialize: (state) => ({ token: state.token, email: state.email }),
        }
    )
);
