import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const C = { bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", text: "#111827", textSec: "#6B7280", border: "#E5E7EB" };

type PostVisibility = "public" | "friends" | "private";
const VISIBILITY: { key: PostVisibility; label: string; icon: string }[] = [
  { key: "public",  label: "Public",   icon: "globe-outline" },
  { key: "friends", label: "Amis",     icon: "people-outline" },
  { key: "private", label: "Privé",    icon: "lock-closed-outline" },
];

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [saving, setSaving] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) { Alert.alert("Erreur", "Le contenu est requis."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: content.trim(), visibility }),
      });
      if (!res.ok) throw new Error();
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de publier.");
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Publier un post</Text>
        <TouchableOpacity
          style={[s.publishBtn, !content.trim() && { backgroundColor: "#A7F3D0" }]}
          onPress={handlePost}
          disabled={saving || !content.trim()}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Text style={s.publishBtnText}>Publier</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* User avatar + input */}
        <View style={s.composerRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.firstName?.charAt(0).toUpperCase() ?? "U"}</Text>
          </View>
          <View style={s.composerRight}>
            <Text style={s.userName}>{user?.firstName ?? ""} {user?.lastName ?? ""}</Text>
            {/* Visibility picker */}
            <View style={s.visibilityRow}>
              {VISIBILITY.map(v => (
                <TouchableOpacity
                  key={v.key}
                  style={[s.visBtn, visibility === v.key && s.visBtnActive]}
                  onPress={() => setVisibility(v.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={v.icon as any} size={12} color={visibility === v.key ? "#FFFFFF" : C.textSec} />
                  <Text style={[s.visBtnText, visibility === v.key && { color: "#FFFFFF" }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TextInput
          style={s.textArea}
          value={content}
          onChangeText={setContent}
          placeholder="Quoi de neuf ? Partagez quelque chose..."
          placeholderTextColor="#9CA3AF"
          multiline
          autoFocus
          maxLength={2000}
        />

        <Text style={s.charCount}>{content.length}/2000</Text>

        {/* Media actions */}
        <View style={s.mediaActions}>
          {[
            { icon: "image-outline", label: "Photo", color: "#22C55E" },
            { icon: "videocam-outline", label: "Vidéo", color: "#3B82F6" },
            { icon: "document-outline", label: "Fichier", color: "#8B5CF6" },
            { icon: "location-outline", label: "Lieu", color: "#F97316" },
          ].map(a => (
            <TouchableOpacity key={a.icon} style={s.mediaBtn} activeOpacity={0.7}>
              <View style={[s.mediaBtnIcon, { backgroundColor: `${a.color}18` }]}>
                <Ionicons name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={s.mediaBtnLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  publishBtn: {
    backgroundColor: "#22C55E", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8,
  },
  publishBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12 },
  composerRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#22C55E",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  composerRight: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold", marginBottom: 6 },
  visibilityRow: { flexDirection: "row", gap: 6 },
  visBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB",
  },
  visBtnActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  visBtnText: { fontSize: 11, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold" },
  textArea: {
    fontSize: 17, color: "#111827", fontFamily: "Inter_400Regular",
    lineHeight: 26, minHeight: 180, textAlignVertical: "top",
  },
  charCount: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  mediaActions: {
    flexDirection: "row", gap: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: "#E5E7EB",
  },
  mediaBtn: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12 },
  mediaBtnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mediaBtnLabel: { fontSize: 11, color: "#6B7280", fontFamily: "Inter_400Regular" },
});
