import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type PaymentMethod = "cash" | "wallet";

interface PaymentSelectorProps {
  selected: PaymentMethod;
  walletBalance: number | null;
  insufficientBalance: boolean;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentSelector({
  selected,
  walletBalance,
  insufficientBalance,
  onSelect,
}: PaymentSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>PAYMENT METHOD</Text>

      <View style={styles.row}>
        {/* Cash Option */}
        <TouchableOpacity
          style={[styles.option, selected === "cash" && styles.optionActive]}
          onPress={() => onSelect("cash")}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.iconWrap,
              selected === "cash" && styles.iconWrapActive,
            ]}
          >
            <Feather
              name="dollar-sign"
              size={17}
              color={selected === "cash" ? "#000" : "#FFD700"}
            />
          </View>
          <View style={styles.optionBody}>
            <Text
              style={[
                styles.optionTitle,
                selected === "cash" && styles.optionTitleActive,
              ]}
            >
              Cash
            </Text>
            <Text style={styles.optionSub}>Pay on arrival</Text>
          </View>
          {selected === "cash" && (
            <View style={styles.checkCircle}>
              <Feather name="check" size={11} color="#000" />
            </View>
          )}
        </TouchableOpacity>

        {/* Wallet Option */}
        <TouchableOpacity
          style={[
            styles.option,
            selected === "wallet" && styles.optionActive,
            insufficientBalance && selected === "wallet" && styles.optionError,
          ]}
          onPress={() => onSelect("wallet")}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.iconWrap,
              selected === "wallet" && styles.iconWrapActive,
              insufficientBalance && selected === "wallet" && styles.iconWrapError,
            ]}
          >
            <Feather
              name="credit-card"
              size={17}
              color={
                insufficientBalance && selected === "wallet"
                  ? "#F87171"
                  : selected === "wallet"
                  ? "#000"
                  : "#FFD700"
              }
            />
          </View>
          <View style={styles.optionBody}>
            <Text
              style={[
                styles.optionTitle,
                selected === "wallet" && styles.optionTitleActive,
              ]}
            >
              OTC Wallet
            </Text>
            {walletBalance !== null ? (
              <Text
                style={[
                  styles.balanceText,
                  insufficientBalance && selected === "wallet" && styles.balanceLow,
                ]}
              >
                PKR {walletBalance.toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.optionSub}>Instant deduction</Text>
            )}
          </View>
          {selected === "wallet" && !insufficientBalance && (
            <View style={styles.checkCircle}>
              <Feather name="check" size={11} color="#000" />
            </View>
          )}
          {selected === "wallet" && insufficientBalance && (
            <View style={styles.warnCircle}>
              <Feather name="alert-circle" size={14} color="#F87171" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Insufficient balance banner */}
      {insufficientBalance && selected === "wallet" && (
        <View style={styles.alertBanner}>
          <Feather name="alert-triangle" size={13} color="#F87171" />
          <Text style={styles.alertText}>
            Insufficient balance. Please top up or choose Cash.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },

  label: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#555",
    letterSpacing: 1,
  },

  row: { flexDirection: "row", gap: 10 },

  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.12)",
    padding: 12,
  },
  optionActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  optionError: {
    borderColor: "rgba(248,113,113,0.4)",
    backgroundColor: "rgba(248,113,113,0.06)",
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,215,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  iconWrapError: {
    backgroundColor: "rgba(248,113,113,0.12)",
  },

  optionBody: { flex: 1, gap: 2 },
  optionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  optionTitleActive: { color: "#000" },
  optionSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#555",
  },
  balanceText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  balanceLow: { color: "#F87171" },

  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  warnCircle: {
    alignItems: "center",
    justifyContent: "center",
  },

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  alertText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#F87171",
    flex: 1,
  },
});
