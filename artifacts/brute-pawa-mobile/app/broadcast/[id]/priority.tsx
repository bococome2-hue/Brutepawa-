import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type PriorityOption = {
  key: string; label: string; desc: string; icon: string; color: string; bg: string;
};

const OPTIONS: PriorityOption[] = [
  { key: "low", label: "Faible", desc: "Vous recevrez peu de notifications.", icon: "notifications-off-outline", color: "#6B7280", bg: "#F1F5F9" },
  { key: "normal", label: "Normale", desc: "Vous recevrez les notifications normalement.", icon: "notifications-outline", color: "#22C55E", bg: "#F0FDF4" },
  { key: "high", label: "Haute", desc: "Vous recevrez les notifications importantes.", icon: "notifications-outline", color: "#F97316", bg: "#FFF7ED" },
  { key: "urgent", label: "Urgente", desc: "Vous recevrez toutes les notifications immédiatement.", icon: "alert-circle-outline", color: "#EF4444", bg: "#FEF2F2" },
  { key: "silent", label: "Silencieuse", desc: "Aucune notification sonore.", icon: "volume-mute-outline", color: "#9CA3AF", bg: "#F9FAFB" },
];

export default function PriorityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState("normal");

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.key}>
              <TouchableOpacity
                style={[s.row, selected === opt.key && { backgroundColor: opt.bg }]}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: selected === opt.key ? opt.bg : "#F8FAFC", borderColor: opt.color, borderWidth: selected === opt.key ? 1 : 0 }]}>
                  <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                </View>
                <View style={s.rowBody}>
                  <Text style={[s.rowLabel, selected === opt.key && { color: opt.color, fontWeight: "700" }]}>{opt.label}</Text>
                  <Text style={s.rowDesc}>{opt.desc}</Text>
                </View>
                {selected === opt.key && (
                  <View style={[s.selectedDot, { backgroundColor: opt.color }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              {idx < OPTIONS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
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
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  rowDesc: { fontSize: 13, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 18 },
  selectedDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 74 },
  saveBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
