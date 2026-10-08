import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import ContactOptionsBottomSheet from "@/components/ContactOptionsBottomSheet";

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
  presence: { online: boolean; lastSeen: string | null };
  isMuted: boolean;
  muteExpiresAt: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
  friendStatus: "pending" | "accepted" | "rejected" | null;
  friendDirection: "sent" | "received" | null;
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

export default function InfosContactScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors      = useColors();
  const insets      = useSafeAreaInsets();
  const { token }   = useAuth();
  const qc          = useQueryClient();
  const isWeb       = Platform.OS === "web";
  const topPadding  = isWeb ? 67 : insets.top;

  const [showOptions, setShowOptions] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const contactQuery = useQuery<ContactInfo>({
    queryKey: ["contact", userId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}`, { headers });
      if (!r.ok) throw new Error("Erreur chargement");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  const muteMutation = useMutation({
    mutationFn: async () => {
      const contact = contactQuery.data;
      if (!contact) return;
      if (contact.isMuted) {
        await fetch(`${API_BASE_URL}/contacts/${userId}/mute`, { method: "DELETE", headers });
      } else {
        router.push(`/contact/${userId}/mute` as any);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact", userId] }),
  });

  const pinMutation = useMutation({
    mutationFn: async () => {
      const contact = contactQuery.data;
      if (!contact) return;
      const method = contact.isPinned ? "DELETE" : "POST";
      await fetch(`${API_BASE_URL}/contacts/${userId}/pin`, { method, headers });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact", userId] }),
  });

  const handleMuteToggle = useCallback(() => {
    const contact = contactQuery.data;
    if (!contact) return;
    if (contact.isMuted) {
      muteMutation.mutate();
    } else {
      setShowOptions(false);
      router.push(`/contact/${userId}/mute` as any);
    }
  }, [contactQuery.data, userId]);

  const handlePinToggle = useCallback(() => {
    pinMutation.mutate();
  }, []);

  if (contactQuery.isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (contactQuery.isError || !contactQuery.data) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Contact introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { marginTop: 12 }]}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const contact = contactQuery.data;
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const isOnline = contact.presence?.online ?? false;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Infos du contact</Text>
        <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarWrap}>
            <Avatar name={fullName} size={80} avatarUrl={contact.avatarUrl} />
            <View style={[
              styles.onlineDot,
              { backgroundColor: isOnline ? colors.primary : colors.mutedForeground },
            ]} />
          </View>

          <Text style={[styles.name, { color: colors.foreground }]}>{fullName}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.primary : colors.mutedForeground }]} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {isOnline ? "En ligne" : "Hors ligne"}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => router.push(`/chat/${userId}` as any)}
            >
              <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => Alert.alert("Appel audio", "Fonctionnalité en cours de développement")}
            >
              <Ionicons name="call-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Appel audio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => Alert.alert("Appel vidéo", "Fonctionnalité en cours de développement")}
            >
              <Ionicons name="videocam-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Vidéo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Rows */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          {/* Bio */}
          <TouchableOpacity
            style={[styles.infoRow, { borderBottomColor: colors.divider }]}
            onPress={() => router.push(`/contact/${userId}/profile` as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: colors.foreground }]} numberOfLines={1}>
              {contact.bio ?? "Bonjour ! J'utilise Brute Pawa."}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Name */}
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => router.push(`/contact/${userId}/profile` as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: colors.foreground }]}>{fullName}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Sheet */}
      <ContactOptionsBottomSheet
        userId={userId!}
        contactName={fullName}
        visible={showOptions}
        isMuted={contact.isMuted}
        isPinned={contact.isPinned}
        onClose={() => setShowOptions(false)}
        onToggleMute={handleMuteToggle}
        onTogglePin={handlePinToggle}
      />
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
  backBtn: { padding: 4, marginRight: 4 },
  menuBtn: { padding: 4 },
  headerTitle: {
    flex: 1, fontSize: 18, fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  profileCard: {
    marginTop: 12, marginHorizontal: 12, borderRadius: 16,
    alignItems: "center", paddingVertical: 24, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarWrap: { position: "relative", marginBottom: 12 },
  onlineDot: {
    position: "absolute", bottom: 3, right: 3,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2.5, borderColor: "#fff",
  },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 18 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 10, width: "100%" },
  actionBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12, gap: 5,
  },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  infoCard: {
    marginTop: 10, marginHorizontal: 12, borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  infoRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  infoText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
