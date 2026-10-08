import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const SHEET_H = SCREEN_H * 0.87;
const DISMISS_THRESHOLD = 100;
const SPRING_CONFIG = { tension: 68, friction: 12, useNativeDriver: true };

// ─────────────────────────────────────────────────────────────────
// DATA — exact maquette reproduction
// ─────────────────────────────────────────────────────────────────
const ITEMS = [
  {
    key: "post",
    title: "Publier un post",
    desc: "Partagez vos idées, actualités et\nmoments avec la communauté.",
    icon: "document-text-outline" as const,
    iconColor: "#16A34A",
    iconBg: "#DCFCE7",
    arrowBg: "#22C55E",
    badge: { label: "Populaire", emoji: "🔥", textColor: "#16A34A", bg: "#DCFCE7", border: "#86EFAC" },
    cardBg: "#F0FDF4",
    cardBorderColor: "#86EFAC",
    route: "/create/post",
  },
  {
    key: "product",
    title: "Vendre un produit",
    desc: "Proposez vos produits à des millions\nd'utilisateurs.",
    icon: "bag-handle-outline" as const,
    iconColor: "#EA580C",
    iconBg: "#FFEDD5",
    arrowBg: "#F97316",
    badge: { label: "Recommandé", emoji: "⭐", textColor: "#EA580C", bg: "#FEF3C7", border: "#FCD34D" },
    cardBg: "#FFFFFF",
    cardBorderColor: "#F1F5F9",
    route: "/create/product",
  },
  {
    key: "service",
    title: "Publier un service",
    desc: "Faites connaître vos services et\ndéveloppez votre activité.",
    icon: "construct-outline" as const,
    iconColor: "#2563EB",
    iconBg: "#DBEAFE",
    arrowBg: "#3B82F6",
    badge: null,
    cardBg: "#FFFFFF",
    cardBorderColor: "#F1F5F9",
    route: "/create/service",
  },
  {
    key: "group",
    title: "Créer un groupe",
    desc: "Rassemblez des personnes autour\nd'intérêts communs.",
    icon: "people-outline" as const,
    iconColor: "#0891B2",
    iconBg: "#CFFAFE",
    arrowBg: "#06B6D4",
    badge: null,
    cardBg: "#FFFFFF",
    cardBorderColor: "#F1F5F9",
    route: "/create/group",
  },
  {
    key: "job",
    title: "Publier une offre d'emploi",
    desc: "Trouvez les meilleurs talents pour\nvotre entreprise.",
    icon: "briefcase-outline" as const,
    iconColor: "#7C3AED",
    iconBg: "#EDE9FE",
    arrowBg: "#8B5CF6",
    badge: null,
    cardBg: "#FFFFFF",
    cardBorderColor: "#F1F5F9",
    route: "/create/job",
  },
  {
    key: "course",
    title: "Créer une formation",
    desc: "Partagez votre savoir et formez des\napprenants.",
    icon: "school-outline" as const,
    iconColor: "#D97706",
    iconBg: "#FEF3C7",
    arrowBg: "#F59E0B",
    badge: null,
    cardBg: "#FFFFFF",
    cardBorderColor: "#F1F5F9",
    route: "/create/course",
  },
] as const;

