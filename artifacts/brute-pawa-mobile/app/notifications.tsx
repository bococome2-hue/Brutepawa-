import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

interface Notification {
  id: number;
  type: string;
  actorId: number | null;
  actorName: string | null;
  action: string;
  detail: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

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

function notifIcon(type: string): { name: React.ComponentProps<typeof Ionicons>["name"]; color: string } {
  switch (type) {
    case "group":      return { name: "people",         color: "#1877F2" };
    case "like":       return { name: "heart",          color: "#E0245E" };
    case "comment":    return { name: "chatbubble",     color: "#17BF63" };
    case "follow":     return { name: "person-add",     color: "#794BC4" };
    case "friend_request": return { name: "person-add", color: "#794BC4" };
    case "message":    return { name: "mail",           color: "#F5A623" };
    case "call":       return { name: "call",           color: "#1C7A42" };
    case "reaction":   return { name: "happy",          color: "#F5A623" };
    default:           return { name: "notifications",  color: "#657786" };
  }
}

/**
 * Résout la destination de navigation à partir du lien et du type de notification.
 * Retourne { pathname, params } compatibles avec router.push.
 */
function resolveNotifDestination(
  item: Notification,
): { pathname: string; params?: Record<string, string> } | null {
  const link = item.link ?? "";

  // — /chat/:userId
  const chatMatch = link.match(/^\/chat\/(\d+)$/);
  if (chatMatch) {
    return { pathname: "/chat/[userId]", params: { userId: chatMatch[1] } };
  }

  // — /groups/:id ou /chat-groups/:id
  const groupMatch = link.match(/^\/(?:groups|chat-groups)\/(\d+)$/);
  if (groupMatch) {
    return { pathname: "/groups/[id]", params: { id: groupMatch[1] } };
  }

  // — /post/:id  (pas encore d'écran dédié → accueil)
  const postMatch = link.match(/^\/post\/(\d+)$/);
  if (postMatch) {
    return { pathname: "/(tabs)/" };
  }

  // — /profile/:id
  const profileMatch = link.match(/^\/profile\/(\d+)$/);
  if (profileMatch) {
    // Likes / commentaires / réactions → accueil (pas d'écran publication)
    if (["like", "comment", "reaction"].includes(item.type)) {
      return { pathname: "/(tabs)/" };
    }
    // Follow / demande d'ami → ouvrir un chat avec l'acteur
    const targetId = item.actorId ?? parseInt(profileMatch[1], 10);
    if (targetId) {
      return { pathname: "/chat/[userId]", params: { userId: String(targetId) } };
    }
    return { pathname: "/(tabs)/" };
  }

  // — Fallback par type
  switch (item.type) {
    case "message":
      if (item.actorId) {
        return { pathname: "/chat/[userId]", params: { userId: String(item.actorId) } };
      }
      return { pathname: "/(tabs)/messages" };

    case "call":
      return { pathname: "/(tabs)/messages" };

    case "group":
      return { pathname: "/(tabs)/" };

    case "follow":
    case "friend_request":
      if (item.actorId) {
        return { pathname: "/chat/[userId]", params: { userId: String(item.actorId) } };
      }
      return { pathname: "/(tabs)/" };

    case "like":
    case "comment":
    case "reaction":
      return { pathname: "/(tabs)/" };

    default:
      return null;
  }
}

function useNotifications(token: string | null) {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json() as Promise<Notification[]>;
    },
    enabled: Boolean(token),
    retry: false,
  });
}

function useMarkAllRead(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notif-unread-count"] });
    },
  });
}

function useMarkOneRead(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notif-unread-count"] });
    },
  });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const notifQuery = useNotifications(token);
  const markAllRead = useMarkAllRead(token);
  const markOneRead = useMarkOneRead(token);
  const notifications = notifQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markAllRead.isPending}>
            <Text style={[styles.markRead, { color: colors.primary }]}>
              Tout lire
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notifQuery.isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NotifRow
              item={item}
              colors={colors}
              onMarkRead={(id) => markOneRead.mutate(id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={notifQuery.isRefetching ?? false}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Aucune notification
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Vos notifications apparaîtront ici
              </Text>
            </View>
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyContent : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function NotifRow({
  item,
  colors,
  onMarkRead,
}: {
  item: Notification;
  colors: any;
  onMarkRead: (id: number) => void;
}) {
  const icon = notifIcon(item.type);

  const handlePress = () => {
    // Marquer comme lu
    if (!item.isRead) {
      onMarkRead(item.id);
    }

    // Résoudre la destination
    const dest = resolveNotifDestination(item);
    if (!dest) return;

    if (dest.params) {
      router.push({ pathname: dest.pathname as any, params: dest.params });
    } else {
      router.push(dest.pathname as any);
    }
  };

  const dest = resolveNotifDestination(item);
  const tappable = dest !== null;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: item.isRead ? colors.background : colors.secondary,
        },
      ]}
      onPress={handlePress}
      activeOpacity={tappable ? 0.75 : 1}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
        <Ionicons name={icon.name} size={22} color={icon.color} />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.action,
            {
              color: colors.foreground,
              fontFamily: item.isRead ? "Inter_400Regular" : "Inter_500Medium",
            },
          ]}
          numberOfLines={2}
        >
          {item.action}
        </Text>
        {item.detail ? (
          <Text
            style={[styles.detail, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {item.detail}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {!item.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
        {tappable && (
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  markRead: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1 },
  action: {
    fontSize: 14,
    lineHeight: 20,
  },
  detail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyContent: { flexGrow: 1 },
});
