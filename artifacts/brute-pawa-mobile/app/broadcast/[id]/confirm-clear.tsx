import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

export default function ConfirmClearScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleClear = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/broadcast/${id}/clear`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible d'effacer la conversation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />

      <View style={s.center}>
        {/* Icon */}
        <View style={s.iconWrap}>
          <Ionicons name="trash-outline" size={40} color="#EF4444" />
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Effacer tous les{"\n"}messages ?</Text>
          <Text style={s.desc}>
            Cette action supprimera tous les messages de cette conversation.
            Cette action ne supprimera pas la liste de diffusion.
          </Text>

          <TouchableOpacity
            style={s.dangerBtn}
            onPress={handleClear}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.dangerBtnText}>Effacer la conversation</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={s.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#FEE2E2",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  card: {
    width: "100%", backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 6,
  },
  title: {
    fontSize: 22, fontWeight: "700", color: "#111827",
    fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 30, marginBottom: 14,
  },
  desc: {
    fontSize: 14, color: "#6B7280", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 22, marginBottom: 28,
  },
  dangerBtn: {
    width: "100%", backgroundColor: "#EF4444", borderRadius: 20,
    paddingVertical: 16, alignItems: "center", marginBottom: 12,
  },
  dangerBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  cancelBtn: {
    width: "100%", borderRadius: 20, paddingVertical: 14,
    alignItems: "center", borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold" },
});
