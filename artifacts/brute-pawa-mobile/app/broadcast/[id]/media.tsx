import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import BroadcastHeader from "@/components/BroadcastHeader";

const W = Dimensions.get("window").width;
const IMG_SIZE = (W - 4) / 3;

type MediaTab = "Photos" | "Vidéos" | "Audios" | "Docs" | "Liens";
const TABS: MediaTab[] = ["Photos", "Vidéos", "Audios", "Docs", "Liens"];

interface MediaItem { id: number; url: string; mediaType: string; size?: number; }

const PLACEHOLDER_COLORS = [
  "#22C55E","#3B82F6","#F97316","#8B5CF6","#EF4444","#EAB308",
  "#06B6D4","#14B8A6","#EC4899","#84CC16","#6366F1","#F59E0B",
];

export default function MediaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [tab, setTab] = useState<MediaTab>("Photos");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const typeMap: Record<MediaTab, string> = {
    Photos: "image", Vidéos: "video", Audios: "audio", Docs: "document", Liens: "link",
  };

  useEffect(() => {
    setLoading(true);
    fetch(
      `${API_BASE_URL}/api/broadcast/${id}/media?type=${typeMap[tab]}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d.media) ? d.media : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [id, tab, token]);

  const placeholderItems = Array.from({ length: 18 }, (_, i) => ({ id: -(i + 1), url: "", mediaType: "image" }));
  const displayItems = items.length > 0 ? items : placeholderItems;

  return (
    <View style={s.root}>
      <BroadcastHeader title="Nouvelle diffusion" subtitle="Médias partagés" />

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.tab, tab === item && s.tabActive]}
              onPress={() => setTab(item)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, tab === item && s.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color="#22C55E" /></View>
      ) : tab === "Photos" || tab === "Vidéos" ? (
        <FlatList
          data={displayItems}
          keyExtractor={item => String(item.id)}
          numColumns={3}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={s.photoCell} activeOpacity={0.8}>
              <View style={[s.photo, { backgroundColor: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length] }]}>
                {tab === "Vidéos" && (
                  <View style={s.playIcon}>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={s.footer}>
              <Text style={s.footerText}>{displayItems.length} {tab.toLowerCase()}</Text>
            </View>
          }
        />
      ) : (
        <View style={s.listWrap}>
          {tab === "Liens" ? (
            <View style={s.empty}>
              <Ionicons name="link-outline" size={40} color="#D1D5DB" />
              <Text style={s.emptyText}>Aucun lien partagé</Text>
            </View>
          ) : (
            <View style={s.empty}>
              <Ionicons
                name={tab === "Audios" ? "musical-notes-outline" : "document-outline"}
                size={40} color="#D1D5DB"
              />
              <Text style={s.emptyText}>Aucun fichier trouvé</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  tabsWrap: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabActive: { backgroundColor: "#22C55E" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280", fontFamily: "Inter_500Medium" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "700", fontFamily: "Inter_700Bold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  photoCell: { width: IMG_SIZE, height: IMG_SIZE, padding: 1 },
  photo: { flex: 1, alignItems: "center", justifyContent: "center" },
  playIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  footer: { padding: 16, alignItems: "center" },
  footerText: { fontSize: 13, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  listWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
});
