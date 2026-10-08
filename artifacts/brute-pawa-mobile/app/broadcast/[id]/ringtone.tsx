import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Svg, { Rect } from "react-native-svg";
import BroadcastHeader from "@/components/BroadcastHeader";

type SoundOption = { key: string; label: string; };
const OPTIONS: SoundOption[] = [
  { key: "brutepawa", label: "Son BrutePawa" },
  { key: "system", label: "Son système" },
  { key: "custom", label: "Son personnalisé" },
  { key: "none", label: "Aucun son" },
];

const WAVEFORM = [14,22,8,30,18,40,12,36,20,44,16,38,10,32,24,46,14,28,8,42,20,34,18,40,12,30,22,44,16,36];

export default function RingtoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState("brutepawa");
  const [volume, setVolume] = useState(0);

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="1 destinataire · Liste de diffusion" />

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
                {selected === opt.key && (
                  <Ionicons name="checkmark" size={20} color="#22C55E" />
                )}
              </TouchableOpacity>
              {idx < OPTIONS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        {/* Waveform preview */}
        {selected !== "none" && (
          <View style={s.waveCard}>
            <Svg width="100%" height={56} viewBox={`0 0 ${WAVEFORM.length * 10} 56`}>
              {WAVEFORM.map((h, i) => (
                <Rect
                  key={i}
                  x={i * 10 + 2}
                  y={(56 - h) / 2}
                  width={6}
                  height={h}
                  rx={3}
                  fill="#22C55E"
                  opacity={0.7 + (i % 3) * 0.1}
                />
              ))}
            </Svg>
            <View style={s.waveTimeRow}>
              <Text style={s.waveTime}>0:00</Text>
              <Text style={s.waveTime}>0:30</Text>
            </View>

            {/* Volume */}
            <View style={s.volumeRow}>
              <Ionicons name="volume-low-outline" size={20} color="#6B7280" />
              <View style={s.volumeTrack}>
                <View style={[s.volumeFill, { width: `${volume}%` }]} />
                <View style={[s.volumeThumb, { left: `${volume}%` }]} />
              </View>
              <Text style={s.volumeLabel}>{volume.toString().padStart(2, "0")}%</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={s.testBtn}
          activeOpacity={0.85}
          onPress={() => setVolume(Math.min(100, volume + 20))}
        >
          <Ionicons name="play-outline" size={20} color="#22C55E" />
          <Text style={s.testBtnText}>Tester la sonnerie</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.saveBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
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
  waveCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  waveTimeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 16 },
  waveTime: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  volumeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  volumeTrack: {
    flex: 1, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2,
    position: "relative", justifyContent: "center",
  },
  volumeFill: { height: 4, backgroundColor: "#22C55E", borderRadius: 2, position: "absolute", left: 0 },
  volumeThumb: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#22C55E",
    position: "absolute", marginLeft: -9,
    shadowColor: "#22C55E", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
  },
  volumeLabel: { fontSize: 13, color: "#6B7280", fontFamily: "Inter_400Regular", minWidth: 30 },
  testBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderRadius: 20, paddingVertical: 15, borderWidth: 1.5, borderColor: "#22C55E",
    backgroundColor: "#FFFFFF",
  },
  testBtnText: { fontSize: 15, fontWeight: "600", color: "#22C55E", fontFamily: "Inter_600SemiBold" },
  saveBtn: { backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
