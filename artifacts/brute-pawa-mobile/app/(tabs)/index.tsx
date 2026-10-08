import { Ionicons } from "@expo/vector-icons";
import {
  useListPosts,
  useLikePost,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useColors } from "@/hooks/useColors";
import { PostCard } from "@/components/PostCard";
import { StoryBar } from "@/components/StoryBar";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

interface StoryGroup {
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string;
  storiesCount: number;
}

function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async (): Promise<StoryGroup[]> => {
      const res = await fetch(`${API_BASE_URL}/api/stories`);
      if (!res.ok) return [];
      return res.json() as Promise<StoryGroup[]>;
    },
    retry: false,
  });
}

function useUnreadNotifCount(token: string | null) {
  return useQuery<number>({
    queryKey: ["notif-unread-count"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return 0;
      const data = await res.json() as { count: number };
      return data.count ?? 0;
    },
    enabled: Boolean(token),
    refetchInterval: 30_000,
    retry: false,
  });
}

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const postsQuery = useListPosts(undefined, { query: {} });
  const storiesQuery = useStories();
  const likeMutation = useLikePost();
  const unreadCountQuery = useUnreadNotifCount(token);
  const unreadCount = unreadCountQuery.data ?? 0;

  const posts = (postsQuery.data ?? []) as any[];
  const stories = (storiesQuery.data ?? []) as StoryGroup[];

  const handleLike = useCallback(
    (id: number, liked: boolean) => {
      likeMutation.mutate({
        id,
        data: { action: liked ? "like" : "unlike" },
      });
    },
    [likeMutation],
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: postsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: ["stories"] }),
    ]);
  }, [queryClient, postsQuery.queryKey]);

  const ListHeader = useCallback(
    () => (
      <StoryBar
        stories={stories}
        onAddStory={() => {}}
        onViewStory={() => {}}
      />
    ),
    [stories],
  );

  const ListEmpty = useCallback(() => {
    if (postsQuery.isLoading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Ionicons name="newspaper-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Aucune publication
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Suivez des personnes pour voir leurs publications
        </Text>
      </View>
    );
  }, [postsQuery.isLoading, colors]);

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
        <Text style={[styles.brandName, { color: colors.primary }]}>Brute Pawa</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="search" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PostCard post={item as any} onLike={handleLike} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={postsQuery.isRefetching ?? false}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContent : { paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      />

      {/* ── FAB Créer ───────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/create" as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
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
  brandName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
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
    paddingTop: 60,
    alignItems: "center",
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
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
  },
});
