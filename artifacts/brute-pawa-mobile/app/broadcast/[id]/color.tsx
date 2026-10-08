import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const PALETTE = [
  { name: "Vert BrutePawa", value: "#22C55E" },
  { name: "Vert foncé",     value: "#16A34A" },
  { name: "Bleu",           value: "#3B82F6" },
  { name: "Violet",         value: "#8B5CF6" },
  { name: "Rouge",          value: "#EF4444" },
  { name: "Orange",         value: "#F97316" },
  { name: "Jaune",          value: "#EAB308" },
  { name: "Rose",           value: "#EC4899" },
  { name: "Cyan",           value: "#06B6D4" },
  { name: "Turquoise",      value: "#14B8A6" },
  { name: "Indigo",         value: "#6366F1" },
  { name: "Noir",           value: "#111827" },
];

export default function ColorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [selected, setSelected] = useState("#22C55E");

  const handleSave = async () => {
    await fetch(`${API_BASE_URL}/api/broadcast/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ color: selected }),
    }).catch(() => {});
    router.back();
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Couleur de la liste" color={selected} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Preview */}
        <View style={[s.preview, { backgroundColor: selected }]}>
          <Text style={s.previewText}>Aperçu</Text>
        </View>

        {/* Palette */}
        <View style={s.card}>
          <Text style={s.label}>Choisir une couleur</Text>
          <View style={s.grid}>
            {PALETTE.map(c => (
              <TouchableOpacity
                key={c.value}
                style={s.colorItem}
                onPress={() => setSelected(c.value)}
                activeOpacity={0.8}
              >
                <View style={[s.circle, { backgroundColor: c.value }, selected === c.value && s.circleSelected]}>
                  {selected === c.value && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                </View>
                <Text style={s.colorName}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: selected }]} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  preview: {
    height: 100, borderRadius: 20, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  previewText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  colorItem: { alignItems: "center", gap: 6, width: 70 },
  circle: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  circleSelected: { borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  colorName: { fontSize: 10, color: "#6B7280", fontFamily: "Inter_400Regular", textAlign: "center" },
  saveBtn: { borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
