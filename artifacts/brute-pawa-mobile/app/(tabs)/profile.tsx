import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useGetMe, useGetWallet } from "@workspace/api-client-react";
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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const COUNTRY_FLAGS: Record<string, string> = {
  CI: "🇨🇮", SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", BF: "🇧🇫", NE: "🇳🇪",
  ML: "🇲🇱", GN: "🇬🇳", CM: "🇨🇲", CD: "🇨🇩", GH: "🇬🇭",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut, user: storedUser } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const meQuery = useGetMe({ query: {} });
  const walletQuery = useGetWallet({ query: {} });

  const user = meQuery.data ?? storedUser;
  const wallet = walletQuery.data;

  const bottomPadding = isWeb ? 34 : insets.bottom;

  if (meQuery.isLoading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  const flag = user ? (COUNTRY_FLAGS[user.country] ?? "🌍") : "🌍";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profil</Text>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="settings-outline" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 20 }]}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.coverPlaceholder, { backgroundColor: colors.primary + "22" }]} />

          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
            </View>
            <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user ? `${user.firstName} ${user.lastName}` : "—"} <Text>{flag}</Text>
            </Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
              {user?.email ?? ""}
            </Text>
            {user?.bio && (
              <Text style={[styles.bio, { color: colors.foreground }]}>{user.bio}</Text>
            )}
          </View>

          {wallet && (
            <View style={[styles.walletBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={styles.walletItem}>
                <Text style={[styles.walletAmount, { color: colors.primary }]}>
                  {wallet.balance.toLocaleString()}
                </Text>
                <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>
                  {wallet.currency}
                </Text>
              </View>
              <View style={[styles.walletDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.walletItem}>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
                <Text style={[styles.walletLabel, { color: colors.primary }]}>Recharger</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionItem
            colors={colors}
            icon="person-outline"
            label="Modifier le profil"
          />
          <SectionItem
            colors={colors}
            icon="people-outline"
            label="Amis"
          />
          <SectionItem
            colors={colors}
            icon="wallet-outline"
            label="Portefeuille"
          />
          <SectionItem
            colors={colors}
            icon="school-outline"
            label="Formations"
          />
          <SectionItem
            colors={colors}
            icon="briefcase-outline"
            label="Emplois"
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionItem
            colors={colors}
            icon="help-circle-outline"
            label="Aide & Support"
          />
          <SectionItem
            colors={colors}
            icon="shield-checkmark-outline"
            label="Confidentialité"
          />
          <TouchableOpacity
            style={[styles.item, { borderBottomWidth: 0 }]}
            onPress={signOut}
            activeOpacity={0.7}
          >
            <View style={[styles.itemIcon, { backgroundColor: "#FDE8EC" }]}>
              <Ionicons name="log-out-outline" size={20} color="#E41E3F" />
            </View>
            <Text style={[styles.itemLabel, { color: "#E41E3F" }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionItem({ colors, icon, label }: { colors: any; icon: string; label: string }) {
  return (
    <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]} activeOpacity={0.7}>
      <View style={[styles.itemIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.itemLabel, { color: colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { gap: 12, padding: 12 },
  profileCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverPlaceholder: {
    height: 100,
  },
  avatarSection: {
    marginTop: -36,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 3,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  userEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 4,
  },
  walletBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  walletItem: {
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  walletAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  walletLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  walletDivider: {
    width: 1,
    height: 40,
  },
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
