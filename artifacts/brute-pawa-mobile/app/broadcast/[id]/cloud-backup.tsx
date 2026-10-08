import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type CloudProvider = { key: string; label: string; icon: string; color: string; bg: string; connected: boolean; };
const PROVIDERS: CloudProvider[] = [
  { key: "gdrive",  label: "Google Drive",  icon: "logo-google",   color: "#4285F4", bg: "#EFF6FF", connected: false },
  { key: "dropbox", label: "Dropbox",       icon: "cloud-outline", color: "#0061FF", bg: "#EFF6FF", connected: false },
  { key: "onedrive",label: "OneDrive",      icon: "logo-windows",  color: "#0078D4", bg: "#EFF6FF", connected: false },
];

export default function CloudBackupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [providers, setProviders] = useState(PROVIDERS);
  const [backing, setBacking] = useState(false);

  const toggleConnect = (key: string) => {
    setProviders(prev => prev.map(p =>
      p.key === key ? { ...p, connected: !p.connected } : p
    ));
  };

  const handleBackup = async () => {
    const connected = providers.filter(p => p.connected);
    if (connected.length === 0) {
      Alert.alert("Aucun service", "Connectez au moins un service cloud.");
      return;
    }
    setBacking(true);
    await new Promise(r => setTimeout(r, 2000));
    setBacking(false);
    Alert.alert("Sauvegarde terminée", `Données sauvegardées sur ${connected.map(p => p.label).join(", ")}.`);
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Sauvegarde Cloud" subtitle="Sauvegarder vos données" emoji="☁️" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.hero}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>☁️</Text>
          <Text style={s.heroTitle}>Sauvegarde automatique</Text>
          <Text style={s.heroSub}>Sauvegardez vos messages et médias en toute sécurité sur le cloud.</Text>
        </View>

        <Text style={s.sectionTitle}>SERVICES CONNECTÉS</Text>
        <View style={s.card}>
          {providers.map((p, idx) => (
            <React.Fragment key={p.key}>
              <View style={s.row}>
                <View style={[s.icon, { backgroundColor: p.connected ? p.bg : "#F1F5F9" }]}>
                  <Ionicons name={p.icon as any} size={22} color={p.connected ? p.color : "#9CA3AF"} />
                </View>
                <Text style={s.rowLabel}>{p.label}</Text>
                <TouchableOpacity
                  style={[s.connectBtn, p.connected && s.connectBtnActive]}
                  onPress={() => toggleConnect(p.key)}
                >
                  <Text style={[s.connectBtnText, p.connected && { color: "#22C55E" }]}>
                    {p.connected ? "Connecté ✓" : "Connecter"}
                  </Text>
                </TouchableOpacity>
              </View>
              {idx < providers.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={s.backupBtn} onPress={handleBackup} disabled={backing} activeOpacity={0.85}>
          {backing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={s.backupBtnText}>Sauvegarder maintenant</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  heroTitle: { fontSize: 18, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold", marginBottom: 6 },
  heroSub: { fontSize: 13, color: "#6B7280", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginLeft: 4 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  connectBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  connectBtnActive: { borderColor: "#22C55E", backgroundColor: "#F0FDF4" },
  connectBtnText: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 66 },
  backupBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15,
  },
  backupBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
