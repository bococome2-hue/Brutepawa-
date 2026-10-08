import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

interface ExportRecord { id: number; exportType: string; status: string; fileUrl?: string; createdAt: string; }

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  pdf:   { icon: "document-text-outline", color: "#EF4444", bg: "#FEF2F2" },
  excel: { icon: "grid-outline",          color: "#22C55E", bg: "#F0FDF4" },
  csv:   { icon: "list-outline",          color: "#3B82F6", bg: "#EFF6FF" },
  zip:   { icon: "archive-outline",       color: "#F97316", bg: "#FFF7ED" },
};

const MOCK: ExportRecord[] = [
  { id: 1, exportType: "pdf",   status: "done",    fileUrl: "#", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, exportType: "excel", status: "done",    fileUrl: "#", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, exportType: "csv",   status: "pending", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 4, exportType: "zip",   status: "done",    fileUrl: "#", createdAt: new Date(Date.now() - 604800000).toISOString() },
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

export default function ExportHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/broadcast/${id}/exports`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => setExports(Array.isArray(d) && d.length > 0 ? d : MOCK))
      .catch(() => setExports(MOCK))
      .finally(() => setLoading(false));
  }, [id, token]);

  return (
    <View style={s.root}>
      <BroadcastHeader title="Historique exports" subtitle="Vos fichiers exportés" />
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color="#22C55E" /></View>
      ) : (
        <FlatList
          data={exports}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = TYPE_META[item.exportType] ?? { icon: "document-outline", color: "#6B7280", bg: "#F1F5F9" };
            return (
              <View style={s.card}>
                <View style={[s.icon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                </View>
                <View style={s.body}>
                  <Text style={s.label}>{item.exportType.toUpperCase()} — Export</Text>
                  <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
                  <View style={[s.statusBadge, item.status === "done" ? s.statusDone : s.statusPending]}>
                    <Text style={[s.statusText, { color: item.status === "done" ? "#22C55E" : "#F97316" }]}>
                      {item.status === "done" ? "Terminé" : "En cours"}
                    </Text>
                  </View>
                </View>
                {item.status === "done" && item.fileUrl && (
                  <TouchableOpacity
                    style={s.downloadBtn}
                    onPress={() => Alert.alert("Téléchargement", "Le fichier va être téléchargé.")}
                  >
                    <Ionicons name="download-outline" size={20} color="#22C55E" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="folder-open-outline" size={40} color="#D1D5DB" />
              <Text style={s.emptyText}>Aucun export</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  label: { fontSize: 14, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  time: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { marginTop: 6, alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusDone: { backgroundColor: "#F0FDF4" },
  statusPending: { backgroundColor: "#FFF7ED" },
  statusText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  downloadBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
});
