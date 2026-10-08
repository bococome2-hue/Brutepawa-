import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

export default function SyncContactsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [autoSync, setAutoSync] = useState(false);
  const [syncContacts, setSyncContacts] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync] = useState("Jamais");

  const handleSync = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setSyncing(false);
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Synchronisation contacts" subtitle="Gérer vos contacts" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={s.statusCard}>
          <View style={s.statusIcon}>
            <Ionicons name={syncing ? "sync" : "checkmark-circle"} size={32} color={syncing ? "#F97316" : "#22C55E"} />
          </View>
          <Text style={s.statusTitle}>{syncing ? "Synchronisation..." : "Contacts synchronisés"}</Text>
          <Text style={s.statusSub}>Dernière sync : {lastSync}</Text>
        </View>

        {/* Options */}
        <View style={s.card}>
          {[
            { label: "Synchronisation auto", sub: "Synchroniser lors de l'ouverture de l'app", value: autoSync, onChange: setAutoSync },
            { label: "Inclure les contacts téléphone", sub: "Accès à votre répertoire requis", value: syncContacts, onChange: setSyncContacts },
          ].map((row, idx) => (
            <React.Fragment key={row.label}>
              <View style={s.row}>
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>{row.label}</Text>
                  <Text style={s.rowSub}>{row.sub}</Text>
                </View>
                <Switch
                  value={row.value}
                  onValueChange={row.onChange}
                  trackColor={{ false: "#E5E7EB", true: "#22C55E" }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {idx === 0 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={s.syncBtn} onPress={handleSync} disabled={syncing} activeOpacity={0.85}>
          {syncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sync-outline" size={20} color="#FFFFFF" />
              <Text style={s.syncBtnText}>Synchroniser maintenant</Text>
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
  statusCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statusIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statusTitle: { fontSize: 17, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold", marginBottom: 4 },
  statusSub: { fontSize: 13, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  sep: { height: 1, backgroundColor: "#F1F5F9" },
  syncBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15,
  },
  syncBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
