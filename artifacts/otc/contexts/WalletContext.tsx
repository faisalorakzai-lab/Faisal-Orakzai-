import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  timestamp: number;
  category:
    | "referral"
    | "milestone"
    | "welcome"
    | "ride"
    | "delivery"
    | "rental"
    | "hotel"
    | "topup"
    | "commission";
}

interface WalletContextValue {
  balance: number;
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (tx: Omit<Transaction, "id" | "timestamp">) => void;
  claimReferral: (referralCode: string) => boolean;
  hasClaimedWelcome: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "@otc/wallet";
const REFERRALS_KEY = "@otc/referrals_used";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasClaimedWelcome, setHasClaimedWelcome] = useState(false);
  const [usedReferrals, setUsedReferrals] = useState<string[]>([]);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : null;
  const referralsStorageKey = user ? `${REFERRALS_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!storageKey || !user) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from("otc_wallet_data")
            .select("*")
            .eq("user_id", user!.id)
            .maybeSingle();

          if (!error && data) {
            const txs: Transaction[] = Array.isArray(data.transactions)
              ? data.transactions
              : [];
            setBalance(data.balance ?? 0);
            setTransactions(txs);
            setHasClaimedWelcome(data.has_claimed_welcome ?? false);
            await AsyncStorage.setItem(
              storageKey!,
              JSON.stringify({
                balance: data.balance,
                transactions: txs,
                hasClaimedWelcome: data.has_claimed_welcome,
              })
            ).catch(() => {});
            return;
          }
        }
      } catch {
      }

      try {
        const [walletData, referralsData] = await Promise.all([
          AsyncStorage.getItem(storageKey!),
          AsyncStorage.getItem(referralsStorageKey!),
        ]);

        if (walletData) {
          const parsed = JSON.parse(walletData);
          setBalance(parsed.balance ?? 0);
          setTransactions(parsed.transactions ?? []);
          setHasClaimedWelcome(parsed.hasClaimedWelcome ?? false);
        } else {
          const welcomeBonus = 10;
          const welcomeTx: Transaction = {
            id: Date.now().toString() + "_welcome",
            type: "credit",
            amount: welcomeBonus,
            description: "Welcome bonus — OTC Coins",
            timestamp: Date.now(),
            category: "welcome",
          };
          setBalance(welcomeBonus);
          setTransactions([welcomeTx]);
          setHasClaimedWelcome(true);
          const newData = {
            balance: welcomeBonus,
            transactions: [welcomeTx],
            hasClaimedWelcome: true,
          };
          await AsyncStorage.setItem(storageKey!, JSON.stringify(newData));
        }
        if (referralsData) {
          setUsedReferrals(JSON.parse(referralsData));
        }
      } catch {
      }
    }

    load().finally(() => setIsLoading(false));
  }, [storageKey, referralsStorageKey, user]);

  const persistWallet = useCallback(
    async (newBalance: number, newTxs: Transaction[], claimed: boolean) => {
      if (!user) return;
      if (storageKey) {
        AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            balance: newBalance,
            transactions: newTxs,
            hasClaimedWelcome: claimed,
          })
        ).catch(() => {});
      }
      if (supabase) {
        void Promise.resolve(
          supabase.from("otc_wallet_data").upsert({
            user_id: user.id,
            balance: newBalance,
            transactions: newTxs,
            has_claimed_welcome: claimed,
            updated_at: new Date().toISOString(),
          })
        ).catch(() => {});
      }
    },
    [storageKey, user]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id" | "timestamp">) => {
      const fullTx: Transaction = {
        ...tx,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
      };
      setTransactions((prev) => {
        const updated = [fullTx, ...prev];
        const newBalance =
          tx.type === "credit"
            ? balanceRef.current + tx.amount
            : Math.max(0, balanceRef.current - tx.amount);
        setBalance(newBalance);
        persistWallet(newBalance, updated, true);
        return updated;
      });
    },
    [persistWallet]
  );

  // claimReferral is kept for API compatibility but no longer credits coins locally.
  // Referral rewards are granted exclusively server-side via /api/otc/referral/complete
  // after the new user's first ride is verified in the database.
  const claimReferral = useCallback(
    (_referralCode: string): boolean => {
      return false;
    },
    []
  );

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        isLoading,
        addTransaction,
        claimReferral,
        hasClaimedWelcome,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
