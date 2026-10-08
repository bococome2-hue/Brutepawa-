import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const JOB_TYPES = ["CDI","CDD","Freelance","Stage","Alternance","Bénévolat"];
const SECTORS = ["Tech","Finance","Santé","Éducation","Commerce","Marketing","BTP","Agriculture","Autre"];

export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("CDI");
  const [sector, setSector] = useState("");
  const [salary, setSalary] = useState("");
  const [remote, setRemote] = useState(false);
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Erreur", "Titre requis."); return; }
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title.trim(), company, location, type, sector, salary, remote, description: desc }),
      });
      router.back();
    } catch { Alert.alert("Erreur", "Impossible de publier l'offre."); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <View style={[s.dot, { backgroundColor: "#EDE9FE" }]}>
            <Ionicons name="briefcase" size={18} color="#8B5CF6" />
          </View>
          <Text style={s.headerTitle}>Offre d'emploi</Text>
        </View>
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: "#8B5CF6" }, !title && { opacity: 0.5 }]} onPress={handleSave} disabled={saving || !title}>
          {saving ? <ActivityIndicator size={16} color="#FFFFFF" /> : <Text style={s.saveBtnText}>Publier</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {[
          { label: "Titre du poste *", value: title, onChange: setTitle, placeholder: "Ex: Développeur Full-Stack" },
          { label: "Entreprise", value: company, onChange: setCompany, placeholder: "Nom de l'entreprise" },
          { label: "Localisation", value: location, onChange: setLocation, placeholder: "Ex: Dakar, Abidjan, Paris..." },
        ].map(f => (
          <View key={f.label} style={s.card}>
            <Text style={s.label}>{f.label}</Text>
            <TextInput style={s.input} value={f.value} onChangeText={f.onChange} placeholder={f.placeholder} placeholderTextColor="#9CA3AF" />
          </View>
        ))}

        <View style={s.card}>
          <Text style={s.label}>Type de contrat</Text>
          <View style={s.chipGrid}>
            {JOB_TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.chip, type === t && s.chipActive]} onPress={() => setType(t)}>
                <Text style={[s.chipText, type === t && { color: "#FFFFFF" }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <View style={s.remoteRow}>
            <View>
              <Text style={s.label}>Télétravail</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Poste 100% à distance</Text>
            </View>
            <Switch value={remote} onValueChange={setRemote} trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Salaire (optionnel)</Text>
          <TextInput style={s.input} value={salary} onChangeText={setSalary} placeholder="Ex: 500 000 XOF/mois" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={s.card}>
          <Text style={s.label}>Secteur</Text>
          <View style={s.chipGrid}>
            {SECTORS.map(sec => (
              <TouchableOpacity key={sec} style={[s.chip, sector === sec && s.chipActive]} onPress={() => setSector(sec)}>
                <Text style={[s.chipText, sector === sec && { color: "#FFFFFF" }]}>{sec}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Description du poste</Text>
          <TextInput
            style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
            value={desc} onChangeText={setDesc}
            placeholder="Responsabilités, qualifications, avantages..." placeholderTextColor="#9CA3AF" multiline
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
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#374151", fontFamily: "Inter_500Medium" },
  remoteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
