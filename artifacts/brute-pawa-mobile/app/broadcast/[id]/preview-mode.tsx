import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type PreviewOption = { key: string; label: string; };
const OPTIONS: PreviewOption[] = [
  { key: "hidden", label: "Masqué" },
  { key: "name_only", label: "Nom uniquement" },
  { key: "name_preview", label: "Nom + aperçu" },
  { key: "full", label: "Message complet" },
];

export default function PreviewModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState("name_preview");
  const [hiddenOnLock, setHiddenOnLock] = useState(false);

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

          {/* Separator */}
          <View style={s.sep} />

          {/* Masqué sur verrouillé */}
          <View style={s.row}>
            <View style={{ width: 22 }} />
            <Text style={[s.rowLabel, { color: "#6B7280" }]}>Masqué sur verrouillé</Text>
            <Switch
              value={hiddenOnLock}
              onValueChange={setHiddenOnLock}
              trackColor={{ false: "#E5E7EB", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Preview bubble */}
        <View style={s.previewCard}>
          <Text style={s.previewLabel}>Aperçu</Text>
          <View style={s.bubble}>
            <Text style={s.bubbleHeader}>
              {selected === "hidden" ? "Nouveau message" :
               selected === "name_only" ? "Marie Dupont" :
               selected === "name_preview" ? "Marie Dupont: Bonjour, comment…" :
               "Marie Dupont: Bonjour, comment allez-vous aujourd'hui ?"}
            </Text>
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
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  previewLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  bubble: {
    backgroundColor: "#F1F5F9", borderRadius: 16, padding: 14,
    borderTopLeftRadius: 4,
  },
  bubbleHeader: { fontSize: 14, color: "#111827", fontFamily: "Inter_400Regular", lineHeight: 20 },
  saveBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
