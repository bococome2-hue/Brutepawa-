import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import BroadcastHeader from "@/components/BroadcastHeader";

export default function SecurityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pinEnabled, setPinEnabled] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const rows = [
    {
      icon: "lock-closed-outline", label: "PIN de diffusion", sub: "Protéger la liste avec un code PIN",
      value: pinEnabled, onChange: (v: boolean) => {
        setPinEnabled(v);
        if (!v) setPin("");
      },
    },
    {
      icon: "shield-checkmark-outline", label: "Double authentification", sub: "Sécurité renforcée 2FA",
      value: twoFactor, onChange: setTwoFactor,
    },
  ];

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="Sécurité" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.card}>
          {rows.map((row, idx) => (
            <React.Fragment key={row.label}>
              <View style={s.row}>
                <View style={s.rowIcon}>
                  <Ionicons name={row.icon as any} size={20} color="#22C55E" />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.rowLabel}>{row.label}</Text>
                  <Text style={s.rowSub}>{row.sub}</Text>
                </View>
                <Switch
                  value={row.value}
                  onValueChange={row.onChange}
                  trackColor={{ false: "#E5E7EB", true: "#22C55E" }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {idx < rows.length - 1 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>

        {/* PIN input */}
        {pinEnabled && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>CODE PIN (4 chiffres)</Text>
            <View style={s.pinRow}>
              <TextInput
                style={s.pinInput}
                value={pin}
                onChangeText={t => setPin(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry={!showPin}
                placeholder="• • • •"
                placeholderTextColor="#9CA3AF"
                maxLength={4}
              />
              <TouchableOpacity onPress={() => setShowPin(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPin ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.savePin, pin.length !== 4 && s.savePinDisabled]}
              disabled={pin.length !== 4}
              onPress={() => Alert.alert("PIN enregistré", "Votre code PIN a été mis à jour.")}
            >
              <Text style={s.savePinText}>Enregistrer le PIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Audit log section */}
        <Text style={s.sectionTitle}>JOURNAL D'AUDIT</Text>
        <View style={s.card}>
          {[
            { icon: "log-in-outline", label: "Connexion réussie", time: "Il y a 2 heures" },
            { icon: "person-add-outline", label: "Membre ajouté", time: "Il y a 1 jour" },
            { icon: "settings-outline", label: "Paramètres modifiés", time: "Il y a 3 jours" },
          ].map((log, idx) => (
            <React.Fragment key={log.label + idx}>
              <View style={s.logRow}>
                <View style={s.logIcon}>
                  <Ionicons name={log.icon as any} size={18} color="#22C55E" />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.logLabel}>{log.label}</Text>
                  <Text style={s.rowSub}>{log.time}</Text>
                </View>
              </View>
              {idx < 2 && <View style={s.sep} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginLeft: 4 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#111827", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 66 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", fontFamily: "Inter_600SemiBold", padding: 16, paddingBottom: 8 },
  pinRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  pinInput: {
    flex: 1, fontSize: 24, fontWeight: "700", color: "#111827", fontFamily: "Inter_700Bold",
    letterSpacing: 12, paddingVertical: 12,
  },
  eyeBtn: { padding: 8 },
  savePin: {
    margin: 16, marginTop: 8, backgroundColor: "#22C55E", borderRadius: 14, paddingVertical: 12, alignItems: "center",
  },
  savePinDisabled: { backgroundColor: "#A7F3D0" },
  savePinText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  logRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  logIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  logLabel: { fontSize: 14, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
});
