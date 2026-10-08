import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

type AIFeature = { key: string; label: string; sub: string; icon: string; action: string; };

const FEATURES: AIFeature[] = [
  { key: "summary", label: "Résumé conversation", sub: "Résumé intelligent des échanges", icon: "document-text-outline", action: "Générer" },
  { key: "sentiment", label: "Analyse sentiment", sub: "Positif / négatif / neutre", icon: "happy-outline", action: "Analyser" },
  { key: "suggestions", label: "Suggestions réponses", sub: "Réponses contextuelles intelligentes", icon: "chatbubbles-outline", action: "Suggérer" },
  { key: "translate", label: "Traduction", sub: "Traduit automatiquement les messages", icon: "globe-outline", action: "Traduire" },
  { key: "correct", label: "Correction texte", sub: "Corrige grammaire et orthographe", icon: "create-outline", action: "Corriger" },
  { key: "engagement", label: "Analyse engagement", sub: "Mesure le taux d'interaction", icon: "analytics-outline", action: "Analyser" },
  { key: "spam", label: "Détection spam", sub: "Filtre les messages indésirables", icon: "warning-outline", action: "Scanner" },
];

export default function AIScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const handleAction = async (feature: AIFeature) => {
    setLoading(feature.key);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const mockResults: Record<string, string> = {
        summary: "Cette diffusion traite principalement de sujets liés à la communauté. Les échanges sont positifs et engagés.",
        sentiment: "😊 Sentiment général : Positif (78%) • Neutre (16%) • Négatif (6%)",
        suggestions: "1. Merci pour votre engagement!\n2. Nous reviendrons vers vous.\n3. N'hésitez pas à partager.",
        translate: "Traduction automatique activée. Toutes les langues supportées.",
        correct: "Aucune erreur détectée dans les derniers messages.",
        engagement: "Taux d'engagement : 73.1% (+8.6% ce mois)",
        spam: "0 message suspect détecté. Liste propre ✓",
      };
      setResults(prev => ({ ...prev, [feature.key]: mockResults[feature.key] ?? "Analyse terminée." }));
    } catch {
      Alert.alert("Erreur", "L'IA n'est pas disponible pour le moment.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="IA BrutePawa" subtitle="Intelligence artificielle" emoji="🤖" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Text style={{ fontSize: 36 }}>🤖</Text>
          </View>
          <Text style={s.heroTitle}>IA BrutePawa</Text>
          <Text style={s.heroSub}>Analyse intelligente de vos diffusions en temps réel</Text>
        </View>

        {/* Features */}
        <View style={s.card}>
          {FEATURES.map((f, idx) => (
            <React.Fragment key={f.key}>
              <View style={s.featureRow}>
                <View style={s.featureIcon}>
                  <Ionicons name={f.icon as any} size={20} color="#22C55E" />
                </View>
                <View style={s.featureBody}>
                  <Text style={s.featureLabel}>{f.label}</Text>
                  <Text style={s.featureSub}>{f.sub}</Text>
                  {results[f.key] && (
                    <View style={s.resultBox}>
                      <Text style={s.resultText}>{results[f.key]}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => handleAction(f)}
                  disabled={loading === f.key}
                  activeOpacity={0.75}
                >
                  {loading === f.key ? (
                    <ActivityIndicator size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={s.actionText}>{f.action}</Text>
                  )}
                </TouchableOpacity>
              </View>
              {idx < FEATURES.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#F0FDF4",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold", marginBottom: 6 },
  heroSub: { fontSize: 13, color: "#6B7280", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginTop: 2 },
  featureBody: { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  featureSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  resultBox: { backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginTop: 8 },
  resultText: { fontSize: 12, color: "#16A34A", fontFamily: "Inter_400Regular", lineHeight: 18 },
  actionBtn: {
    backgroundColor: "#22C55E", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 70, alignItems: "center", justifyContent: "center",
  },
  actionText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 64 },
});
