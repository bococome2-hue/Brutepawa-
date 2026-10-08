import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  Animated,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREEN = "#22C55E";
const GREEN_DARK = "#16A34A";
const GREEN_LIGHT = "#DCFCE7";
const GREEN_MID = "#BBF7D0";
const WHITE = "#FFFFFF";
const BG = "#F2F4F7";
const TEXT_DARK = "#111827";
const TEXT_MED = "#374151";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";
const SHADOW_COLOR = "#000";

const AVATAR_COLORS = [
  "#EC4899",
  "#8B5CF6",
  "#F97316",
  "#22C55E",
  "#14B8A6",
  "#EF4444",
  "#3B82F6",
  "#F59E0B",
  "#6366F1",
  "#D946EF",
];

const CONTACTS = [
  { id: 1, name: "Kassim Salif", country: "Bénin", flag: "🇧🇯", online: true },
  { id: 2, name: "Parak Ushv", country: "Côte d'Ivoire", flag: "🇨🇮", online: true },
  { id: 3, name: "LANOU Sachadrac", country: "Bénin", flag: "🇧🇯", online: true },
  { id: 4, name: "Abdoul Hassim", country: "Bénin", flag: "🇧🇯", online: false },
  { id: 5, name: "Jzjzjh Akjzjzjz", country: "Mali", flag: "🇲🇱", online: true },
  { id: 6, name: "Jean Sachadrac", country: "Bénin", flag: "🇧🇯", online: false },
  { id: 7, name: "LANOU Marsh", country: "Côte d'Ivoire", flag: "🇨🇮", online: false },
  { id: 8, name: "Lanou Adjamadohoukpon", country: "Bénin", flag: "🇧🇯", online: true },
  { id: 9, name: "Caleb Auriel", country: "Bénin", flag: "🇧🇯", online: false },
  { id: 10, name: "Aminata Koné", country: "Sénégal", flag: "🇸🇳", online: true },
  { id: 11, name: "Yao Mensah", country: "Togo", flag: "🇹🇬", online: false },
  { id: 12, name: "Fatou Diallo", country: "Guinée", flag: "🇬🇳", online: true },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function Avatar({
  contact,
  size = 48,
  showOnline = false,
}: {
  contact: (typeof CONTACTS)[0];
  size?: number;
  showOnline?: boolean;
}) {
  const dotSize = size * 0.28;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getAvatarColor(contact.id),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: WHITE,
            fontSize: size * 0.33,
            fontFamily: "Inter_700Bold",
            letterSpacing: 0.5,
          }}
        >
          {getInitials(contact.name)}
        </Text>
      </View>
      {showOnline && contact.online && (
        <View
          style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: GREEN,
            borderWidth: 2,
            borderColor: WHITE,
          }}
        />
      )}
    </View>
  );
}

function SelectedBubble({
  contact,
  onRemove,
}: {
  contact: (typeof CONTACTS)[0];
  onRemove: () => void;
}) {
  return (
    <View style={styles.selectedBubble}>
      <View
        style={[
          styles.selectedAvatar,
          { backgroundColor: getAvatarColor(contact.id) },
        ]}
      >
        <Text style={styles.selectedAvatarText}>{getInitials(contact.name)}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.8}>
        <Ionicons name="close" size={10} color={WHITE} />
      </TouchableOpacity>
      <Text style={styles.selectedName} numberOfLines={1}>
        {contact.name.split(" ")[0]}
      </Text>
    </View>
  );
}

