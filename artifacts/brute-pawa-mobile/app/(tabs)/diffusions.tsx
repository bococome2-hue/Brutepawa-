import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const C = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  primary: "#22C55E",
  text: "#111827",
  textSec: "#6B7280",
  border: "#E5E7EB",
  radius: 20,
};

interface BroadcastList {
  id: number;
  name: string;
  emoji: string;
  color: string;
  recipientCount: number;
  updatedAt: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Maintenant";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function BroadcastCard({ item }: { item: BroadcastList }) {
  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/broadcast/${item.id}` as any)}
    >
      <View style={[s.cardAvatar, { backgroundColor: item.color ?? C.primary }]}>
        <Text style={s.cardEmoji}>{item.emoji ?? "📢"}</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.cardRow}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.cardTime}>{timeAgo(item.updatedAt)}</Text>
        </View>
        <Text style={s.cardSub}>
          {item.recipientCount} destinataire{item.recipientCount !== 1 ? "s" : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function DiffusionsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<BroadcastList[]>({
    queryKey: ["broadcast-lists"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/broadcast`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const lists = data ?? [];

  const handleRefresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["broadcast-lists"] });
  }, [qc]);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad }]}>
        <Text style={s.headerTitle}>Diffusions</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} hitSlop={8}>
            <Ionicons name="search-outline" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: C.primary }]}
            hitSlop={8}
            onPress={() => router.push("/broadcast/new" as any)}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : lists.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="megaphone-outline" size={48} color={C.primary} />
          </View>
          <Text style={s.emptyTitle}>Aucune diffusion</Text>
          <Text style={s.emptyDesc}>
            Créez votre première liste de diffusion pour envoyer des messages à plusieurs personnes en même temps.
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push("/broadcast/new" as any)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={s.emptyBtnText}>Nouvelle diffusion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <BroadcastCard item={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={C.primary}
            />
          }
        />
      )}

      {/* FAB */}
      {lists.length > 0 && (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + 90 }]}
          onPress={() => router.push("/broadcast/new" as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Inter_700Bold",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmoji: { fontSize: 24 },
  cardBody: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold", flex: 1 },
  cardTime: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" },
  cardSub: { fontSize: 13, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold", marginBottom: 10 },
  emptyDesc: { fontSize: 14, color: "#6B7280", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
