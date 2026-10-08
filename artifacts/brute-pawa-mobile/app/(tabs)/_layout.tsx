import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Badge, Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

function useUnreadCount(token: string | null) {
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

function ClassicTabLayout({ unreadCount }: { unreadCount: number }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  const badgeValue = unreadCount > 0
    ? (unreadCount > 99 ? "99+" : unreadCount)
    : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#22C55E",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#E5E7EB",
          elevation: 0,
          paddingBottom: isWeb ? 0 : insets.bottom,
          ...(isWeb ? { height: 64 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
          ),
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Discussions",
          tabBarBadge: badgeValue,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left" tintColor={color} size={24} />
            ) : (
              <Ionicons name="chatbubble-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="diffusions"
        options={{
          title: "Diffusions",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="megaphone" tintColor={focused ? "#22C55E" : color} size={24} />
            ) : (
              <Ionicons name="megaphone-outline" size={22} color={focused ? "#22C55E" : color} />
            ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Appels",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="phone" tintColor={color} size={24} />
            ) : (
              <Feather name="phone" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Paramètres",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={24} />
            ) : (
              <Ionicons name="settings-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
    </Tabs>
  );
}

function NativeTabLayout({ unreadCount }: { unreadCount: number }) {
  const badgeValue = unreadCount > 0
    ? (unreadCount > 99 ? "99+" : String(unreadCount))
    : undefined;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Accueil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "bubble.left", selected: "bubble.left.fill" }} />
        <Label>Discussions</Label>
        {badgeValue !== undefined && <Badge>{badgeValue}</Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diffusions">
        <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <Label>Diffusions</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "phone", selected: "phone.fill" }} />
        <Label>Appels</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Paramètres</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabLayout() {
  const { token } = useAuth();
  const unreadCountQuery = useUnreadCount(token);
  const unreadCount = unreadCountQuery.data ?? 0;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout unreadCount={unreadCount} />;
  }
  return <ClassicTabLayout unreadCount={unreadCount} />;
}
