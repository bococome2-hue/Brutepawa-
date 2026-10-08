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

const C = { bg: "#F8FAFC", card: "#FFFFFF", primary: "#F97316", text: "#111827", textSec: "#6B7280", border: "#E5E7EB" };

const CATEGORIES = ["Électronique","Mode","Maison","Alimentation","Automobile","Sport","Beauté","Livres","Autre"];

export default function CreateProductScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !price.trim()) { Alert.alert("Erreur", "Titre et prix requis."); return; }
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title.trim(), price: parseFloat(price), currency, description: desc, category }),
      });
      router.back();
    } catch { Alert.alert("Erreur", "Impossible de créer le produit."); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <View style={[s.dot, { backgroundColor: "#FFEDD5" }]}>
            <Ionicons name="bag-handle" size={18} color="#F97316" />
          </View>
          <Text style={s.headerTitle}>Vendre un produit</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: "#F97316" }, (!title || !price) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving || !title || !price}
        >
          {saving ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Text style={s.saveBtnText}>Publier</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Photo upload */}
        <TouchableOpacity style={s.photoUpload} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
          <Text style={s.photoText}>Ajouter des photos</Text>
          <Text style={s.photoSub}>PNG, JPG jusqu'à 10 MB</Text>
        </TouchableOpacity>

        {/* Fields */}
        <View style={s.card}>
          <Text style={s.label}>Titre du produit *</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Ex: iPhone 14 Pro Max" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={s.card}>
          <Text style={s.label}>Prix *</Text>
          <View style={s.priceRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={price}
              onChangeText={p => setPrice(p.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={s.currencyBtn}
              onPress={() => setCurrency(c => c === "XOF" ? "EUR" : c === "EUR" ? "USD" : "XOF")}
            >
              <Text style={s.currencyText}>{currency}</Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Catégorie</Text>
          <View style={s.chipGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, category === cat && s.chipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, category === cat && { color: "#FFFFFF" }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { minHeight: 100, textAlignVertical: "top" }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Décrivez votre produit..."
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerMid: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12 },
  photoUpload: {
    height: 160, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 2,
    borderColor: "#E5E7EB", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6,
  },
  photoText: { fontSize: 15, fontWeight: "600", color: "#374151", fontFamily: "Inter_600SemiBold" },
  photoSub: { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { fontSize: 16, color: "#111827", fontFamily: "Inter_400Regular", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  priceRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  currencyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F1F5F9" },
  currencyText: { fontSize: 14, fontWeight: "600", color: "#374151", fontFamily: "Inter_600SemiBold" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#374151", fontFamily: "Inter_500Medium" },
});
