import { Ionicons } from "@expo/vector-icons";
import {
  getGetConversationQueryKey,
  getGetUserQueryKey,
  useGetConversation,
  useGetUser,
  useSendMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const AVATAR_COLORS = [
  "#22C55E","#EC4899","#8B5CF6","#D97706","#388E3C","#00838F","#D32F2F","#0EA5E9","#F59E0B",
];

type SharedLocation = {
  latitude: number;
  longitude: number;
  mapUrl: string;
};

function parseSharedLocation(content: string): SharedLocation | null {
  if (!content.startsWith("__location__:")) return null;
  const rest = content.slice("__location__:".length);
  const proto = rest.indexOf("://");
  const separator = rest.indexOf(":", proto !== -1 ? proto + 3 : 0);
  const storedUrl = separator === -1 ? "" : rest.slice(0, separator);
  const coordinates = separator === -1 ? rest : rest.slice(separator + 1);
  const [latitudeText, longitudeText] = coordinates.split(",");
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  const valid = Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;

  if (!valid) return null;
  return {
    latitude,
    longitude,
    mapUrl: storedUrl || `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
  };
}

/* ─────────────────────────────────────────────────────────────
   PIXEL NOISE DISINTEGRATION
   Telegram-style static effect before message disappears.
───────────────────────────────────────────────────────────── */
const STATIC_COLORS = [
  "#000000","#000000","#000000","#0a0a0a","#111111","#0d0d0d",
  "#1a1a1a","#222222","#050505","#181818","#080808","#2a2a2a",
  "#ffffff","#f5f5f5","#cccccc","#888888",
];
const PX = 8;

function PixelNoiseOverlay({
  width,
  height,
  onComplete,
}: {
  width: number;
  height: number;
  onComplete: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const cols = Math.ceil(width  / PX);
  const rows = Math.ceil(height / PX);

  const pixels = useMemo(() =>
    Array.from({ length: cols * rows }, (_, i) => ({
      key: i,
      left: (i % cols) * PX,
      top: Math.floor(i / cols) * PX,
      color: STATIC_COLORS[Math.floor(Math.random() * STATIC_COLORS.length)],
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cols, rows],
  );

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(opacity, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start(() => onCompleteRef.current());
  }, []); // eslint-disable-line

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { opacity, borderRadius: 18, overflow: "hidden" },
      ]}
      pointerEvents="none"
    >
      {pixels.map(px => (
        <View
          key={px.key}
          style={{
            position: "absolute",
            left: px.left,
            top: px.top,
            width: PX,
            height: PX,
            backgroundColor: px.color,
          }}
        />
      ))}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHAT SCREEN
───────────────────────────────────────────────────────────── */
export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [message, setMessage]  = useState("");
  const flatListRef = useRef<FlatList>(null);

  const [localDeleted, setLocalDeleted] = useState<Set<number>>(new Set());
  const [pixelMsgs, setPixelMsgs] = useState<Set<number>>(new Set());
  const bubbleSizes = useRef<Map<number, { width: number; height: number }>>(new Map());
  const [menuMsg, setMenuMsg] = useState<any | null>(null);

  const targetId = parseInt(userId ?? "0", 10);

  const otherUserQuery = useGetUser(targetId, {
    query: {
      enabled: targetId > 0,
      queryKey: getGetUserQueryKey(targetId),
    },
  });
  const otherUser      = otherUserQuery.data as any;
  const otherName      = otherUser
    ? `${otherUser.firstName ?? ""} ${otherUser.lastName ?? ""}`.trim() || `#${targetId}`
    : `Pat Pat`;
  const otherAvatar    = otherUser?.avatarUrl as string | null | undefined;
  const otherInitials  = otherName !== "…"
    ? otherName.split(" ").slice(0,2).map((w: string) => w[0] ?? "").join("").toUpperCase()
    : "PP";

  const messagesQuery = useGetConversation(targetId, {
    query: { queryKey: getGetConversationQueryKey(targetId) },
  });
  const rawMessages   = (messagesQuery.data ?? []) as any[];
  const realMessages  = rawMessages.filter(m => !localDeleted.has(m.id));

  const reversedData = [...realMessages].reverse();

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: messagesQuery.queryKey });
        setMessage("");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({ data: { toUserId: targetId, content: trimmed } });
  }, [message, targetId, sendMutation]);

  const handleLongPress = useCallback((msg: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenuMsg(msg);
  }, []);

  const handleDelete = useCallback(async (msg: any) => {
    setMenuMsg(null);
    setPixelMsgs(prev => { const s = new Set(prev); s.add(msg.id); return s; });
    if (token) {
      fetch(`${API_BASE_URL}/api/messages/${msg.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* silently ignore, local state is source of truth */});
    }
  }, [token]);

  const handlePixelComplete = useCallback((msgId: number) => {
    setPixelMsgs(prev => { const s = new Set(prev); s.delete(msgId); return s; });
    setLocalDeleted(prev => { const s = new Set(prev); s.add(msgId); return s; });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleCopy = useCallback(async (msg: any) => {
    setMenuMsg(null);
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(msg.content ?? "");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {/* ignore */}
  }, []);

  const openExternalUrl = useCallback(async (url: string, unavailableMessage: string) => {
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error("unsupported");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Action indisponible", unavailableMessage);
    }
  }, []);

  const handleViewLocation = useCallback(async (location: SharedLocation | null) => {
    if (!location) {
      Alert.alert("Position indisponible", "Ce message ne contient pas de coordonnées valides.");
      return;
    }
    const url = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`;
    await openExternalUrl(url, "Impossible d’ouvrir la carte pour le moment.");
  }, [openExternalUrl]);

  const handleDirections = useCallback(async (location: SharedLocation | null) => {
    if (!location) {
      Alert.alert("Itinéraire indisponible", "Ce message ne contient pas de coordonnées valides.");
      return;
    }

    try {
      let origin: { latitude: number; longitude: number };
      if (Platform.OS === "web") {
        origin = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("unsupported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            position => resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
            reject,
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
          );
        });
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Localisation nécessaire",
            permission.canAskAgain
              ? "Autorisez l’accès à votre position pour calculer l’itinéraire."
              : "L’accès à la localisation est bloqué. Vous pouvez l’activer dans les réglages de l’appareil.",
            permission.canAskAgain
              ? [{ text: "OK" }]
              : [
                  { text: "Annuler", style: "cancel" },
                  { text: "Ouvrir les réglages", onPress: () => Linking.openSettings().catch(() => undefined) },
                ],
          );
          return;
        }
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        origin = current.coords;
      }

      const destination = `${location.latitude},${location.longitude}`;
      const start = `${origin.latitude},${origin.longitude}`;
      const url = Platform.OS === "ios"
        ? `https://maps.apple.com/?saddr=${encodeURIComponent(start)}&daddr=${encodeURIComponent(destination)}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      await openExternalUrl(url, "Le service d’itinéraire est indisponible pour le moment.");
    } catch {
      Alert.alert(
        "Position actuelle indisponible",
        "Activez le GPS et autorisez BrutePawa à accéder à votre position pour obtenir l’itinéraire.",
      );
    }
  }, [openExternalUrl]);

  const handleShareLocation = useCallback(async (
    location: SharedLocation | null,
    senderName: string,
    sharedAt: string,
  ) => {
    if (!location) {
      Alert.alert("Partage indisponible", "Ce message ne contient pas de coordonnées valides.");
      return;
    }
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    const sharedTime = new Date(sharedAt).toLocaleString("fr-FR");
    const text = [
      "Position partagée",
      `Nom de la personne : ${senderName}`,
      `Localisation : ${location.latitude}, ${location.longitude}`,
      `Coordonnées : ${location.latitude}, ${location.longitude}`,
      `Partagée le : ${sharedTime}`,
      `Lien cartographique : ${mapUrl}`,
    ].join("\n");

    try {
      await Share.share({ title: "Position partagée", message: text, url: mapUrl });
    } catch {
      Alert.alert("Partage indisponible", "Impossible d’ouvrir le menu de partage pour le moment.");
    }
  }, []);

  function timeLabel(date: string) {
    const d = new Date(date);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const topPadding = isWeb ? 67 : Math.max(insets.top, 20);

  return (
    <View style={styles.root}>
      {/* ─── Full-screen background wallpaper ─── */}
      <Image source={require('@/assets/images/chat-wallpaper.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

      {/* ─── Absolute Background Watermark Texts ─── */}
      <View style={{ position: 'absolute', top: topPadding + 280, left: 32, zIndex: 0, width: 200 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#0F291E', letterSpacing: -1 }}>BrutePawa</Text>
        <Text style={{ fontSize: 16, color: '#1B5E3A', marginTop: 4, lineHeight: 20, fontWeight: '500' }}>Des connexions{'\n'}qui comptent</Text>
        <View style={{ width: 32, height: 3, backgroundColor: '#22C55E', marginTop: 16, borderRadius: 2 }} />

        <Text style={{ fontSize: 15, color: '#1B5E3A', fontStyle: 'italic', marginTop: 48, lineHeight: 22, fontWeight: '500' }}>
          "Des idées{'\n'}d'aujourd'hui,{'\n'}un meilleur{'\n'}demain."
        </Text>
      </View>

      {/* ─── Header & Profile Card Group ─── */}
      <View style={{ paddingTop: topPadding + 10, paddingHorizontal: 16, zIndex: 10 }}>
        {/* Floating Profile Card Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 16 }}>
            <Ionicons name="chevron-back" size={20} color="#111" />
          </TouchableOpacity>

          <View style={{
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 30,
            padding: 8,
            paddingRight: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
          }}>
            <View style={[styles.headerAvatar, { backgroundColor: AVATAR_COLORS[targetId % AVATAR_COLORS.length] }]}>
              {otherAvatar
                ? <Image source={{ uri: otherAvatar }} style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }] as any} resizeMode="cover" />
                : <Text style={[styles.headerAvatarText, { color: "#fff" }]}>{otherInitials}</Text>
              }
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: '#111' }} numberOfLines={1}>{otherName}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#22C55E" style={{ marginLeft: 4 }} />
              </View>
              <Text style={{ fontSize: 11, color: '#666', fontWeight: '500', marginTop: 1 }}>Hors ligne</Text>
              <Text style={{ fontSize: 11, color: '#666', fontWeight: '500' }}>Toujours plus loin 🚀</Text>

              <View style={{ flexDirection: 'row', marginTop: 4, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Ionicons name="star" size={10} color="#fff" />
                  <Text style={{ fontSize: 9, color: '#fff', marginLeft: 2, fontWeight: '700' }}>Premium</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Ionicons name="star" size={10} color="#555" />
                  <Text style={{ fontSize: 9, color: '#555', marginLeft: 2, fontWeight: '700' }}>Créateur</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity>
                <Ionicons name="call-outline" size={20} color="#15803D" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="videocam-outline" size={22} color="#15803D" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="ellipsis-vertical" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={reversedData}
          keyExtractor={item => String(item.id)}
          inverted
          renderItem={({ item, index }) => {
            const isMe = item.fromUserId === user?.id;
            const isAnimating = pixelMsgs.has(item.id);

            const currentDay = new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const nextItem = reversedData[index + 1];
            const nextDay = nextItem ? new Date(nextItem.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
            const showDatePill = currentDay !== nextDay;

            const sharedLocation = parseSharedLocation(item.content);
            const senderName = isMe
              ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Vous"
              : otherName;

            let CardComponent = null;
            if (item.content.startsWith("__location__:")) {
              CardComponent = (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, borderBottomRightRadius: 4, width: 280, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee' }}>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={require("@/assets/images/location-map-reference.png")}
                      style={{ width: "100%", height: 110 }}
                      resizeMode="cover"
                    />
                    <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }}>
                      <Ionicons name="location" size={14} color="#EF4444" />
                      <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 4, color: '#111' }}>Position partagée</Text>
                    </View>
                    <View style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }}>
                      <Ionicons name="navigate" size={14} color="#22C55E" style={{ transform: [{ rotate: '45deg' }] }} />
                    </View>
                  </View>

                  <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Ionicons name="location" size={16} color="#15803D" style={{ marginTop: 2 }} />
                      <View style={{ marginLeft: 6, flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>
                          {sharedLocation ? "Position partagée" : "Position indisponible"}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {sharedLocation
                            ? `${sharedLocation.latitude.toFixed(5)}, ${sharedLocation.longitude.toFixed(5)}`
                            : "Coordonnées invalides"}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' }}>
                        <Text style={{ fontSize: 10, color: '#666', marginRight: 4 }}>{timeLabel(item.createdAt)}</Text>
                        {isMe && <Ionicons name="checkmark-done" size={14} color="#22C55E" />}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                      <TouchableOpacity
                        onPress={() => handleViewLocation(sharedLocation)}
                        accessibilityRole="button"
                        accessibilityLabel="Voir la position sur la carte"
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Ionicons name="map-outline" size={16} color="#15803D" />
                        <Text style={{ fontSize: 12, color: '#15803D', marginLeft: 6, fontWeight: '600' }}>Voir sur la carte</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDirections(sharedLocation)}
                        accessibilityRole="button"
                        accessibilityLabel="Obtenir un itinéraire vers cette position"
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Ionicons name="navigate-outline" size={16} color="#111" />
                        <Text style={{ fontSize: 12, color: '#111', marginLeft: 6, fontWeight: '600' }}>Itinéraire</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShareLocation(sharedLocation, senderName, item.createdAt)}
                        accessibilityRole="button"
                        accessibilityLabel="Partager cette position"
                      >
                        <Ionicons name="share-outline" size={16} color="#111" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            } else if (item.content.includes('Binovex')) {
              CardComponent = (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, borderBottomRightRadius: 4, width: 280, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Image
                      source={require("@/assets/images/binovex-reference.png")}
                      style={{ width: 64, height: 64, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#111' }}>Binovex</Text>
                          <Ionicons name="checkmark-circle" size={14} color="#22C55E" style={{ marginLeft: 4 }} />
                        </View>
                        <Ionicons name="open-outline" size={16} color="#666" />
                      </View>
                      <Text style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 16 }}>Binovex — plateforme de réseau mobile.</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {['Simple', 'Sécurisé', 'Rapide'].map(tag => (
                          <View key={tag} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                            <Text style={{ fontSize: 10, color: '#15803D', marginLeft: 2, fontWeight: '600' }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, marginRight: 8 }}>
                      <Ionicons name="link" size={14} color="#15803D" />
                      <Text style={{ fontSize: 11, color: '#15803D', marginLeft: 6, flex: 1, fontWeight: '500' }} numberOfLines={1}>https://binovex.cc/register?ref=966N3WTB</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: '#666', marginRight: 4 }}>{timeLabel(item.createdAt)}</Text>
                      {isMe && <Ionicons name="checkmark-done" size={14} color="#22C55E" />}
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View>
                {showDatePill && (
                  <View style={{ alignSelf: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginVertical: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                    <Text style={{ fontSize: 12, color: '#555', fontWeight: '600' }}>{currentDay}</Text>
                  </View>
                )}
                <View style={[styles.msgRow, isMe ? styles.msgRight : styles.msgLeft]}>
                  <Pressable
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={350}
                  >
                    {CardComponent ? CardComponent : (
                      <View
                        style={[
                          styles.bubble,
                          isMe ? styles.bubbleMe : styles.bubbleOther,
                        ]}
                        onLayout={e => {
                          const { width, height } = e.nativeEvent.layout;
                          bubbleSizes.current.set(item.id, { width, height });
                        }}
                      >
                        <Text style={[styles.msgText, { color: isMe ? "#111" : "#111" }]}>
                          {item.content}
                        </Text>
                        <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                          <Text style={{ fontSize: 10, color: '#666', marginRight: 4 }}>{timeLabel(item.createdAt)}</Text>
                          {isMe && <Ionicons name="checkmark-done" size={14} color="#22C55E" />}
                        </View>

                        {/* ── Pixel noise overlay ── */}
                        {isAnimating && (() => {
                          const sz = bubbleSizes.current.get(item.id);
                          if (!sz) return null;
                          return (
                            <PixelNoiseOverlay
                              key={`pn-${item.id}`}
                              width={sz.width}
                              height={sz.height}
                              onComplete={() => handlePixelComplete(item.id)}
                            />
                          );
                        })()}
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* ─── Input bar ─── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' }}>
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 24,
            paddingHorizontal: 16,
            minHeight: 52,
            marginRight: 10,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
          }}>
            <Ionicons name="happy-outline" size={24} color="#666" />
            <TextInput
              style={{ flex: 1, marginHorizontal: 12, fontSize: 15, color: '#111', maxHeight: 100 }}
              placeholder="Écrire un message..."
              placeholderTextColor="#999"
              multiline
              value={message}
              onChangeText={setMessage}
            />
            <Ionicons name="attach-outline" size={24} color="#666" style={{ marginRight: 16 }} />
            <Ionicons name="camera-outline" size={24} color="#666" />
          </View>
          <TouchableOpacity
            style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: '#15803D',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2
            }}
            onPress={handleSend}
            disabled={!message.trim() && sendMutation.isPending}
          >
            <Ionicons name={message.trim() ? "send" : "mic"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Context menu modal ─── */}
      <Modal
        visible={!!menuMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuMsg(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuMsg(null)}>
          <View style={[styles.menuCard, { backgroundColor: colors.card, shadowColor: "#000" }]}>
            <Text
              style={[styles.menuPreview, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {menuMsg?.content}
            </Text>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => handleCopy(menuMsg)}>
              <Ionicons name="copy-outline" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Copier</Text>
            </TouchableOpacity>

            {menuMsg?.fromUserId === user?.id && (
              <>
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(menuMsg)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Supprimer</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuMsg(null)}>
              <Ionicons name="close-outline" size={20} color={colors.mutedForeground} />
              <Text style={[styles.menuItemText, { color: colors.mutedForeground }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#EFF8F1" },
  flex:        { flex: 1, backgroundColor: "transparent" },
  headerAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: 'hidden' },
  headerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  messageList:      { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16, gap: 10, flexGrow: 1, justifyContent: "flex-end" },
  msgRow:    { flexDirection: "row", marginBottom: 6 },
  msgLeft:   { justifyContent: "flex-start" },
  msgRight:  { justifyContent: "flex-end" },
  bubble: {
    maxWidth: 290, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  bubbleMe:    { borderRadius: 18, borderBottomRightRadius: 4, backgroundColor: "#DCFCE7" },
  bubbleOther: { borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: "#fff" },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },

  menuOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  menuCard: {
    width: 280, borderRadius: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 24,
    elevation: 12, overflow: "hidden",
  },
  menuPreview: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    paddingHorizontal: 18, paddingVertical: 14,
    lineHeight: 18,
  },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 0 },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  menuItemText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});
