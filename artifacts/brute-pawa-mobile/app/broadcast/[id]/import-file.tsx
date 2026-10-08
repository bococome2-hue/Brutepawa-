import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

type FileFormat = { key: string; label: string; sub: string; icon: string; color: string; bg: string; };
const FORMATS: FileFormat[] = [
  { key: "csv",  label: "Fichier CSV",   sub: "Séparateur virgule ou point-virgule", icon: "list-outline",          color: "#3B82F6", bg: "#EFF6FF" },
  { key: "xlsx", label: "Fichier Excel", sub: "Format .xlsx ou .xls",               icon: "grid-outline",           color: "#22C55E", bg: "#F0FDF4" },
  { key: "txt",  label: "Fichier TXT",   sub: "Un contact par ligne",                icon: "document-text-outline",  color: "#6B7280", bg: "#F1F5F9" },
  { key: "vcf",  label: "Fichier VCF",   sub: "Format vCard standard",               icon: "person-outline",         color: "#8B5CF6", bg: "#F5F3FF" },
];

export default function ImportFileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState<string | null>(null);

  const handleImport = () => {
    if (!selected) { Alert.alert("Sélectionner", "Choisissez un format avant d'importer."); return; }
    Alert.alert("Importer", `Sélectionnez un fichier ${selected.toUpperCase()} depuis votre appareil.`);
  };

  return (
    <View style={s.root}>
      <BroadcastHeader title="Importer depuis un fichier" subtitle="CSV, Excel ou TXT" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
          <Text style={s.infoText}>
            Le fichier doit contenir au minimum : nom, prénom, numéro de téléphone ou email.
          </Text>
        </View>

        {/* Format selection */}
        <Text style={s.sectionTitle}>FORMAT DU FICHIER</Text>
        <View style={s.card}>
          {FORMATS.map((fmt, idx) => (
            <React.Fragment key={fmt.key}>
              <TouchableOpacity
                style={[s.row, selected === fmt.key && { backgroundColor: fmt.bg }]}
                onPress={() => setSelected(fmt.key)}
                activeOpacity={0.7}
              >
                <View style={[s.icon, { backgroundColor: selected === fmt.key ? fmt.bg : "#F8FAFC" }]}>
                  <Ionicons name={fmt.icon as any} size={20} color={fmt.color} />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>{fmt.label}</Text>
                  <Text style={s.rowSub}>{fmt.sub}</Text>
                </View>
                {selected === fmt.key && (
                  <View style={[s.check, { backgroundColor: fmt.color }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              {idx < FORMATS.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity style={s.importBtn} onPress={handleImport} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
          <Text style={s.importBtnText}>Sélectionner un fichier</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.downloadTemplate} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={18} color="#22C55E" />
          <Text style={s.downloadTemplateText}>Télécharger un modèle</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: "#3B82F6",
  },
  infoText: { flex: 1, fontSize: 13, color: "#1D4ED8", fontFamily: "Inter_400Regular", lineHeight: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginLeft: 4 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 66 },
  importBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#22C55E", borderRadius: 20, paddingVertical: 15,
  },
  importBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  downloadTemplate: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 20, paddingVertical: 14, borderWidth: 1.5, borderColor: "#22C55E",
  },
  downloadTemplateText: { fontSize: 14, fontWeight: "600", color: "#22C55E", fontFamily: "Inter_600SemiBold" },
});
