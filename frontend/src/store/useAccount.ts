import { create } from "zustand";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { useStore } from "@/store/useStore";
import type { Balances, OpenOrder, OrderHistoryItem } from "@/types";

interface AccountState {
    balances: Balances;
    openOrders: OpenOrder[];
    history: OrderHistoryItem[];
    /** Reloads balances, open orders and order history for the logged in user. */
    refresh: () => Promise<void>;
    clear: () => void;
}

const EMPTY = { balances: {}, openOrders: [], history: [] };

export const useAccount = create<AccountState>((set) => ({
    ...EMPTY,

    refresh: async () => {
        if (!useAuth.getState().token) {
            return;
        }
        const market = useStore.getState().market;
        const [balances, openOrders, history] = await Promise.allSettled([
            api.getBalances(), api.getOpenOrders(market), api.getOrderHistory(market),
        ]);
        set((state) => ({
            balances: balances.status === "fulfilled" ? balances.value : state.balances,
            openOrders: openOrders.status === "fulfilled" ? openOrders.value : state.openOrders,
            history: history.status === "fulfilled" ? history.value : state.history,
        }));
    },

    clear: () => set(EMPTY),
}));

// load the account when logging in, wipe it when logging out, and keep it fresh while logged in
useAuth.subscribe((state, previous) => {
    if (state.token && state.token !== previous.token) {
        useAccount.getState().refresh();
    } else if (!state.token && previous.token) {
        useAccount.getState().clear();
    }
});

setInterval(() => useAccount.getState().refresh(), 5000);
