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

export default function BlockUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const qc         = useQueryClient();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const contactQuery = useQuery<{ firstName: string; lastName: string; isBlocked: boolean }>({
    queryKey: ["contact", userId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Erreur");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  const contact     = contactQuery.data;
  const fullName    = contact ? `${contact.firstName} ${contact.lastName}` : "ce contact";
  const isBlocked   = contact?.isBlocked ?? false;

  const blockMutation = useMutation({
    mutationFn: async () => {
      const method = isBlocked ? "DELETE" : "POST";
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/block`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", userId] });
      const msg = isBlocked ? `${fullName} a été débloqué` : `${fullName} a été bloqué`;
      Alert.alert(isBlocked ? "Débloqué" : "Bloqué", msg, [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: () => Alert.alert("Erreur", "Opération impossible"),
  });

  const handleBlock = () => {
    if (isBlocked) {
      blockMutation.mutate();
      return;
    }
    Alert.alert(
      `Bloquer ${fullName} ?`,
      "Ce contact ne pourra plus vous envoyer de messages, vous appeler ou voir votre profil.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Bloquer", style: "destructive", onPress: () => blockMutation.mutate() },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Bloquer le contact</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: isBlocked ? "#DCFCE7" : "#FEE2E2" }]}>
          <Ionicons name="ban-outline" size={44} color={isBlocked ? colors.primary : colors.destructive} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {isBlocked ? "Débloquer le contact" : "Bloquer le contact"}
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          {isBlocked
            ? `${fullName} pourra à nouveau vous contacter`
            : "Ce contact ne pourra plus vous contacter"
          }
        </Text>

        {!isBlocked && (
          <View style={[styles.warningCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            {[
              "Ne pourra plus vous envoyer de messages",
              "Ne pourra plus vous appeler",
              "Ne verra plus vos publications",
              "Ne pourra plus vous envoyer de demandes",
            ].map((item, i) => (
              <View key={i} style={styles.warningItem}>
                <Ionicons name="close-circle-outline" size={16} color={colors.destructive} />
                <Text style={[styles.warningText, { color: colors.destructive }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.blockBtn,
            { backgroundColor: isBlocked ? colors.primary : colors.destructive },
            blockMutation.isPending && { opacity: 0.7 },
          ]}
          onPress={handleBlock}
          disabled={blockMutation.isPending || contactQuery.isLoading}
          activeOpacity={0.85}
        >
          {blockMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={isBlocked ? "checkmark-outline" : "ban-outline"} size={18} color="#fff" />
              <Text style={styles.blockBtnText}>{isBlocked ? "Débloquer" : "Bloquer"}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Annuler</Text>
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
  title:   { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  warningCard: {
    width: "100%", borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 10, marginBottom: 24,
  },
  warningItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  warningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  blockBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
  },
  blockBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn:    { paddingVertical: 10 },
  cancelText:   { fontSize: 15, fontFamily: "Inter_500Medium" },
});
