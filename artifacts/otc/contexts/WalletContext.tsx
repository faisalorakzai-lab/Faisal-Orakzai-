import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  timestamp: number;
  category: "referral" | "welcome" | "ride" | "delivery" | "rental" | "hotel" | "topup";
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

  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : null;
  const referralsStorageKey = user ? `${REFERRALS_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!storageKey || !referralsStorageKey) {
      setIsLoading(false);
      return;
    }
    async function load() {
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
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [storageKey, referralsStorageKey]);

  const persist = useCallback(
    async (newBalance: number, newTxs: Transaction[]) => {
      if (!storageKey) return;
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ balance: newBalance, transactions: newTxs, hasClaimedWelcome: true })
      );
    },
    [storageKey]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id" | "timestamp">) => {
      const fullTx: Transaction = {
        ...tx,
        id:
          Date.now().toString() + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
      };
      setTransactions((prev) => {
        const updated = [fullTx, ...prev];
        const newBalance =
          tx.type === "credit"
            ? balance + tx.amount
            : Math.max(0, balance - tx.amount);
        setBalance(newBalance);
        persist(newBalance, updated);
        return updated;
      });
    },
    [balance, persist]
  );

  const claimReferral = useCallback(
    (referralCode: string): boolean => {
      if (!referralsStorageKey) return false;
      if (usedReferrals.includes(referralCode)) return false;
      if (user && referralCode === user.referralCode) return false;

      const referrerBonus = 5;
      const updatedReferrals = [...usedReferrals, referralCode];
      setUsedReferrals(updatedReferrals);
      AsyncStorage.setItem(referralsStorageKey, JSON.stringify(updatedReferrals)).catch(() => {});

      addTransaction({
        type: "credit",
        amount: referrerBonus,
        description: "Referral bonus applied",
        category: "referral",
      });
      return true;
    },
    [usedReferrals, user, addTransaction, referralsStorageKey]
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
