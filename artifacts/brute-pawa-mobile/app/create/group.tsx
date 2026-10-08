import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const CATEGORIES = ["Sport","Musique","Tech","Cuisine","Voyage","Business","Éducation","Art","Religion","Politique","Autre"];
const EMOJIS = ["👥","🌍","💼","🎵","⚽","🍽️","🎓","✈️","💡","🔥","🌿","🎯"];
const COLORS = ["#22C55E","#3B82F6","#8B5CF6","#F97316","#EF4444","#06B6D4","#F59E0B","#EC4899","#14B8A6","#6366F1"];

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [color, setColor] = useState("#22C55E");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Erreur", "Le nom est requis."); return; }
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: name.trim(), description: desc, category, emoji, color, isPrivate }),
      });
      router.back();
    } catch { Alert.alert("Erreur", "Impossible de créer le groupe."); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <View style={[s.dot, { backgroundColor: "#CFFAFE" }]}>
            <Ionicons name="people" size={18} color="#06B6D4" />
          </View>
          <Text style={s.headerTitle}>Créer un groupe</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: "#06B6D4" }, !name && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving || !name}
        >
          {saving ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Text style={s.saveBtnText}>Créer</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar preview */}
        <View style={s.avatarSection}>
          <View style={[s.avatarPreview, { backgroundColor: color }]}>
            <Text style={s.avatarEmoji}>{emoji}</Text>
          </View>
          <Text style={s.avatarHint}>Appuyez pour changer la photo</Text>
        </View>

        {/* Emoji picker */}
        <View style={s.card}>
          <Text style={s.label}>Emoji du groupe</Text>
          <View style={s.emojiGrid}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[s.emojiBtn, emoji === e && { backgroundColor: "#DCFCE7", borderColor: "#22C55E", borderWidth: 2 }]}
                onPress={() => setEmoji(e)}
                activeOpacity={0.7}
              >
                <Text style={s.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={s.card}>
          <Text style={s.label}>Couleur</Text>
          <View style={s.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorCircle, { backgroundColor: c }, color === c && s.colorSelected]}
                onPress={() => setColor(c)}
                activeOpacity={0.8}
              >
                {color === c && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name */}
        <View style={s.card}>
          <Text style={s.label}>Nom du groupe *</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={t => setName(t.slice(0, 50))}
              placeholder="Ex: Tech Africa 🚀"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
              autoFocus
            />
            <Text style={s.counter}>{name.length}/50</Text>
          </View>
        </View>

        {/* Description */}
        <View style={s.card}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="À propos de ce groupe..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
        </View>

        {/* Category */}
        <View style={s.card}>
          <Text style={s.label}>Catégorie</Text>
          <View style={s.chipGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, category === cat && s.chipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, category === cat && { color: "#FFFFFF" }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy */}
        <View style={s.card}>
          <View style={s.switchRow}>
            <View style={s.switchIcon}>
              <Ionicons name={isPrivate ? "lock-closed-outline" : "globe-outline"} size={20} color="#06B6D4" />
            </View>
            <View style={s.switchBody}>
              <Text style={s.switchLabel}>{isPrivate ? "Groupe privé" : "Groupe public"}</Text>
              <Text style={s.switchSub}>
                {isPrivate
                  ? "Sur invitation uniquement, contenu masqué"
                  : "Tout le monde peut rejoindre et voir"}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: "#E5E7EB", true: "#06B6D4" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerMid: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatarPreview: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  avatarEmoji: { fontSize: 42 },
  avatarHint: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 16, color: "#111827", fontFamily: "Inter_400Regular", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  counter: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#06B6D4", borderColor: "#06B6D4" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#374151", fontFamily: "Inter_500Medium" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#CFFAFE", alignItems: "center", justifyContent: "center" },
  switchBody: { flex: 1 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  switchSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
});
