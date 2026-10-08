import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

const C = { bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", text: "#111827", textSec: "#6B7280", border: "#E5E7EB" };

type DateOption = {
  key: string;
  label: string;
  sub?: string;
};

const OPTIONS: DateOption[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "this_week", label: "Cette semaine" },
  { key: "7_days", label: "7 derniers jours" },
  { key: "30_days", label: "30 derniers jours" },
  { key: "this_month", label: "Ce mois-ci" },
  { key: "this_year", label: "Cette année" },
  { key: "custom", label: "Période personnalisée" },
];

export default function DateSearchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleApply = () => {
    router.back();
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Recherche par date" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.key}>
              <TouchableOpacity
                style={s.row}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.7}
              >
                <View style={s.radioOuter}>
                  {selected === opt.key && <View style={s.radioInner} />}
                </View>
                <Text style={s.rowLabel}>{opt.label}</Text>
                {selected === opt.key && <Ionicons name="checkmark" size={18} color="#22C55E" />}
              </TouchableOpacity>
              {idx < OPTIONS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        {/* Custom period inputs */}
        {selected === "custom" && (
          <View style={s.card}>
            <TouchableOpacity style={s.dateRow} activeOpacity={0.7}>
              <View style={s.dateIcon}>
                <Ionicons name="calendar-outline" size={18} color="#22C55E" />
              </View>
              <View style={s.dateBody}>
                <Text style={s.dateLabel}>Date début</Text>
                <Text style={s.datePlaceholder}>{startDate || "Sélectionner"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            <View style={s.sep} />
            <TouchableOpacity style={s.dateRow} activeOpacity={0.7}>
              <View style={s.dateIcon}>
                <Ionicons name="calendar-outline" size={18} color="#22C55E" />
              </View>
              <View style={s.dateBody}>
                <Text style={s.dateLabel}>Date fin</Text>
                <Text style={s.datePlaceholder}>{endDate || "Sélectionner"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[s.applyBtn, !selected && s.applyBtnDisabled]}
          onPress={handleApply}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={s.applyBtnText}>Appliquer le filtre</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#22C55E",
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  dateIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  dateBody: { flex: 1 },
  dateLabel: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular", marginBottom: 2 },
  datePlaceholder: { fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  applyBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 16, alignItems: "center" },
  applyBtnDisabled: { backgroundColor: "#A7F3D0" },
  applyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