// ─────────────────────────────────────────────────────────────────
// Sparkle — pulsing star around the header icon
// ─────────────────────────────────────────────────────────────────
function Sparkle({ x, y, size }: { x: number; y: number; size: number }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750 + size * 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 750 + size * 50, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.Text style={{ position: "absolute", left: x, top: y, fontSize: size, color: "#22C55E", opacity: anim }}>
      ✦
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────
export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(SHEET_H)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const combined = Animated.add(slideY, dragY);

  /* ── mount ── */
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, ...SPRING_CONFIG }),
      Animated.timing(overlayOp, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismissSheet = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: SHEET_H, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayOp, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => router.back());
  };

  /* ── drag-to-dismiss ── */
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) dragY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD) {
          dismissSheet();
        } else {
          Animated.spring(dragY, { toValue: 0, ...SPRING_CONFIG }).start();
        }
      },
    })
  ).current;

  const navigate = (route: string) => {
    dismissSheet();
    setTimeout(() => router.push(route as any), 300);
  };

  return (
    <View style={s.root}>
      {/* ── Dimmed overlay ── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet}>
        <Animated.View style={[s.overlay, { opacity: overlayOp }]} />
      </Pressable>

      {/* ── Sheet ── */}
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: insets.bottom + 12, transform: [{ translateY: combined }] },
        ]}
      >
        {/* Drag handle area */}
        <View {...pan.panHandlers} style={s.handleArea}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.header}>
          {/* Green gradient icon with sparkles */}
          <View style={s.iconOuter}>
            <View style={s.iconCircle}>
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </View>
            <Sparkle x={-6}  y={-6}  size={10} />
            <Sparkle x={42}  y={-2}  size={7}  />
            <Sparkle x={-4}  y={42}  size={8}  />
            <Sparkle x={38}  y={44}  size={6}  />
          </View>
          <View style={s.headerText}>
            <Text style={s.headerTitle}>Créer</Text>
            <Text style={s.headerSub}>Choisissez ce que vous voulez créer</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={dismissSheet} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Cards */}
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                s.card,
                {
                  backgroundColor: item.cardBg,
                  borderColor: item.cardBorderColor,
                  borderWidth: item.key === "post" ? 1.5 : 1,
                },
              ]}
              onPress={() => navigate(item.route)}
              activeOpacity={0.75}
            >
              {/* ── Icon square ── */}
              <View style={[s.iconBox, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={28} color={item.iconColor} />
              </View>

              {/* ── Body ── */}
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardDesc}>{item.desc}</Text>
              </View>

              {/* ── Arrow circle ── */}
              <View style={[s.arrowCircle, { backgroundColor: item.arrowBg }]}>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>

              {/* ── Badge (absolute top-right) ── */}
              {item.badge && (
                <View
                  style={[
                    s.badge,
                    { backgroundColor: item.badge.bg, borderColor: item.badge.border },
                  ]}
                >
                  <Text style={s.badgeEmoji}>{item.badge.emoji}</Text>
                  <Text style={[s.badgeLabel, { color: item.badge.textColor }]}>
                    {item.badge.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* ── Security footer ── */}
          <View style={s.secRow}>
            {/* Shield */}
            <View style={s.shieldWrap}>
              <Ionicons name="shield-checkmark" size={40} color="#22C55E" />
            </View>
            {/* Text */}
            <View style={s.secText}>
              <View style={s.secTitleRow}>
                <Text style={s.secTitle}>100% sécurisé</Text>
                <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginLeft: 4 }} />
              </View>
              <Text style={s.secDesc}>
                Vos données sont protégées{"\n"}avec le plus haut niveau de sécurité.
              </Text>
            </View>
            {/* Lock illustration */}
            <View style={s.lockWrap}>
              <View style={s.lockGlow} />
              <View style={s.lockBody}>
                <Ionicons name="lock-closed" size={28} color="#22C55E" />
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.50)",
  },

  /* Sheet */
  sheet: {
    height: SHEET_H,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 28,
    overflow: "hidden",
  },

  /* Drag handle */
  handleArea: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 14,
  },
  iconOuter: {
    width: 58,
    height: 58,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    // iOS shadow
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    // Android elevation
    elevation: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  headerSub: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    // Android shadow
    elevation: 1,
  },

  /* Cards list */
  list: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 10,
  },

  /* Card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
    minHeight: 88,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    // Badge positioning anchor
    position: "relative",
    overflow: "visible",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 3,
  },

  /* Arrow circle */
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  /* Badge — absolute top-right */
  badge: {
    position: "absolute",
    top: -1,
    right: 62,   // sits just left of the arrow circle
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 11,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  /* Security footer */
  secRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginTop: 2,
    overflow: "hidden",
  },
  shieldWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secText: {
    flex: 1,
  },
  secTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  secTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A",
    fontFamily: "Inter_700Bold",
  },
  secDesc: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 2,
  },
  lockWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  lockGlow: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#22C55E",
    opacity: 0.15,
  },
  lockBody: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#86EFAC",
  },
});
