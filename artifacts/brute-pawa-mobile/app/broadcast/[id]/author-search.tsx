import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type AuthorFilter = { key: string; label: string; icon: string; };
const FILTERS: AuthorFilter[] = [
  { key: "all",       label: "Tous les auteurs",    icon: "people-outline" },
  { key: "admin",     label: "Administrateurs",     icon: "shield-outline" },
  { key: "moderator", label: "Modérateurs",         icon: "star-outline" },
  { key: "verified",  label: "Contacts vérifiés",   icon: "checkmark-circle-outline" },
  { key: "subscriber",label: "Abonnés",             icon: "person-add-outline" },
  { key: "creator",   label: "Créateurs",           icon: "brush-outline" },
  { key: "business",  label: "Entreprises",         icon: "business-outline" },
];

export default function AuthorSearchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const filtered = FILTERS.filter(f =>
    search.trim() === "" || f.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={s.root}>
      <BroadcastHeader title="Recherche par auteur" subtitle="Filtrer les messages" />

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
        data={filtered}
        keyExtractor={item => item.key}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            onPress={() => setSelected(item.key)}
            activeOpacity={0.7}
          >
            <View style={[s.icon, selected === item.key && { backgroundColor: "#DCFCE7" }]}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={selected === item.key ? "#22C55E" : "#6B7280"}
              />
            </View>
            <Text style={[s.rowLabel, selected === item.key && { color: "#22C55E", fontWeight: "700" }]}>
              {item.label}
            </Text>
            {selected === item.key && (
              <View style={s.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <View style={s.divider}>
              <Text style={s.dividerText}>Rechercher un utilisateur</Text>
            </View>
            <View style={s.userSearchWrap}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={s.userSearchInput}
                value={userSearch}
                onChangeText={setUserSearch}
                placeholder="Nom ou pseudo..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        }
      />

      <View style={s.footer}>
        <TouchableOpacity style={s.applyBtn} activeOpacity={0.85}>
          <Text style={s.applyBtnText}>Appliquer</Text>
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
  list: { paddingHorizontal: 0, paddingBottom: 100 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FFFFFF", paddingVertical: 14, paddingHorizontal: 16,
  },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "#22C55E",
    alignItems: "center", justifyContent: "center",
  },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 68 },
  divider: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#F1F5F9" },
  dividerText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  userSearchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", padding: 14, paddingHorizontal: 16,
  },
  userSearchInput: { flex: 1, fontSize: 15, color: "#111827", fontFamily: "Inter_400Regular" },
  footer: { padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  applyBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  applyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
