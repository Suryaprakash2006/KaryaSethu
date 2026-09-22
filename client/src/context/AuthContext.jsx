import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [federation, setFederation] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("ks_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setWorkerProfile(data.workerProfile);
      setFederation(data.federation);
    } catch (e) {
      localStorage.removeItem("ks_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (payload) => {
    const data = await api.login(payload);
    localStorage.setItem("ks_token", data.token);
    await refresh();
  };

  const federationLogin = async (payload) => {
    const data = await api.federationLogin(payload);
    localStorage.setItem("ks_token", data.token);
    await refresh();
  };

  const signup = async (payload) => {
    const data = await api.signup(payload);
    localStorage.setItem("ks_token", data.token);
    await refresh();
  };

  const logout = () => {
    localStorage.removeItem("ks_token");
    setUser(null);
    setWorkerProfile(null);
    setFederation(null);
  };

  return (
    <AuthContext.Provider value={{ user, workerProfile, federation, loading, login, federationLogin, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
