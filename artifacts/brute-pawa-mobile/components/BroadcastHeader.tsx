import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BroadcastHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  color?: string;
  onMenu?: () => void;
  rightIcon?: React.ReactNode;
}

export default function BroadcastHeader({
  title,
  subtitle,
  emoji = "📢",
  color = "#22C55E",
  onMenu,
  rightIcon,
}: BroadcastHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  return (
    <View style={[s.wrap, { paddingTop: topPad }]}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color="#111827" />
      </TouchableOpacity>

      <View style={[s.avatar, { backgroundColor: color }]}>
        <Text style={s.avatarText}>{emoji}</Text>
      </View>

      <View style={s.titleBlock}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={onMenu} style={s.menuBtn} hitSlop={8}>
        {rightIcon ?? <Ionicons name="ellipsis-vertical" size={22} color="#6B7280" />}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
