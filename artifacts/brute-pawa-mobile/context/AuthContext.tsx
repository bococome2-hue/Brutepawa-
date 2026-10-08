import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  role: string;
  status: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem("bp_token");
        const storedUser = await AsyncStorage.getItem("bp_user");
        if (storedToken) {
          setToken(storedToken);
          setAuthTokenGetter(() => storedToken);
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: AuthUser) => {
    await AsyncStorage.setItem("bp_token", newToken);
    await AsyncStorage.setItem("bp_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setAuthTokenGetter(() => newToken);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem("bp_token");
    await AsyncStorage.removeItem("bp_user");
    setToken(null);
    setUser(null);
    setAuthTokenGetter(null);
  }, []);

  const updateUser = useCallback(async (updatedUser: AuthUser) => {
    await AsyncStorage.setItem("bp_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
