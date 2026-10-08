import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const C = { bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", text: "#111827", textSec: "#6B7280", border: "#E5E7EB" };

interface Member { id: number; firstName: string; lastName: string; avatarUrl?: string; country?: string; }
interface Suggestion extends Member { mutualFriends?: number; }

function Avatar({ name, size = 46, color = "#22C55E" }: { name: string; size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Set<number>>(new Set());

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/broadcast/${id}/members`, { headers }).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/people/suggestions`, { headers }).then(r => r.json()),
    ])
      .then(([m, s]) => {
        setMembers(Array.isArray(m.members) ? m.members : []);
        setSuggestions(Array.isArray(s.suggestions) ? s.suggestions.slice(0, 8) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async (userId: number) => {
    setAdding(prev => new Set(prev).add(userId));
    try {
      await fetch(`${API_BASE_URL}/api/broadcast/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ userId }),
      });
      const user = suggestions.find(s => s.id === userId);
      if (user) setMembers(prev => [...prev, user]);
    } catch {}
    setAdding(prev => { const n = new Set(prev); n.delete(userId); return n; });
  };

  const handleRemove = async (userId: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/broadcast/${id}/members/${userId}`, {
        method: "DELETE", headers,
      });
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch {}
  };

  const memberIds = new Set(members.map(m => m.id));

  const filtered = suggestions.filter(s =>
    !memberIds.has(s.id) &&
    (search.trim() === "" ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un contact"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={s.sectionTitle}>Suggestions intelligentes</Text>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <Avatar name={`${item.firstName} ${item.lastName}`} size={46} />
              <View style={s.cardBody}>
                <Text style={s.cardName}>{item.firstName} {item.lastName}</Text>
                {item.country && <Text style={s.cardSub}>{item.country}</Text>}
                {item.mutualFriends ? (
                  <Text style={s.cardSub}>{item.mutualFriends} ami{item.mutualFriends > 1 ? "s" : ""} en commun</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[s.addBtn, memberIds.has(item.id) && s.addBtnDone]}
                onPress={() => memberIds.has(item.id) ? handleRemove(item.id) : handleAdd(item.id)}
                disabled={adding.has(item.id)}
                activeOpacity={0.75}
              >
                {adding.has(item.id) ? (
                  <ActivityIndicator size={16} color="#FFFFFF" />
                ) : (
                  <Ionicons name={memberIds.has(item.id) ? "checkmark" : "add"} size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>Aucun résultat</Text>
            </View>
          }
          ListFooterComponent={
            members.length > 0 ? (
              <View style={{ marginTop: 20 }}>
                <Text style={s.sectionTitle}>Membres actuels ({members.length})</Text>
                {members.map(m => (
                  <View key={m.id} style={[s.card, { marginBottom: 8 }]}>
                    <Avatar name={`${m.firstName} ${m.lastName}`} size={46} color="#6B7280" />
                    <View style={s.cardBody}>
                      <Text style={s.cardName}>{m.firstName} {m.lastName}</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.addBtn, { backgroundColor: "#EF4444" }]}
                      onPress={() => handleRemove(m.id)}
                    >
                      <Ionicons name="remove" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}
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
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center",
  },
  addBtnDone: { backgroundColor: "#16A34A" },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
});
