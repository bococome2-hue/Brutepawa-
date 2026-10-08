import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const EMOJIS = ["📢","🔔","⚡","🌟","💫","🎯","🚀","🌍","💚","🏆","🎵","📱","💼","🛍️","📰","🌿","🔥","❤️","🎉","🦁"];
const COLORS = ["#22C55E","#8B5CF6","#3B82F6","#EF4444","#F97316","#EAB308","#EC4899","#06B6D4","#14B8A6","#F59E0B"];

export default function RenameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📢");
  const [color, setColor] = useState("#22C55E");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/api/broadcast/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(bc => {
        if (bc.name) setName(bc.name);
        if (bc.emoji) setEmoji(bc.emoji);
        if (bc.color) setColor(bc.color);
      })
      .catch(() => {});
  }, [id, token]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Erreur", "Le nom est requis."); return; }
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/broadcast/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), emoji, color }),
      });
      router.back();
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" emoji={emoji} color={color} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={[s.avatarCircle, { backgroundColor: color }]}>
            <Text style={s.avatarEmoji}>{emoji}</Text>
          </View>
          <TouchableOpacity style={s.cameraBtn}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
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
              autoFocus
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
                style={[s.emojiBtn, emoji === e && { backgroundColor: "#DCFCE7", borderColor: "#22C55E", borderWidth: 2 }]}
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

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveBtnText}>Enregistrer</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginBottom: 8 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 44 },
  cameraBtn: {
    position: "absolute", bottom: 0, right: "32%",
    width: 30, height: 30, borderRadius: 15, backgroundColor: "#6B7280",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1, fontSize: 16, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium",
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  counter: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  saveBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
