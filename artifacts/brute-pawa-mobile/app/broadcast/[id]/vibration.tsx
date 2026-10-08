import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type VibOption = { key: string; label: string; };
const OPTIONS: VibOption[] = [
  { key: "none", label: "Désactivée" },
  { key: "short", label: "Courte" },
  { key: "normal", label: "Normale" },
  { key: "long", label: "Longue" },
  { key: "custom", label: "Personnalisée" },
];

export default function VibrationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState("normal");

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.key}>
              <TouchableOpacity style={s.row} onPress={() => setSelected(opt.key)} activeOpacity={0.7}>
                <View style={s.radioOuter}>
                  {selected === opt.key && <View style={s.radioInner} />}
                </View>
                <Text style={s.rowLabel}>{opt.label}</Text>
                {selected === opt.key && <Ionicons name="checkmark" size={20} color="#22C55E" />}
              </TouchableOpacity>
              {idx < OPTIONS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        {/* Vibration pattern preview */}
        {selected !== "none" && (
          <View style={s.previewCard}>
            <View style={s.patternRow}>
              {(selected === "short"
                ? [1]
                : selected === "normal"
                ? [1, 0, 1]
                : selected === "long"
                ? [1, 0, 1, 0, 1]
                : [1, 0, 0, 1, 0, 1, 0, 0, 1]
              ).map((v, i) => (
                <View key={i} style={[s.patternBlock, v === 1 && s.patternActive]} />
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={s.testBtn} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
          <Text style={s.testBtnText}>Tester la vibration</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.saveBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#22C55E",
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 52 },
  previewCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  patternRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  patternBlock: {
    width: 32, height: 60, borderRadius: 8, backgroundColor: "#E5E7EB",
  },
  patternActive: { backgroundColor: "#22C55E" },
  testBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15,
  },
  testBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  saveBtn: {
    borderRadius: 20, paddingVertical: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF",
  },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold" },
});
