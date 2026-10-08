import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

const C = { bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", text: "#111827", textSec: "#6B7280", border: "#E5E7EB" };

type FilterChip = "Photos" | "Vidéos" | "Fichiers" | "Liens";

export default function FiltersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Set<FilterChip>>(new Set());

  const toggleChip = (c: FilterChip) => {
    setActive(prev => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const chips: FilterChip[] = ["Photos", "Vidéos", "Fichiers", "Liens"];

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un mot, un contact..."
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ marginRight: 12 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres section */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Filtres</Text>
          {/* Row 1 */}
          <View style={s.chipRow}>
            {(["Photos", "Vidéos", "Fichiers"] as FilterChip[]).map(c => (
              <TouchableOpacity
                key={c}
                style={[s.chip, active.has(c) && s.chipActive]}
                onPress={() => toggleChip(c)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={c === "Photos" ? "image-outline" : c === "Vidéos" ? "videocam-outline" : "document-outline"}
                  size={15}
                  color={active.has(c) ? "#FFFFFF" : C.text}
                />
                <Text style={[s.chipText, active.has(c) && { color: "#FFFFFF" }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Row 2 */}
          <View style={s.chipRow}>
            {(["Liens"] as FilterChip[]).map(c => (
              <TouchableOpacity
                key={c}
                style={[s.chip, active.has(c) && s.chipActive]}
                onPress={() => toggleChip(c)}
                activeOpacity={0.75}
              >
                <Ionicons name="link-outline" size={15} color={active.has(c) ? "#FFFFFF" : C.text} />
                <Text style={[s.chipText, active.has(c) && { color: "#FFFFFF" }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recherche par date */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.menuRow}
            onPress={() => router.push(`/broadcast/${id}/date-search` as any)}
            activeOpacity={0.7}
          >
            <View style={s.menuIcon}>
              <Ionicons name="calendar-outline" size={20} color={C.primary} />
            </View>
            <View style={s.menuBody}>
              <Text style={s.menuLabel}>Recherche par date</Text>
              <Text style={s.menuSub}>Sélectionner une période</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Recherche par auteur */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.menuRow}
            onPress={() => router.push(`/broadcast/${id}/author-search` as any)}
            activeOpacity={0.7}
          >
            <View style={s.menuIcon}>
              <Ionicons name="person-outline" size={20} color={C.primary} />
            </View>
            <View style={s.menuBody}>
              <Text style={s.menuLabel}>Recherche par auteur</Text>
              <Text style={s.menuSub}>Tous les auteurs</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Apply */}
        <TouchableOpacity style={s.applyBtn} activeOpacity={0.85}>
          <Text style={s.applyBtnText}>Appliquer les filtres</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", fontFamily: "Inter_400Regular", paddingHorizontal: 10 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold" },
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  chipText: { fontSize: 14, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  menuSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  applyBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  applyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
