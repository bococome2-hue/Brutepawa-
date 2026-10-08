import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

interface ContactInfo {
  id: number;
  firstName: string;
  lastName: string;
  bio: string | null;
  country: string;
  avatarUrl: string | null;
  verified: boolean;
  friendsCount: number;
  followersCount: number;
  postsCount: number;
  createdAt: string;
}

function Avatar({ name, size, avatarUrl }: { name: string; size: number; avatarUrl?: string | null }) {
  const initials = name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
  if (avatarUrl) {
    const Image = require("react-native").Image;
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.35, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function StatBox({ value, label, colors }: { value: number; label: string; colors: any }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value.toLocaleString("fr-FR")}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ContactProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const isWeb      = require("react-native").Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const { data: contact, isLoading, isError } = useQuery<ContactInfo>({
    queryKey: ["contact", userId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Erreur chargement");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !contact) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Profil introuvable</Text>
      </View>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const username = `@${contact.firstName.toLowerCase()}${contact.lastName.toLowerCase()}`;
  const joined   = new Date(contact.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long" });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Voir le profil</Text>
        <TouchableOpacity style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="share-social-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Avatar + name section */}
        <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
          <Avatar name={fullName} size={90} avatarUrl={contact.avatarUrl} />
          <View style={styles.nameBlock}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.fullName, { color: colors.foreground }]}>{fullName}</Text>
              {contact.verified && (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>{username}</Text>
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Membre BrutePawa</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <StatBox value={contact.postsCount} label="Publications" colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <StatBox value={contact.friendsCount} label="Amis" colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <StatBox value={contact.followersCount} label="Abonnés" colors={colors} />
        </View>

        {/* Message button */}
        <TouchableOpacity
          style={[styles.msgBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/chat/${userId}` as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.msgBtnText}>Envoyer un message</Text>
        </TouchableOpacity>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>À propos</Text>
          {contact.bio ? (
            <View style={styles.aboutRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>{contact.bio}</Text>
            </View>
          ) : (
            <View style={styles.aboutRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>J'utilise BrutePawa pour rester connecté</Text>
            </View>
          )}
          <View style={styles.aboutRow}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>{contact.country}</Text>
          </View>
        </View>

        {/* All info link */}
        <TouchableOpacity style={[styles.allInfoRow, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
          <Text style={[styles.allInfoText, { color: colors.foreground }]}>Voir toutes les informations</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>
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
  menuBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  profileHeader: {
    alignItems: "center", paddingVertical: 24, paddingHorizontal: 20,
    gap: 12, marginTop: 12, marginHorizontal: 12, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  nameBlock:   { alignItems: "center", gap: 4 },
  fullName:    { fontSize: 22, fontFamily: "Inter_700Bold" },
  username:    { fontSize: 14, fontFamily: "Inter_400Regular" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: {
    flexDirection: "row", marginTop: 10, marginHorizontal: 12,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statBox:     { flex: 1, alignItems: "center", gap: 2 },
  statValue:   { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel:   { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 8 },
  msgBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 10, marginHorizontal: 12,
    paddingVertical: 14, borderRadius: 14,
  },
  msgBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  section: {
    marginTop: 10, marginHorizontal: 12, borderRadius: 16,
    padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  aboutRow:     { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  aboutText:    { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  allInfoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 10, marginHorizontal: 12, borderRadius: 16,
    padding: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  allInfoText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
