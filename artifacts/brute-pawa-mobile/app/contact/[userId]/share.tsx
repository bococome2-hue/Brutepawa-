import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Alert, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { Share as RNShare } from "react-native";

export default function ShareProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();
  const isWeb      = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const contactQuery = useQuery<{ firstName: string; lastName: string }>({
    queryKey: ["contact", userId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/contacts/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Erreur");
      return r.json();
    },
    enabled: !!userId && !!token,
  });

  const contact   = contactQuery.data;
  const fullName  = contact ? `${contact.firstName} ${contact.lastName}` : "…";
  const username  = contact ? `${contact.firstName.toLowerCase()}${contact.lastName.toLowerCase()}` : "user";
  const shareUrl  = `https://brutepawa.com/u/${username}`;
  const shareText = `Voici le profil de ${fullName} sur BrutePawa : ${shareUrl}`;

  const handleCopy = async () => {
    try {
      await RNShare.share({ message: shareUrl, url: shareUrl });
    } catch {
      Alert.alert("Partager", shareUrl);
    }
  };

  const handleShare = async (platform: string) => {
    if (platform === "brutepawa") {
      try { await RNShare.share({ message: shareText }); } catch { /* ignore */ }
      return;
    }
    let url = "";
    if (platform === "whatsapp") {
      url = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    } else if (platform === "facebook") {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    } else if (platform === "telegram") {
      url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Profil de ${fullName}`)}`;
    } else {
      try { await RNShare.share({ message: shareText }); } catch { /* ignore */ }
      return;
    }
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert("Erreur", "Impossible d'ouvrir l'application"));
    }
  };

  const PLATFORMS = [
    { key: "brutepawa", label: "BrutePawa", icon: "shield-checkmark-outline" as const, color: "#22C55E", bg: "#DCFCE7" },
    { key: "whatsapp",  label: "WhatsApp",  icon: "logo-whatsapp" as const,            color: "#25D366", bg: "#E7FDF0" },
    { key: "facebook",  label: "Facebook",  icon: "logo-facebook" as const,            color: "#1877F2", bg: "#E7F0FD" },
    { key: "more",      label: "Plus",      icon: "ellipsis-horizontal" as const,       color: "#6B7280", bg: "#F3F4F6" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Partager le profil</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Ionicons name="share-social-outline" size={44} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Partager le profil</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Partagez le profil de {fullName} avec vos amis
        </Text>

        {/* Platform buttons */}
        <View style={styles.platformsRow}>
          {PLATFORMS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={styles.platformBtn}
              onPress={() => p.key === "more" ? handleCopy() : handleShare(p.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.platformIcon, { backgroundColor: p.bg }]}>
                <Ionicons name={p.icon} size={26} color={p.color} />
              </View>
              <Text style={[styles.platformLabel, { color: colors.mutedForeground }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Link box */}
        <View style={[styles.linkBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="link-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={1}>{shareUrl}</Text>
          <TouchableOpacity onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.copyText, { color: colors.primary }]}>Copier</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  content: { flex: 1, alignItems: "center", paddingHorizontal: 20, paddingTop: 32 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title:          { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  desc:           { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 28, lineHeight: 20 },
  platformsRow:   { flexDirection: "row", gap: 20, marginBottom: 24 },
  platformBtn:    { alignItems: "center", gap: 6 },
  platformIcon:   { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  platformLabel:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  linkBox: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  linkText:  { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  copyBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  copyText:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
