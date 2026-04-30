import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/components/GlassCard";
import { useWallet, type Transaction } from "@/contexts/WalletContext";
import { useColors } from "@/hooks/useColors";

interface OrderEntry {
  id: string;
  title: string;
  subtitle: string;
  status: "completed" | "cancelled" | "pending";
  icon: string;
  coinsEarned: number;
  coinsSpent: number;
  date: number;
}

function txToOrder(tx: Transaction): OrderEntry | null {
  const serviceCategories: Transaction["category"][] = ["ride", "delivery", "rental", "hotel"];
  if (!serviceCategories.includes(tx.category)) return null;
  const labels: Record<string, { title: string; icon: string }> = {
    ride: { title: "OTC Ride", icon: "navigation" },
    delivery: { title: "OTC Delivery", icon: "package" },
    rental: { title: "Car Rental", icon: "truck" },
    hotel: { title: "Hotel Stay", icon: "home" },
  };
  const meta = labels[tx.category] ?? { title: tx.description, icon: "star" };
  return {
    id: tx.id,
    title: meta.title,
    subtitle: tx.description,
    status: tx.type === "credit" ? "completed" : "completed",
    icon: meta.icon,
    coinsEarned: tx.type === "credit" ? tx.amount : 0,
    coinsSpent: tx.type === "debit" ? tx.amount : 0,
    date: tx.timestamp,
  };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions } = useWallet();

  const orders = transactions
    .map(txToOrder)
    .filter((o): o is OrderEntry => o !== null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  function renderOrder({ item }: { item: OrderEntry }) {
    return (
      <GlassCard style={styles.orderCard}>
        <View style={styles.orderRow}>
          <View
            style={[
              styles.orderIcon,
              {
                backgroundColor: "rgba(255,215,0,0.08)",
                borderRadius: 12,
              },
            ]}
          >
            <Feather name={item.icon as any} size={20} color={colors.gold} />
          </View>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderTitle, { color: colors.foreground }]}>
              {item.title}
            </Text>
            <Text style={[styles.orderSub, { color: colors.mutedForeground }]}>
              {formatDate(item.date)}
            </Text>
          </View>
          <View style={styles.orderStatus}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === "completed"
                      ? "rgba(34,197,94,0.12)"
                      : item.status === "cancelled"
                      ? "rgba(204,51,51,0.12)"
                      : "rgba(255,215,0,0.12)",
                  borderRadius: 6,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === "completed"
                        ? colors.success
                        : item.status === "cancelled"
                        ? colors.destructive
                        : colors.gold,
                  },
                ]}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            {item.coinsEarned > 0 && (
              <Text style={[styles.coinsText, { color: colors.gold }]}>
                +{item.coinsEarned} OTC
              </Text>
            )}
            {item.coinsSpent > 0 && (
              <Text style={[styles.coinsText, { color: colors.destructive }]}>
                -{item.coinsSpent} OTC
              </Text>
            )}
          </View>
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
          },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={() => (
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>
            Order History
          </Text>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="clock" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No orders yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Your bookings will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 0 },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  orderCard: {
    padding: 16,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  orderIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: {
    flex: 1,
    gap: 4,
  },
  orderTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  orderSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  orderStatus: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  coinsText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
