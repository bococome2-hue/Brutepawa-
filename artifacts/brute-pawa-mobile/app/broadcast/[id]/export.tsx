import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

type ExportType = "pdf" | "excel" | "csv" | "zip" | "cloud";

interface ExportOption {
  key: ExportType; label: string; sub: string; icon: string; color: string; bg: string;
}

const OPTIONS: ExportOption[] = [
  { key: "pdf", label: "Exporter PDF", sub: "Document complet", icon: "document-text-outline", color: "#EF4444", bg: "#FEF2F2" },
  { key: "excel", label: "Exporter Excel", sub: "Données détaillées", icon: "grid-outline", color: "#22C55E", bg: "#F0FDF4" },
  { key: "csv", label: "Exporter CSV", sub: "Données brutes", icon: "list-outline", color: "#3B82F6", bg: "#EFF6FF" },
  { key: "zip", label: "Exporter ZIP", sub: "Messages + Médias", icon: "archive-outline", color: "#F97316", bg: "#FFF7ED" },
  { key: "cloud", label: "Sauvegarde cloud", sub: "Google Drive, Dropbox…", icon: "cloud-upload-outline", color: "#8B5CF6", bg: "#F5F3FF" },
];

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState<ExportType | null>(null);

  const handleExport = async (type: ExportType) => {
    if (type === "cloud") {
      Alert.alert("Sauvegarde Cloud", "Connectez votre compte Google Drive ou Dropbox dans les paramètres.");
      return;
    }
    setLoading(type);
    try {
      const res = await fetch(`${API_BASE_URL}/api/broadcast/${id}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      Alert.alert("Export lancé", `Votre export ${type.toUpperCase()} est en cours de traitement. Vous serez notifié quand il sera prêt.`);
    } catch {
      Alert.alert("Erreur", "Impossible de lancer l'export.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="Exporter" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>FORMATS D'EXPORT</Text>
        <View style={s.card}>
          {OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.key}>
              <TouchableOpacity
                style={s.row}
                onPress={() => handleExport(opt.key)}
                activeOpacity={0.7}
                disabled={loading === opt.key}
              >
                <View style={[s.iconWrap, { backgroundColor: opt.bg }]}>
                  <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>{opt.label}</Text>
                  <Text style={s.rowSub}>{opt.sub}</Text>
                </View>
                {loading === opt.key ? (
                  <ActivityIndicator size={18} color="#22C55E" />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                )}
              </TouchableOpacity>
              {idx < OPTIONS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={s.sectionTitle}>HISTORIQUE</Text>
        <TouchableOpacity
          style={[s.card, s.historyBtn]}
          onPress={() => router.push(`/broadcast/${id}/export-history` as any)}
          activeOpacity={0.7}
        >
          <View style={[s.iconWrap, { backgroundColor: "#F1F5F9" }]}>
            <Ionicons name="folder-open-outline" size={22} color="#6B7280" />
          </View>
          <Text style={[s.rowLabel, { flex: 1 }]}>Voir l'historique des exports</Text>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginLeft: 4 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 3 },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 72 },
  historyBtn: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
});
