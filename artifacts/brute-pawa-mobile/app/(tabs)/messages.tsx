import { Ionicons } from "@expo/vector-icons";
import { useListMessages } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import BrutePawaChatWallpaper from "@/components/BrutePawaChatWallpaper";

function timeAgo(date: string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Maintenant";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const convQuery = useListMessages({ query: {} });
  const conversations = (convQuery.data ?? []) as any[];

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: convQuery.queryKey });
  }, [queryClient, convQuery.queryKey]);

  return (
    <View style={styles.root}>
      <BrutePawaChatWallpaper />
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="create-outline" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {convQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.userId)}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              colors={colors}
              onPress={() => router.push(`/chat/${item.userId}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={convQuery.isRefetching ?? false}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun message</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Commencez à discuter avec vos amis
              </Text>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? styles.emptyContent : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/* Deterministic avatar colors — same palette as fblite */
const AVATAR_COLORS = [
  "#22C55E","#EC4899","#8B5CF6","#D97706","#388E3C","#00838F","#D32F2F","#0EA5E9","#F59E0B",
];
function avatarColor(userId: number): string {
  return AVATAR_COLORS[Math.abs(userId) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w: string) => w[0] ?? "").join("").toUpperCase();
}

function ConversationRow({
  item,
  colors,
  onPress,
}: {
  item: any;
  colors: any;
  onPress: () => void;
}) {
  const displayName = item.otherUserName ?? `#${item.userId}`;
  const abbr        = initials(displayName);
  const bgColor     = avatarColor(item.userId ?? 0);
  const hasUnread   = (item.unreadCount ?? 0) > 0;
  const photoUrl    = item.otherUserAvatarUrl as string | null | undefined;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: bgColor }]}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          : <Text style={styles.avatarText}>{abbr}</Text>
        }
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: hasUnread ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
            {displayName}
          </Text>
          <Text style={[styles.time, { color: hasUnread ? colors.primary : colors.mutedForeground }]}>
            {item.updatedAt ? timeAgo(item.updatedAt) : ""}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, { color: hasUnread ? colors.foreground : colors.mutedForeground, fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {item.lastMessage ?? ""}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 15 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  preview: { fontSize: 14, flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyContent: { flexGrow: 1 },
});
