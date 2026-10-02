import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";
import { setCurrency } from "./format";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: !!getToken(), user: null, org: null, rules: null, demo: false });

  const refresh = useCallback(async () => {
    if (!getToken()) return setState((s) => ({ ...s, loading: false }));
    try {
      const me = await api.get("/api/auth/me");
      setCurrency(me.org.currency);
      setState({ loading: false, ...me });
    } catch {
      setState({ loading: false, user: null, org: null, rules: null, demo: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = async (token) => { setToken(token); await refresh(); };
  const signOut = () => { setToken(null); setState({ loading: false, user: null, org: null, rules: null, demo: false }); };

  return <Ctx.Provider value={{ ...state, refresh, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
