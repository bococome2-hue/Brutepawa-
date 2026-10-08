import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const C = {
  bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", primaryDark: "#16A34A",
  text: "#111827", textSec: "#6B7280", border: "#E5E7EB", inputBg: "#F1F5F9",
};

const EMOJIS = ["📢","🔔","⚡","🌟","💫","🎯","🚀","🌍","💚","🏆","🎵","📱","💼","🛍️","📰","🌿","🔥","❤️","🎉","🦁"];
const COLORS = ["#22C55E","#8B5CF6","#3B82F6","#EF4444","#F97316","#EAB308","#EC4899","#06B6D4","#14B8A6","#F59E0B"];

export default function NewBroadcastScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📢");
  const [color, setColor] = useState("#22C55E");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Erreur", "Le nom est requis."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), emoji, color }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const bc = await res.json();
      router.replace(`/broadcast/${bc.id}` as any);
    } catch {
      Alert.alert("Erreur", "Impossible de créer la diffusion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Créer une diffusion</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Avatar preview */}
        <View style={s.avatarWrap}>
          <View style={[s.avatarCircle, { backgroundColor: color }]}>
            <Text style={s.avatarEmoji}>{emoji}</Text>
          </View>
          <View style={s.cameraBtn}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </View>

        {/* Nom */}
        <View style={s.card}>
          <Text style={s.label}>Nom de la liste</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={t => setName(t.slice(0, 50))}
              placeholder="Nouvelle diffusion"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />
            <Text style={s.counter}>{name.length}/50</Text>
          </View>
        </View>

        {/* Emoji */}
        <View style={s.card}>
          <Text style={s.label}>Emoji</Text>
          <View style={s.emojiGrid}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[s.emojiBtn, emoji === e && { backgroundColor: "#DCFCE7", borderColor: C.primary, borderWidth: 2 }]}
                onPress={() => setEmoji(e)}
              >
                <Text style={s.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Couleur */}
        <View style={s.card}>
          <Text style={s.label}>Couleur</Text>
          <View style={s.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorCircle, { backgroundColor: c }, color === c && s.colorSelected]}
                onPress={() => setColor(c)}
              >
                {color === c && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bouton */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: C.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginBottom: 8 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 44 },
  cameraBtn: {
    position: "absolute", bottom: 0, right: "30%",
    width: 30, height: 30, borderRadius: 15, backgroundColor: "#6B7280",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, fontSize: 16, fontWeight: "500", color: "#111827",
    fontFamily: "Inter_500Medium", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  counter: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  saveBtn: { borderRadius: 20, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
