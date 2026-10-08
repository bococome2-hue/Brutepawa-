import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type FilterItem = {
  key: string;
  label: string;
  icon: string;
  checked?: boolean;
};

const FILTERS: FilterItem[] = [
  { key: "all", label: "Tous les auteurs", icon: "people-outline", checked: true },
  { key: "admin", label: "Administrateurs", icon: "shield-outline" },
  { key: "moderator", label: "Modérateurs", icon: "star-outline" },
  { key: "verified", label: "Contacts vérifiés", icon: "checkmark-circle-outline" },
  { key: "subscribers", label: "Abonnés", icon: "person-add-outline" },
  { key: "creators", label: "Créateurs", icon: "brush-outline" },
  { key: "businesses", label: "Entreprises", icon: "business-outline" },
];

export default function ImportPhoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["all"]));

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (key === "all") {
        next.clear();
        next.add("all");
      } else {
        next.delete("all");
        next.has(key) ? next.delete(key) : next.add(key);
      }
      return next;
    });
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Importer depuis téléphone" subtitle="Sélectionner des contacts" />

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un contact..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <FlatList
        data={FILTERS.filter(f =>
          search.trim() === "" ||
          f.label.toLowerCase().includes(search.toLowerCase())
        )}
        keyExtractor={item => item.key}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            onPress={() => toggle(item.key)}
            activeOpacity={0.7}
          >
            <View style={s.rowIcon}>
              <Ionicons name={item.icon as any} size={20} color="#22C55E" />
            </View>
            <Text style={s.rowLabel}>{item.label}</Text>
            {selected.has(item.key) && (
              <View style={s.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            <View style={s.divider}>
              <Text style={s.dividerText}>Rechercher un utilisateur</Text>
            </View>
            <View style={s.searchUser}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={s.searchUserInput}
                placeholder="Nom, pseudo..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        }
      />

      <View style={s.footer}>
        <TouchableOpacity style={s.applyBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.applyBtnText}>Importer ({selected.size} filtre{selected.size > 1 ? "s" : ""})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", margin: 16,
    backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", fontFamily: "Inter_400Regular", paddingHorizontal: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FFFFFF", borderRadius: 0, paddingVertical: 14, paddingHorizontal: 16,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "#22C55E",
    alignItems: "center", justifyContent: "center",
  },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 68 },
  divider: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#F1F5F9" },
  dividerText: { fontSize: 12, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  searchUser: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", padding: 14, margin: 0, borderRadius: 0,
  },
  searchUserInput: { flex: 1, fontSize: 15, color: "#111827", fontFamily: "Inter_400Regular" },
  footer: { padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  applyBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  applyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
