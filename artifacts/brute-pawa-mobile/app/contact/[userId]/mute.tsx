import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const DURATIONS = [
  { key: "8h",     label: "8 heures"  },
  { key: "1w",     label: "1 semaine" },
  { key: "1m",     label: "1 an"      },
  { key: "always", label: "Toujours"  },
];

export default function MuteConversationScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const qc         = useQueryClient();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const [selected, setSelected] = useState("always");

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/mute`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ duration: selected }),
      });
      if (!r.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", userId] });
      router.back();
    },
    onError: () => Alert.alert("Erreur", "Impossible de mettre en sourdine"),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mettre en sourdine</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name="notifications-off-outline" size={44} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Vous ne recevrez plus de notifications de ce contact
        </Text>

        <View style={[styles.optionsCard, { backgroundColor: colors.card }]}>
          {DURATIONS.map((d, i) => (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.optionRow,
                { borderBottomColor: colors.divider },
                i < DURATIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
              onPress={() => setSelected(d.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>{d.label}</Text>
              <View style={[styles.radio, { borderColor: selected === d.key ? colors.primary : colors.border }]}>
                {selected === d.key && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.okBtn, { backgroundColor: colors.primary }, mutation.isPending && { opacity: 0.7 }]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.okBtnText}>OK</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  content: { flex: 1, alignItems: "center", paddingHorizontal: 20, paddingTop: 32 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title:       { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc:        { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  optionsCard: {
    width: "100%", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 16,
  },
  optionLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  okBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  okBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
