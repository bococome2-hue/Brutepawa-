import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

const W = Dimensions.get("window").width;

const COVER_COLORS = [
  "#22C55E","#16A34A","#3B82F6","#8B5CF6","#EF4444",
  "#F97316","#EAB308","#EC4899","#06B6D4","#14B8A6",
  "#111827","#6B7280",
];

export default function CoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedColor, setSelectedColor] = useState("#22C55E");
  const [emoji, setEmoji] = useState("📢");

  return (
    <View style={s.root}>
      <BroadcastHeader title="Couverture de la liste" emoji={emoji} color={selectedColor} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Preview */}
        <View style={[s.preview, { backgroundColor: selectedColor }]}>
          <Text style={s.previewEmoji}>{emoji}</Text>
        </View>

        {/* Upload option */}
        <TouchableOpacity
          style={s.uploadBtn}
          onPress={() => Alert.alert("Photo", "Sélectionnez une photo depuis votre galerie.")}
          activeOpacity={0.8}
        >
          <Ionicons name="image-outline" size={22} color="#22C55E" />
          <Text style={s.uploadBtnText}>Choisir une photo</Text>
        </TouchableOpacity>

        {/* Color picker */}
        <View style={s.card}>
          <Text style={s.label}>Couleur de fond</Text>
          <View style={s.colorGrid}>
            {COVER_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorCircle, { backgroundColor: c }, selectedColor === c && s.colorSelected]}
                onPress={() => setSelectedColor(c)}
                activeOpacity={0.8}
              >
                {selectedColor === c && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={() => router.back()} activeOpacity={0.85}>
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
    width: "100%", height: 180, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  previewEmoji: { fontSize: 64 },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "#22C55E",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  uploadBtnText: { fontSize: 15, fontWeight: "600", color: "#22C55E", fontFamily: "Inter_600SemiBold" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.6 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  saveBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
