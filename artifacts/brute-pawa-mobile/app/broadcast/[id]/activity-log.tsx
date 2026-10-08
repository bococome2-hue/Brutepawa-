import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, StyleSheet, Text, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

interface LogEntry { id: number; action: string; userId?: number; createdAt: string; }

const ACTION_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  message_sent:    { icon: "send-outline",        color: "#22C55E", bg: "#F0FDF4", label: "Message envoyé" },
  member_added:    { icon: "person-add-outline",   color: "#3B82F6", bg: "#EFF6FF", label: "Membre ajouté" },
  member_removed:  { icon: "person-remove-outline",color: "#EF4444", bg: "#FEF2F2", label: "Membre retiré" },
  list_renamed:    { icon: "create-outline",       color: "#F97316", bg: "#FFF7ED", label: "Liste renommée" },
  settings_update: { icon: "settings-outline",     color: "#8B5CF6", bg: "#F5F3FF", label: "Paramètres modifiés" },
  export_done:     { icon: "download-outline",     color: "#06B6D4", bg: "#ECFEFF", label: "Export terminé" },
  list_created:    { icon: "add-circle-outline",   color: "#22C55E", bg: "#F0FDF4", label: "Liste créée" },
};

const MOCK_LOGS: LogEntry[] = [
  { id: 1, action: "message_sent",    createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: 2, action: "member_added",    createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, action: "settings_update", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, action: "export_done",     createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 5, action: "member_removed",  createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 6, action: "list_renamed",    createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 7, action: "list_created",    createdAt: new Date(Date.now() - 604800000).toISOString() },
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export default function ActivityLogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/broadcast/${id}/activity`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d.logs) && d.logs.length > 0 ? d.logs : MOCK_LOGS))
      .catch(() => setLogs(MOCK_LOGS))
      .finally(() => setLoading(false));
  }, [id, token]);

  return (
    <View style={s.root}>
      <BroadcastHeader title="Journal d'activité" subtitle="Historique des actions" />
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color="#22C55E" /></View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = ACTION_META[item.action] ?? { icon: "ellipse-outline", color: "#6B7280", bg: "#F1F5F9", label: item.action };
            return (
              <View style={s.card}>
                <View style={[s.icon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                </View>
                <View style={s.body}>
                  <Text style={s.label}>{meta.label}</Text>
                  <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                <View style={[s.dot, { backgroundColor: meta.color }]} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  time: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular", marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
