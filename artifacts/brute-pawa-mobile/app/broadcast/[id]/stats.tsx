import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const W = Dimensions.get("window").width - 64;

type Period = "30J" | "60J" | "90J" | "1A" | "Tout";
const PERIODS: Period[] = ["30J", "60J", "90J", "1A", "Tout"];

interface Stats { sent: number; delivered: number; seen: number; openRate: number; engagementRate: number; }

const MOCK_CHART = [
  { label: "03/06", v1: 80, v2: 60 },
  { label: "12/06", v1: 140, v2: 110 },
  { label: "18/05", v1: 100, v2: 80 },
  { label: "24/05", v1: 160, v2: 130 },
  { label: "03/09", v1: 120, v2: 95 },
];

function StatCard({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: string }) {
  const positive = !delta.startsWith("-");
  return (
    <View style={sc.statCard}>
      <View style={sc.statIcon}>
        <Ionicons name={icon as any} size={22} color="#22C55E" />
      </View>
      <Text style={sc.statLabel}>{label}</Text>
      <Text style={sc.statValue}>{value}</Text>
      <View style={[sc.deltaBadge, positive ? sc.deltaPos : sc.deltaNeg]}>
        <Ionicons name={positive ? "trending-up" : "trending-down"} size={12} color={positive ? "#22C55E" : "#EF4444"} />
        <Text style={[sc.deltaText, { color: positive ? "#22C55E" : "#EF4444" }]}>{delta}</Text>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  statCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    alignItems: "flex-start",
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statLabel: { fontSize: 11, color: "#6B7280", fontFamily: "Inter_400Regular", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  deltaBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
  deltaPos: { backgroundColor: "#F0FDF4" },
  deltaNeg: { backgroundColor: "#FEF2F2" },
  deltaText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

function BarChart({ data }: { data: typeof MOCK_CHART }) {
  const chartH = 140;
  const barW = 16;
  const gap = (W - data.length * barW * 2) / (data.length + 1);
  const maxVal = Math.max(...data.map(d => Math.max(d.v1, d.v2)));
  const scale = (v: number) => (v / maxVal) * (chartH - 24);

  return (
    <Svg width={W} height={chartH + 20}>
      {/* Grid lines */}
      {[0, 1, 2, 3].map(i => (
        <Line
          key={i}
          x1={0} x2={W}
          y1={chartH - (chartH - 24) * (i / 3)}
          y2={chartH - (chartH - 24) * (i / 3)}
          stroke="#F1F5F9" strokeWidth={1}
        />
      ))}
      {data.map((d, i) => {
        const x = gap + i * (barW * 2 + gap);
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={chartH - scale(d.v1)} width={barW} height={scale(d.v1)} rx={4} fill="#22C55E" />
            <Rect x={x + barW + 2} y={chartH - scale(d.v2)} width={barW} height={scale(d.v2)} rx={4} fill="#86EFAC" />
            <SvgText x={x + barW} y={chartH + 16} fontSize={9} fill="#9CA3AF" textAnchor="middle" fontFamily="Inter_400Regular">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function StatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("30J");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({ sent: 1256, delivered: 1198, seen: 876, openRate: 73.1, engagementRate: 8.6 });

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/broadcast/${id}/info`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => {
        if (d.messageCount != null) setStats(prev => ({ ...prev, sent: d.messageCount }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, token, period]);

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="Statistiques" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[s.periodBtn, period === p && s.periodBtnActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[s.periodText, period === p && s.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stats grid */}
            <View style={s.gridRow}>
              <StatCard label="Messages envoyés" value={stats.sent.toLocaleString("fr")} delta="+12.5%" icon="send-outline" />
              <StatCard label="Messages livrés" value={stats.delivered.toLocaleString("fr")} delta="+10.3%" icon="checkmark-done-outline" />
            </View>
            <View style={s.gridRow}>
              <StatCard label="Messages lus" value={stats.seen.toLocaleString("fr")} delta="+9.8%" icon="eye-outline" />
              <StatCard label="Taux d'ouverture" value={`${stats.openRate}%`} delta="+8,6%" icon="bar-chart-outline" />
            </View>

            {/* Chart */}
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>Activité</Text>
              <View style={{ marginTop: 12, marginLeft: -8 }}>
                <BarChart data={MOCK_CHART} />
              </View>
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={s.legendText}>Envoyés</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: "#86EFAC" }]} />
                  <Text style={s.legendText}>Lus</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  periodRow: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  periodBtnActive: { backgroundColor: "#22C55E" },
  periodText: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold" },
  periodTextActive: { color: "#FFFFFF" },
  gridRow: { flexDirection: "row", gap: 10 },
  chartCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" },
});
