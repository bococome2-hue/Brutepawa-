import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export default function DeleteConversationScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/conversation`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      router.dismissAll();
      router.replace("/(tabs)/messages" as any);
    },
    onError: () => Alert.alert("Erreur", "Impossible de supprimer la conversation"),
  });

  const handleDelete = () => {
    Alert.alert(
      "Supprimer la conversation ?",
      "Cette action supprimera définitivement cette conversation de votre côté. L'autre participant pourra toujours voir ses messages.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => mutation.mutate() },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Supprimer la conversation</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="trash-outline" size={44} color={colors.destructive} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Supprimer la conversation</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Cette action supprimera tous les messages de cette conversation de votre côté uniquement. L'autre participant pourra toujours voir ses messages.
        </Text>

        <View style={[styles.warningCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
          <Ionicons name="warning-outline" size={20} color={colors.destructive} />
          <Text style={[styles.warningText, { color: colors.destructive }]}>
            Cette action est irréversible et ne peut pas être annulée.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.destructive }, mutation.isPending && { opacity: 0.7 }]}
          onPress={handleDelete}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteBtnText}>Supprimer</Text>
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
    width: 88, height: 88, borderRadius: 44, marginBottom: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center", justifyContent: "center",
  },
  title:       { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc:        { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20, lineHeight: 22 },
  warningCard: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 28,
  },
  warningText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  deleteBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
  },
  deleteBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn:     { paddingVertical: 10 },
  cancelText:    { fontSize: 15, fontFamily: "Inter_500Medium" },
});
