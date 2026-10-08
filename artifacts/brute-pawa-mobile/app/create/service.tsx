import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const CATEGORIES = ["Développement","Design","Marketing","Rédaction","Traduction","Comptabilité","Juridique","Coaching","Autre"];
const DELIVERY = ["1 jour","3 jours","1 semaine","2 semaines","1 mois"];

export default function CreateServiceScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [delivery, setDelivery] = useState("3 jours");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Erreur", "Titre requis."); return; }
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/marketplace/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title.trim(), price: price ? parseFloat(price) : null, description: desc, category, deliveryDays: delivery }),
      });
      router.back();
    } catch { Alert.alert("Erreur", "Impossible de créer le service."); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <View style={[s.dot, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="construct" size={18} color="#3B82F6" />
          </View>
          <Text style={s.headerTitle}>Publier un service</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: "#3B82F6" }, !title && { opacity: 0.5 }]}
          onPress={handleSave} disabled={saving || !title}
        >
          {saving ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Text style={s.saveBtnText}>Publier</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.label}>Titre du service *</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Ex: Je développe votre app mobile" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={s.card}>
          <Text style={s.label}>À partir de (prix)</Text>
          <View style={s.priceRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={price}
              onChangeText={p => setPrice(p.replace(/[^0-9.]/g, ""))}
              placeholder="0 XOF"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <View style={s.xof}>
              <Text style={s.xofText}>XOF</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Délai de livraison</Text>
          <View style={s.chipGrid}>
            {DELIVERY.map(d => (
              <TouchableOpacity
                key={d}
                style={[s.chip, delivery === d && s.chipActive]}
                onPress={() => setDelivery(d)}
              >
                <Text style={[s.chipText, delivery === d && { color: "#FFFFFF" }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Catégorie</Text>
          <View style={s.chipGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[s.chip, category === cat && s.chipActive]} onPress={() => setCategory(cat)}>
                <Text style={[s.chipText, category === cat && { color: "#FFFFFF" }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
            value={desc} onChangeText={setDesc}
            placeholder="Décrivez votre service, votre expérience..." placeholderTextColor="#9CA3AF" multiline
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerMid: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { fontSize: 16, color: "#111827", fontFamily: "Inter_400Regular", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  priceRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  xof: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F1F5F9" },
  xofText: { fontSize: 14, fontWeight: "600", color: "#374151", fontFamily: "Inter_600SemiBold" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#374151", fontFamily: "Inter_500Medium" },
});
