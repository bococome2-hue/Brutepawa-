import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const REASONS = [
  { key: "spam",         label: "Spam"              },
  { key: "inappropriate",label: "Contenu inapproprié"},
  { key: "harassment",   label: "Harcèlement"        },
  { key: "impersonation",label: "Usurpation d'identité"},
  { key: "nudity",       label: "Nudité"             },
  { key: "violence",     label: "Violence"           },
  { key: "other",        label: "Autre"              },
];

export default function ReportUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const [reason, setReason]         = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error("Veuillez sélectionner un motif");
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/report`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ reason, description: description.trim() || undefined }),
      });
      if (!r.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      Alert.alert("Signalement envoyé", "Merci pour votre signalement. Notre équipe le traitera dans les plus brefs délais.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => Alert.alert("Erreur", e.message ?? "Impossible d'envoyer le signalement"),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Signaler l'utilisateur</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.heroSection}>
          <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="warning-outline" size={44} color="#F59E0B" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Signaler l'utilisateur</Text>
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>
            Aidez-nous à maintenir BrutePawa en sécurité en signalant ce contact s'il enfreint les règles
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Motif du signalement</Text>
        <View style={[styles.reasonsCard, { backgroundColor: colors.card }]}>
          {REASONS.map((r, i) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.reasonRow,
                { borderBottomColor: colors.divider },
                i < REASONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
              onPress={() => setReason(r.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.reasonLabel, { color: colors.foreground }]}>{r.label}</Text>
              {reason === r.key
                ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                : <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              }
            </TouchableOpacity>
          ))}
        </View>

        {reason && (
          <View style={[styles.descSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.descLabel, { color: colors.foreground }]}>Détails supplémentaires (optionnel)</Text>
            <TextInput
              style={[styles.descInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Décrivez le problème..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: reason ? colors.destructive : colors.border },
            mutation.isPending && { opacity: 0.7 },
          ]}
          onPress={() => mutation.mutate()}
          disabled={!reason || mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="warning-outline" size={18} color={reason ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.sendBtnText, { color: reason ? "#fff" : colors.mutedForeground }]}>
                Envoyer le signalement
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  heroSection: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, marginBottom: 16 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  title:        { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc:         { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginLeft: 20, marginBottom: 6 },
  reasonsCard: {
    marginHorizontal: 12, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 14,
  },
  reasonRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 15,
  },
  reasonLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  descSection: { marginHorizontal: 12, borderRadius: 16, padding: 16, marginBottom: 16 },
  descLabel:   { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  descInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100,
  },
  sendBtn: {
    marginHorizontal: 12, paddingVertical: 15, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  sendBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
