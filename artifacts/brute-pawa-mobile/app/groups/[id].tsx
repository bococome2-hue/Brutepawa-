import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import BrutePawaChatWallpaper from "@/components/BrutePawaChatWallpaper";
import { API_BASE_URL } from "@/constants/api";

interface GroupDetail {
  id: number;
  name: string;
  description: string | null;
  category: string;
  emoji: string | null;
  coverUrl: string | null;
  country: string | null;
  privacy: string;
  membersCount: number;
  isMember: boolean;
  memberRole: string | null;
  joinRequestStatus: string | null;
}

function useGroupDetail(id: number, token: string | null) {
  return useQuery<GroupDetail>({
    queryKey: ["group", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Group not found");
      return res.json() as Promise<GroupDetail>;
    },
    enabled: Boolean(token) && !isNaN(id),
    retry: false,
  });
}

const PRIVACY_LABELS: Record<string, string> = {
  public: "Groupe public",
  private: "Groupe privé",
};

export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const groupId = Number(idParam);
  const groupQuery = useGroupDetail(groupId, token);
  const group = groupQuery.data;

  return (
    <View style={styles.root}>
      <BrutePawaChatWallpaper />
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.secondary }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {group?.name ?? "Groupe"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {groupQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groupQuery.isError || !group ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Groupe introuvable
          </Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Ce groupe n'existe pas ou vous n'avez pas accès.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emojiCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={styles.emojiText}>{group.emoji ?? "👥"}</Text>
            </View>
            <Text style={[styles.groupName, { color: colors.foreground }]}>
              {group.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                <Ionicons
                  name={group.privacy === "private" ? "lock-closed" : "globe-outline"}
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                  {PRIVACY_LABELS[group.privacy] ?? group.privacy}
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                  {group.membersCount} membre{group.membersCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            {group.isMember && (
              <View style={[styles.memberBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                <Text style={[styles.memberBadgeText, { color: colors.primary }]}>
                  {group.memberRole === "admin" ? "Administrateur" : group.memberRole === "moderator" ? "Modérateur" : "Membre"}
                </Text>
              </View>
            )}
          </View>

          {group.description ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                À propos
              </Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {group.description}
              </Text>
            </View>
          ) : null}

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Détails
            </Text>
            <InfoRow
              icon="grid-outline"
              label="Catégorie"
              value={group.category}
              colors={colors}
            />
            {group.country ? (
              <InfoRow
                icon="location-outline"
                label="Pays"
                value={group.country}
                colors={colors}
              />
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} style={styles.infoIcon} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EFF8F1" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  placeholder: { width: 36 },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 36,
  },
  groupName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  memberBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  infoIcon: { flexShrink: 0 },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
