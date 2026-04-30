import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  phone: string;
  name?: string;
  referralCode: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  TOKEN: "@otc/token",
  USER: "@otc/user",
};

function generateReferralCode(phone: string): string {
  const suffix = phone.slice(-4);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "OTC";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code + suffix;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState("");

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    if (otp !== "1234" && otp !== "0000") {
      throw new Error("Invalid OTP. Use 1234 for demo.");
    }
    const userId =
      Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newUser: User = {
      id: userId,
      phone,
      referralCode: generateReferralCode(phone),
    };
    const fakeToken = "otc_jwt_" + userId;
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, fakeToken),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser)),
    ]);
    setToken(fakeToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!user) return;
      const updated = { ...user, ...updates };
      setUser(updated);
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated)).catch(
        () => {}
      );
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        updateUser,
        pendingPhone,
        setPendingPhone,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
