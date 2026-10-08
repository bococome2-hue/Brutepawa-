import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

interface AdvancedSettings {
  autoReply: boolean;
  scheduleMessages: boolean;
  autoArchive: boolean;
  autoDelete: boolean;
  enterpriseMode: boolean;
  creatorMode: boolean;
}

type SettingItem = {
  key: keyof AdvancedSettings;
  label: string;
  sub: string;
  icon: string;
  toggle: boolean;
  premium?: boolean;
};

const SETTINGS: SettingItem[] = [
  { key: "autoReply", label: "Réponses automatiques", sub: "Messages auto-répondeur", icon: "chatbubble-ellipses-outline", toggle: true },
  { key: "scheduleMessages", label: "Programmation messages", sub: "Envoyer plus tard", icon: "time-outline", toggle: false },
  { key: "autoArchive", label: "Archivage automatique", sub: "Archiver les anciennes discussions", icon: "archive-outline", toggle: false },
  { key: "autoDelete", label: "Suppression automatique", sub: "Supprimer les anciens messages", icon: "trash-outline", toggle: false },
  { key: "enterpriseMode", label: "Mode entreprise", sub: "Fonctionnalités avancées", icon: "business-outline", toggle: true, premium: true },
  { key: "creatorMode", label: "Mode créateur", sub: "Outils pour créateurs", icon: "brush-outline", toggle: false, premium: true },
];

export default function AdvancedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [settings, setSettings] = useState<AdvancedSettings>({
    autoReply: true, scheduleMessages: false, autoArchive: false,
    autoDelete: false, enterpriseMode: true, creatorMode: false,
  });
  const [loading, setLoading] = useState(false);

  const toggle = async (key: keyof AdvancedSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await fetch(`${API_BASE_URL}/api/broadcast/${id}/advanced`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(next),
      });
    } catch {}
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="Paramètres avancés" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {SETTINGS.map((item, idx) => (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                style={s.row}
                onPress={() => item.toggle ? toggle(item.key) : Alert.alert(item.label, "Fonctionnalité à venir.")}
                activeOpacity={0.7}
              >
                <View style={[s.rowIcon, item.premium && { backgroundColor: "#FEF9C3" }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.premium ? "#F59E0B" : "#22C55E"} />
                </View>
                <View style={s.rowBody}>
                  <View style={s.rowTitleRow}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    {item.premium && (
                      <View style={s.premiumBadge}>
                        <Text style={s.premiumText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                {item.toggle ? (
                  <Switch
                    value={settings[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: "#E5E7EB", true: "#22C55E" }}
                    thumbColor="#FFFFFF"
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                )}
              </TouchableOpacity>
              {idx < SETTINGS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  premiumBadge: { backgroundColor: "#FEF9C3", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  premiumText: { fontSize: 10, fontWeight: "700", color: "#F59E0B", fontFamily: "Inter_700Bold" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 66 },
});