function ContactRow({
  contact,
  selected,
  onToggle,
}: {
  contact: (typeof CONTACTS)[0];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.contactCard, selected && styles.contactCardSelected]}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <Avatar contact={contact} size={50} showOnline />

      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, selected && { color: GREEN_DARK }]}>
          {contact.name}
        </Text>
        <View style={styles.countryRow}>
          <Text style={styles.flagText}>{contact.flag}</Text>
          <Text style={styles.countryText}>{contact.country}</Text>
        </View>
      </View>

      <View
        style={[
          styles.selector,
          selected
            ? { backgroundColor: GREEN, borderColor: GREEN }
            : { backgroundColor: WHITE, borderColor: BORDER },
        ]}
      >
        {selected && <Ionicons name="checkmark" size={16} color={WHITE} />}
      </View>
    </TouchableOpacity>
  );
}

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 20 : insets.top;
  const bottomPadding = isWeb ? 20 : insets.bottom;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([1, 2, 3, 4]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return CONTACTS;
    return CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
    );
  }, [search]);

  const selectedContacts = CONTACTS.filter((c) => selectedIds.includes(c.id));
  const count = selectedIds.length;

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deselectAll = () => setSelectedIds([]);

  const VISIBLE_SELECTED = 4;
  const visibleSelected = selectedContacts.slice(0, VISIBLE_SELECTED);
  const extraCount = Math.max(0, count - VISIBLE_SELECTED);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 10, backgroundColor: GREEN },
        ]}
      >
        <TouchableOpacity
          style={styles.backCircle}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={GREEN} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nouveau groupe</Text>
          <Text style={styles.headerSubtitle}>Sélectionnez des membres</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>1/2</Text>
          </View>
          <TouchableOpacity
            style={styles.nextBtn}
            activeOpacity={0.85}
            disabled={count === 0}
          >
            <Text style={[styles.nextBtnText, count === 0 && { opacity: 0.5 }]}>
              Suivant
            </Text>
            <Ionicons
              name="arrow-forward"
              size={15}
              color={count === 0 ? "#ccc" : GREEN}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 + bottomPadding }}
      >
        {/* ── SELECTED MEMBERS ── */}
        {count > 0 && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle}>
                Membres sélectionnés{" "}
                <Text style={{ color: GREEN }}>({count})</Text>
              </Text>
              <TouchableOpacity onPress={deselectAll} activeOpacity={0.7}>
                <Text style={styles.deselectText}>Tout désélectionner</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bubblesRow}
            >
              {visibleSelected.map((c) => (
                <SelectedBubble
                  key={c.id}
                  contact={c}
                  onRemove={() => toggle(c.id)}
                />
              ))}
              {extraCount > 0 && (
                <View style={styles.extraBubble}>
                  <View style={styles.extraCircle}>
                    <Text style={styles.extraText}>+{extraCount}</Text>
                  </View>
                  <Text style={styles.selectedName}>Autres</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ── SEARCH ── */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={GREEN} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un ami..."
              placeholderTextColor={TEXT_MUTED}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── CONTACTS ── */}
        <View style={styles.listSection}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={44} color={TEXT_MUTED} />
              <Text style={styles.emptyText}>Aucun contact trouvé</Text>
            </View>
          ) : (
            filtered.map((contact, index) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                selected={selectedIds.includes(contact.id)}
                onToggle={() => toggle(contact.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── BOTTOM BUTTON ── */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPadding + 12 },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.createBtn,
            count === 0 && { backgroundColor: "#9CA3AF" },
          ]}
          activeOpacity={0.88}
          disabled={count === 0}
        >
          <Ionicons name="people" size={20} color={WHITE} style={{ marginRight: 8 }} />
          <Text style={styles.createBtnText}>
            {count === 0
              ? "Sélectionnez des membres"
              : `Créer le groupe (${count} sélectionné${count > 1 ? "s" : ""})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 10,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  stepText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nextBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: GREEN,
  },

  /* SELECTED MEMBERS */
  selectedCard: {
    backgroundColor: WHITE,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 20,
    padding: 14,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
  },
  deselectText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: GREEN,
  },
  bubblesRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 4,
  },
  selectedBubble: {
    alignItems: "center",
    width: 56,
    gap: 4,
  },
  selectedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedAvatarText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  removeBtn: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  selectedName: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: TEXT_MED,
    textAlign: "center",
  },
  extraBubble: {
    alignItems: "center",
    width: 56,
    gap: 4,
  },
  extraCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: GREEN,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN_LIGHT,
  },
  extraText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: GREEN,
  },

  /* SEARCH */
  searchWrapper: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },

  /* CONTACTS */
  listSection: {
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 4,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 12,
    gap: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  contactCardSelected: {
    borderColor: GREEN_MID,
    backgroundColor: "#F0FDF4",
  },
  contactInfo: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  flagText: {
    fontSize: 13,
  },
  countryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  selector: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  /* EMPTY */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },

  /* BOTTOM */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(242,244,247,0.95)",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderRadius: 22,
    paddingVertical: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: 0.2,
  },
});
