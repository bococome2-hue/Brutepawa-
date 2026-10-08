import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

interface Group {
  id: number;
  name: string;
  avatarUrl: string | null;
  type: string;
}

export default function AddToGroupScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const contactQuery = useQuery<{ firstName: string; lastName: string }>({
    queryKey: ["contact", userId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Erreur");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  const groupsQuery = useQuery<Group[]>({
    queryKey: ["my-groups"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/me/groups`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Erreur");
      return r.json();
    },
    enabled: !!token,
  });

  const addMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}/add-to-group/${groupId}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as any;
        throw new Error(err?.error ?? "Erreur");
      }
    },
    onSuccess: () => {
      const name = contactQuery.data ? `${contactQuery.data.firstName} ${contactQuery.data.lastName}` : "Le contact";
      Alert.alert("Succès", `${name} a été ajouté au groupe`, [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: (e: any) => Alert.alert("Erreur", e.message ?? "Impossible d'ajouter au groupe"),
  });

  const contact  = contactQuery.data;
  const fullName = contact ? `${contact.firstName} ${contact.lastName}` : "…";
  const groups   = groupsQuery.data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ajouter à un groupe</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name="people-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Ajouter à un groupe</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Ajoutez {fullName} à l'un de vos groupes
        </Text>
      </View>

      {groupsQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Vous n'avez aucun groupe</Text>
          <TouchableOpacity onPress={() => router.push("/create/group" as any)} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.createBtnText}>Créer un groupe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.groupRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
              onPress={() => addMutation.mutate(item.id)}
              disabled={addMutation.isPending}
              activeOpacity={0.7}
            >
              <View style={[styles.groupAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="people-outline" size={20} color="#fff" />
              </View>
              <Text style={[styles.groupName, { color: colors.foreground }]}>{item.name}</Text>
              {addMutation.isPending
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              }
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>Choisir un groupe</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  loader:  { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSection: { alignItems: "center", paddingTop: 28, paddingHorizontal: 20, marginBottom: 8 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  title:    { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  desc:     { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 8 },
  listHeader: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 12, marginBottom: 8, paddingHorizontal: 4 },
  groupRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 12, marginBottom: 6,
  },
  groupAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  groupName:   { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  emptyCard: {
    margin: 20, borderRadius: 16, padding: 24,
    alignItems: "center", gap: 12, borderWidth: 1,
  },
  emptyText:   { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  createBtn:   { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  createBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
