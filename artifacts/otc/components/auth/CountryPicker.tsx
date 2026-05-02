import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
];

interface CountryPickerProps {
  selected: Country;
  onSelect: (country: Country) => void;
  visible: boolean;
  onClose: () => void;
}

export function CountryPicker({
  selected,
  onSelect,
  visible,
  onClose,
}: CountryPickerProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search)
      )
    : COUNTRIES;

  function handleSelect(country: Country) {
    onSelect(country);
    setSearch("");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select Country</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={16} color="rgba(255,215,0,0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.code === selected.code;
            return (
              <TouchableOpacity
                style={[
                  styles.countryRow,
                  isSelected && styles.countryRowActive,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text
                  style={[
                    styles.countryName,
                    isSelected && styles.countryNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.countryDial,
                    isSelected && styles.countryDialActive,
                  ]}
                >
                  {item.dialCode}
                </Text>
                {isSelected && (
                  <Feather name="check" size={16} color="#FFD700" />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No results for "{search}"</Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "72%",
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,215,0,0.12)",
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,215,0,0.08)",
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  closeBtn: { padding: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  list: { flex: 1 },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  countryRowActive: {
    backgroundColor: "rgba(255,215,0,0.04)",
  },
  countryFlag: { fontSize: 22, width: 30 },
  countryName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  countryNameActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
  },
  countryDial: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.35)",
    minWidth: 40,
    textAlign: "right",
  },
  countryDialActive: { color: "#FFD700" },
  emptyText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    padding: 32,
  },
});
