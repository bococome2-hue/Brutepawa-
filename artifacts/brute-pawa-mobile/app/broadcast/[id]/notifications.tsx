import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const C = { bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", text: "#111827", textSec: "#6B7280", border: "#E5E7EB" };

interface NotifSettings {
  notificationsEnabled: boolean;
  soundType: string;
  vibrationType: string;
  priority: string;
  previewMode: string;
  silentMode: boolean;
}

const SOUND_LABELS: Record<string, string> = {
  brutepawa: "BrutePawa Notification", system: "Son système", custom: "Son personnalisé", none: "Aucun son",
};
const VIBRATION_LABELS: Record<string, string> = {
  none: "Désactivée", short: "Courte", normal: "Par défaut", long: "Longue", custom: "Personnalisée",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Faible priorité", normal: "Normale", high: "Haute priorité", urgent: "Urgente", silent: "Silencieuse",
};
const PREVIEW_LABELS: Record<string, string> = {
  hidden: "Masqué", name_only: "Nom uniquement", name_preview: "Toujours afficher", full: "Message complet", hidden_lock: "Masqué sur verrouillé",
};

export default function NotificationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [settings, setSettings] = useState<NotifSettings>({
    notificationsEnabled: true, soundType: "brutepawa", vibrationType: "normal",
    priority: "high", previewMode: "name_preview", silentMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/broadcast/${id}/notifications`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d) setSettings(s => ({ ...s, ...d }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const save = async (patch: Partial<NotifSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/broadcast/${id}/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(next),
      });
    } catch {} finally { setSaving(false); }
  };

  const rows = [
    { label: "Sonnerie", sub: SOUND_LABELS[settings.soundType] ?? settings.soundType, route: "ringtone", icon: "musical-note-outline" },
    { label: "Vibration", sub: VIBRATION_LABELS[settings.vibrationType] ?? settings.vibrationType, route: "vibration", icon: "phone-portrait-outline" },
    { label: "Priorité", sub: PRIORITY_LABELS[settings.priority] ?? settings.priority, route: "priority", icon: "flag-outline" },
    { label: "Aperçu des messages", sub: PREVIEW_LABELS[settings.previewMode] ?? settings.previewMode, route: "preview-mode", icon: "eye-outline" },
  ];

  const importRows = [
    { icon: "people-outline", label: "Contacts BrutePawa", sub: "Ajouter depuis vos contacts" },
    { icon: "call-outline", label: "Importer depuis votre téléphone", sub: "Importer depuis votre répertoire", route: "import-phone" },
    { icon: "document-outline", label: "Importer depuis un fichier", sub: "Fichier CSV, Excel ou TXT", route: "import-file" },
  ];

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Toggle principal */}
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="notifications-outline" size={22} color={C.primary} />
                <Text style={s.toggleLabel}>Notifications activées</Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={v => save({ notificationsEnabled: v })}
                trackColor={{ false: "#E5E7EB", true: "#22C55E" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Rows */}
          {settings.notificationsEnabled && (
            <View style={s.card}>
              {rows.map((row, idx) => (
                <React.Fragment key={row.label}>
                  <TouchableOpacity
                    style={s.row}
                    onPress={() => router.push(`/broadcast/${id}/${row.route}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={s.rowIcon}>
                      <Ionicons name={row.icon as any} size={20} color={C.primary} />
                    </View>
                    <View style={s.rowBody}>
                      <Text style={s.rowLabel}>{row.label}</Text>
                      <Text style={s.rowSub}>{row.sub} {">"}</Text>
                    </View>
                  </TouchableOpacity>
                  {idx < rows.length - 1 && <View style={s.sep} />}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Mode silencieux */}
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="volume-mute-outline" size={22} color={C.primary} />
                <View>
                  <Text style={s.toggleLabel}>Mode silencieux</Text>
                  <Text style={s.rowSub}>Désactiver les notifications pendant{"\n"}une période définie</Text>
                </View>
              </View>
              <Switch
                value={settings.silentMode}
                onValueChange={v => save({ silentMode: v })}
                trackColor={{ false: "#E5E7EB", true: "#22C55E" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Aperçu — Import */}
          <Text style={s.sectionLabel}>APERÇU</Text>
          <View style={s.card}>
            {importRows.map((row, idx) => (
              <React.Fragment key={row.label}>
                <TouchableOpacity
                  style={s.row}
                  onPress={row.route ? () => router.push(`/broadcast/${id}/${row.route}` as any) : undefined}
                  activeOpacity={row.route ? 0.7 : 1}
                >
                  <View style={s.rowIcon}>
                    <Ionicons name={row.icon as any} size={20} color={C.primary} />
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowLabel}>{row.label}</Text>
                    <Text style={s.rowSub}>{row.sub}</Text>
                  </View>
                  {row.route && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />}
                </TouchableOpacity>
                {idx < importRows.length - 1 && <View style={s.sep} />}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginLeft: 4 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, gap: 12 },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 64 },
});
