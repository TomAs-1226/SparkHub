"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken, clearToken } from "@/lib/auth";

export type CurrentUser = {
    id: string;
    email: string;
    name?: string;
    role: string;
    avatarUrl?: string | null;
};

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export function useCurrentUser() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!getToken()) {
            setUser(null);
            setLoading(false);
            return null;
        }
        setLoading(true);
        try {
            const res = await api("/auth/me", { method: "GET" });
            if (!res.ok) {
                if (res.status === 401) clearToken();
                setUser(null);
                return null;
            }
            const json = await safeJson(res);
            if (json?.ok) {
                setUser(json.user);
                return json.user as CurrentUser;
            }
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { user, loading, refresh, setUser } as const;
}
