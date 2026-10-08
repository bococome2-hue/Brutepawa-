import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const C = {
  bg: "#F8FAFC", card: "#FFFFFF", primary: "#22C55E", text: "#111827",
  textSec: "#6B7280", border: "#E5E7EB", danger: "#EF4444",
};

interface BroadcastDetail {
  id: number; name: string; emoji: string; color: string;
  description?: string; recipientCount: number; updatedAt: string;
}

interface MenuItem {
  icon: string; label: string; subtitle?: string; route: string; danger?: boolean;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Liste",
    items: [
      { icon: "people-outline", label: "Destinataires", subtitle: "Gérer les membres", route: "members" },
      { icon: "person-add-outline", label: "Ajouter des destinataires", subtitle: "Ajouter depuis vos contacts", route: "members?mode=add" },
      { icon: "create-outline", label: "Renommer la liste", route: "rename" },
      { icon: "image-outline", label: "Couverture de la liste", route: "cover" },
      { icon: "color-palette-outline", label: "Couleur de la liste", route: "color" },
    ],
  },
  {
    title: "Contenu",
    items: [
      { icon: "images-outline", label: "Médias partagés", subtitle: "Photos, vidéos, documents", route: "media" },
      { icon: "search-outline", label: "Filtres avancés", subtitle: "Rechercher dans la liste", route: "filters" },
      { icon: "calendar-outline", label: "Recherche par date", route: "date-search" },
      { icon: "person-outline", label: "Recherche par auteur", route: "author-search" },
    ],
  },
  {
    title: "Notifications",
    items: [
      { icon: "notifications-outline", label: "Paramètres notifications", route: "notifications" },
      { icon: "musical-note-outline", label: "Sonnerie", route: "ringtone" },
      { icon: "phone-portrait-outline", label: "Vibration", route: "vibration" },
      { icon: "flag-outline", label: "Priorité", route: "priority" },
      { icon: "eye-outline", label: "Aperçu des messages", route: "preview-mode" },
    ],
  },
  {
    title: "Statistiques & IA",
    items: [
      { icon: "bar-chart-outline", label: "Statistiques", subtitle: "Taux de lecture, engagement", route: "stats" },
      { icon: "sparkles-outline", label: "IA BrutePawa", subtitle: "Résumé, analyse, suggestions", route: "ai" },
      { icon: "time-outline", label: "Journal d'activité", route: "activity-log" },
    ],
  },
  {
    title: "Import / Export",
    items: [
      { icon: "call-outline", label: "Importer depuis le téléphone", route: "import-phone" },
      { icon: "document-outline", label: "Importer depuis un fichier", route: "import-file" },
      { icon: "sync-outline", label: "Synchronisation contacts", route: "sync-contacts" },
      { icon: "download-outline", label: "Exporter", subtitle: "PDF, Excel, CSV, ZIP", route: "export" },
      { icon: "folder-outline", label: "Historique des exports", route: "export-history" },
    ],
  },
  {
    title: "Avancé",
    items: [
      { icon: "settings-outline", label: "Paramètres avancés", subtitle: "Réponses auto, mode entreprise", route: "advanced" },
      { icon: "cloud-outline", label: "Sauvegarde Cloud", route: "cloud-backup" },
      { icon: "lock-closed-outline", label: "Sécurité", subtitle: "PIN, double authentification", route: "security" },
    ],
  },
  {
    title: "Danger",
    items: [
      { icon: "trash-outline", label: "Effacer la conversation", route: "confirm-clear", danger: true },
      { icon: "close-circle-outline", label: "Supprimer la liste", route: "delete", danger: true },
    ],
  },
];

export default function BroadcastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [bc, setBc] = useState<BroadcastDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/api/broadcast/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(setBc)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, token]);

  const navigateTo = (route: string) => {
    if (route === "delete") {
      Alert.alert("Supprimer la liste ?", "Cette action est irréversible.", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive",
          onPress: async () => {
            await fetch(`${API_BASE_URL}/api/broadcast/${id}`, {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            router.replace("/(tabs)/diffusions" as any);
          },
        },
      ]);
      return;
    }
    const path = route.includes("?")
      ? `/broadcast/${id}/${route}`
      : `/broadcast/${id}/${route}`;
    router.push(path as any);
  };

  if (loading) return (
    <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );

  return (
    <View style={s.root}>
      <BroadcastHeader
        title={bc?.name ?? "Diffusion"}
        subtitle={`${bc?.recipientCount ?? 0} destinataire${(bc?.recipientCount ?? 0) !== 1 ? "s" : ""} · Liste de diffusion`}
        emoji={bc?.emoji ?? "📢"}
        color={bc?.color ?? C.primary}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={s.card}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={s.row}
                    onPress={() => navigateTo(item.route)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.rowIcon, { backgroundColor: item.danger ? "#FEE2E2" : "#F0FDF4" }]}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.danger ? C.danger : C.primary}
                      />
                    </View>
                    <View style={s.rowBody}>
                      <Text style={[s.rowLabel, item.danger && { color: C.danger }]}>{item.label}</Text>
                      {item.subtitle ? <Text style={s.rowSub}>{item.subtitle}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={s.sep} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll: { flex: 1 },
  content: { padding: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#111827", fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginTop: 2 },
  sep: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 64 },
});
