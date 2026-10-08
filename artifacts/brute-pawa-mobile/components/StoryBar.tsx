import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface StoryGroup {
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string;
  storiesCount: number;
}

interface StoryBarProps {
  stories: StoryGroup[];
  onAddStory?: () => void;
  onViewStory?: (authorId: number) => void;
}

export function StoryBar({ stories, onAddStory, onViewStory }: StoryBarProps) {
  const colors = useColors();
  const { user } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <TouchableOpacity style={styles.storyItem} onPress={onAddStory} activeOpacity={0.8}>
          <View style={[styles.addAvatar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "?"}
              </Text>
            </View>
            <View style={[styles.addBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={12} color="#fff" />
            </View>
          </View>
          <Text style={[styles.storyName, { color: colors.foreground }]} numberOfLines={1}>
            Ma story
          </Text>
        </TouchableOpacity>

        {stories.map((story) => {
          const initials = story.authorName
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();

          return (
            <TouchableOpacity
              key={story.authorId}
              style={styles.storyItem}
              onPress={() => onViewStory?.(story.authorId)}
              activeOpacity={0.8}
            >
              <View style={[styles.storyRing, { borderColor: colors.primary }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                    {initials}
                  </Text>
                </View>
              </View>
              <Text style={[styles.storyName, { color: colors.foreground }]} numberOfLines={1}>
                {story.authorName.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  storyItem: {
    alignItems: "center",
    width: 68,
    gap: 4,
  },
  addAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  addBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  storyName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
