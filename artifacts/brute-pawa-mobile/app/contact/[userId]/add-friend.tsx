import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export default function AddFriendScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const qc         = useQueryClient();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const contactQuery = useQuery<{ firstName: string; lastName: string; friendStatus: string | null; friendDirection: string | null }>({
    queryKey: ["contact", userId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Erreur");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  const contact    = contactQuery.data;
  const fullName   = contact ? `${contact.firstName} ${contact.lastName}` : "…";
  const friendStatus = contact?.friendStatus ?? null;
  const direction  = contact?.friendDirection ?? null;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/friend-request`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as any;
        throw new Error(err?.error ?? "Erreur");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", userId] });
      Alert.alert("Demande envoyée", `Votre demande d'ami a été envoyée à ${fullName}`);
    },
    onError: (e: any) => Alert.alert("Erreur", e.message ?? "Impossible d'envoyer la demande"),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/friend-request`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "cancel" }),
      });
      if (!r.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", userId] });
    },
    onError: () => Alert.alert("Erreur", "Opération impossible"),
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/friend-request`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "accept" }),
      });
      if (!r.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", userId] });
      Alert.alert("Ami ajouté", `Vous êtes maintenant amis avec ${fullName}`);
    },
    onError: () => Alert.alert("Erreur", "Opération impossible"),
  });

  const isPending = sendMutation.isPending || cancelMutation.isPending || acceptMutation.isPending;

  const getStatusContent = () => {
    if (friendStatus === "accepted") {
      return { icon: "people-outline" as const, label: "Vous êtes déjà amis", btnLabel: null, btnAction: null };
    }
    if (friendStatus === "pending" && direction === "sent") {
      return { icon: "time-outline" as const, label: "Demande envoyée en attente de réponse", btnLabel: "Annuler la demande", btnAction: () => cancelMutation.mutate() };
    }
    if (friendStatus === "pending" && direction === "received") {
      return { icon: "person-add-outline" as const, label: `${fullName} vous a envoyé une demande d'ami`, btnLabel: "Accepter", btnAction: () => acceptMutation.mutate() };
    }
    return { icon: "person-add-outline" as const, label: `Envoyez une demande d'amitié à ${fullName}`, btnLabel: "Envoyer une demande", btnAction: () => sendMutation.mutate() };
  };

  const { icon, label, btnLabel, btnAction } = getStatusContent();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ajouter aux amis</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name={icon} size={44} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Ajouter aux amis</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{label}</Text>

        {btnLabel && btnAction && (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]}
            onPress={btnAction}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>{btnLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {friendStatus === "accepted" && (
          <View style={[styles.successBadge, { backgroundColor: colors.secondary }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.successText, { color: colors.primary }]}>Amis confirmés</Text>
          </View>
        )}
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
  title:   { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  sendBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  sendBtnText:  { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  successBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
  },
  successText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
