import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

interface SearchResult {
  id: number;
  content: string;
  fromMe: boolean;
  createdAt: string;
  type: string;
}

const FILTER_TABS = [
  { key: "messages",  label: "Messages" },
  { key: "medias",    label: "Médias"   },
  { key: "links",     label: "Liens"    },
  { key: "files",     label: "Fichiers" },
];

function timeLabel(date: string): string {
  const d    = new Date(date);
  const now  = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function ConversationSearchScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const [query, setQuery]     = useState("");
  const [filter, setFilter]   = useState("messages");
  const [debouncedQ, setDQ]   = useState("");

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInput = useCallback((v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDQ(v), 300);
  }, []);

  const searchQuery = useQuery<SearchResult[]>({
    queryKey: ["conv-search", userId, debouncedQ, filter],
    queryFn: async () => {
      const url = `${API_BASE_URL}/contacts/${userId}/conversation/search?q=${encodeURIComponent(debouncedQ)}&type=${filter}`;
      const r   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Erreur");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  const results = searchQuery.data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Rechercher dans la conversation</Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Rechercher..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleInput}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(""); setDQ(""); }}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={[styles.tabsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[styles.tabText, { color: filter === t.key ? colors.primary : colors.mutedForeground }]}>
              {t.label}
            </Text>
            {filter === t.key && results.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.tabBadgeText}>{results.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {searchQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={results.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Résultats récents</Text>
              <TouchableOpacity><Text style={[styles.seeAll, { color: colors.primary }]}>Tout voir</Text></TouchableOpacity>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {debouncedQ ? "Aucun résultat" : "Commencez à taper pour rechercher"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.resultRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]} activeOpacity={0.7}>
              <View style={[styles.resultAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name={item.fromMe ? "person-outline" : "person-circle-outline"} size={18} color="#fff" />
              </View>
              <View style={styles.resultContent}>
                <Text style={[styles.resultSender, { color: colors.foreground }]}>{item.fromMe ? "Vous" : "Contact"}</Text>
                <Text style={[styles.resultMsg, { color: colors.mutedForeground }]} numberOfLines={1}>{item.content}</Text>
              </View>
              <Text style={[styles.resultTime, { color: colors.mutedForeground }]}>{timeLabel(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  tabsBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, flexDirection: "row", gap: 4,
  },
  tabText:      { fontSize: 13, fontFamily: "Inter_500Medium" },
  tabBadge:     { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 14,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  seeAll:       { fontSize: 13, fontFamily: "Inter_500Medium" },
  resultRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  resultAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  resultContent: { flex: 1 },
  resultSender:  { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  resultMsg:     { fontSize: 13, fontFamily: "Inter_400Regular" },
  resultTime:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
