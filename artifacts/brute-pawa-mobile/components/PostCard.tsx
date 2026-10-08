import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Post {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  liked: boolean;
}

interface PostCardProps {
  post: Post;
  onLike: (id: number, liked: boolean) => void;
}

function timeAgo(date: string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  CI: "🇨🇮", SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", BF: "🇧🇫", NE: "🇳🇪",
  ML: "🇲🇱", GN: "🇬🇳", CM: "🇨🇲", CD: "🇨🇩", GH: "🇬🇭",
};

export function PostCard({ post, onLike }: PostCardProps) {
  const colors = useColors();
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  function handleLike() {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => (newLiked ? c + 1 : c - 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike(post.id, newLiked);
  }

  const initials = post.authorName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const flag = COUNTRY_FLAGS[post.authorCountry] ?? "🌍";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          {post.authorAvatarUrl ? (
            <Image source={{ uri: post.authorAvatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>
            {post.authorName} <Text style={styles.flag}>{flag}</Text>
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedForeground} />
      </View>

      {post.content.length > 0 && (
        <Text style={[styles.content, { color: colors.foreground }]}>{post.content}</Text>
      )}

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={[styles.stats, { borderTopColor: colors.divider }]}>
        <Text style={[styles.statsText, { color: colors.mutedForeground }]}>
          {likesCount > 0 ? `${likesCount} j'aime` : ""}
          {likesCount > 0 && post.commentsCount > 0 ? "  ·  " : ""}
          {post.commentsCount > 0 ? `${post.commentsCount} commentaires` : ""}
        </Text>
      </View>

      <View style={[styles.actions, { borderTopColor: colors.divider }]}>
        <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? "#E41E3F" : colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: liked ? "#E41E3F" : colors.mutedForeground }]}>
            J'aime
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <MaterialCommunityIcons name="comment-outline" size={20} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Commenter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={20} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Partager</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  flag: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#E0E0E0",
  },
  stats: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
