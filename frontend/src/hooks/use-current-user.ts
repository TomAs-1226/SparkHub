"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { getToken, clearToken, persistUser as persistAuthUser, readPersistedUser } from "@/lib/auth";

export type CurrentUser = {
    id: string;
    email: string;
    name?: string;
    role: string;
    avatarUrl?: string | null;
};

type CurrentUserState = { user: CurrentUser | null; loading: boolean };

const cachedUser = readPersistedUser<CurrentUser | null>();
const store: { state: CurrentUserState; listeners: Set<() => void> } = {
    state: { user: cachedUser, loading: !!getToken() && !cachedUser },
    listeners: new Set(),
};

function setState(patch: Partial<CurrentUserState>) {
    store.state = { ...store.state, ...patch };
    store.listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
}

function getSnapshot() {
    return store.state;
}

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function persistUser(next: CurrentUser | null) {
    persistAuthUser(next);
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
    if (!getToken()) {
        persistUser(null);
        setState({ user: null, loading: false });
        return null;
    }
    setState({ loading: true });
    try {
        const res = await api("/auth/me", { method: "GET" });
        if (!res.ok) {
            if (res.status === 401) clearToken();
            persistUser(null);
            setState({ user: null });
            return null;
        }
        const json = await safeJson(res);
        if (json?.ok) {
            const nextUser = (json.user || null) as CurrentUser | null;
            persistUser(nextUser);
            setState({ user: nextUser });
            return nextUser;
        }
        persistUser(null);
        setState({ user: null });
        return null;
    } catch {
        persistUser(null);
        setState({ user: null });
        return null;
    } finally {
        setState({ loading: false });
    }
}

export async function refreshCurrentUserStore() {
    return fetchCurrentUser();
}

let bootstrapped = false;

export function useCurrentUser() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const refresh = useCallback(async () => refreshCurrentUserStore(), []);
    const setUser = useCallback((next: CurrentUser | null) => {
        persistUser(next);
        setState({ user: next, loading: false });
    }, []);

    useEffect(() => {
        if (!bootstrapped) {
            bootstrapped = true;
            refresh();
        }
    }, [refresh]);

    return { user: snapshot.user, loading: snapshot.loading, refresh, setUser } as const;
}
