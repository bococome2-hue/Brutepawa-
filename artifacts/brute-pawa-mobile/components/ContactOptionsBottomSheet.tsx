import React from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Switch, ScrollView, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

interface Props {
  userId: string;
  contactName: string;
  visible: boolean;
  isMuted: boolean;
  isPinned: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onTogglePin:  () => void;
}

interface OptionRow {
  key:      string;
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  danger?:  boolean;
  hasToggle?: "mute" | "pin";
  route?:   string;
}

const OPTIONS: OptionRow[] = [
  { key: "profile",    icon: "person-circle-outline",   label: "Voir le profil",                route: "profile" },
  { key: "search",     icon: "search-outline",           label: "Rechercher dans la conversation", route: "search" },
  { key: "mute",       icon: "notifications-off-outline",label: "Mettre en sourdine",              hasToggle: "mute", route: "mute" },
  { key: "pin",        icon: "pin-outline",              label: "Épingler la conversation",        hasToggle: "pin",  route: "pin"  },
  { key: "favorites",  icon: "star-outline",             label: "Ajouter aux favoris",             route: "favorites" },
  { key: "addFriend",  icon: "person-add-outline",       label: "Ajouter aux amis",                route: "add-friend" },
  { key: "addGroup",   icon: "people-outline",           label: "Ajouter à un groupe",             route: "add-to-group" },
  { key: "share",      icon: "share-social-outline",     label: "Partager le profil",              route: "share" },
  { key: "block",      icon: "ban-outline",              label: "Bloquer le contact",              route: "block" },
  { key: "report",     icon: "warning-outline",          label: "Signaler l'utilisateur",          route: "report" },
  { key: "delete",     icon: "trash-outline",            label: "Supprimer la conversation",       route: "delete", danger: true },
];

export default function ContactOptionsBottomSheet({
  userId, contactName, visible, isMuted, isPinned, onClose, onToggleMute, onTogglePin,
}: Props) {
  const colors = useColors();

  const handlePress = (opt: OptionRow) => {
    if (opt.hasToggle === "mute") { onToggleMute(); return; }
    if (opt.hasToggle === "pin")  { onTogglePin();  return; }
    if (opt.route) {
      onClose();
      router.push(`/contact/${userId}/${opt.route}` as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.foreground }]}>Plus d'options</Text>

        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.row,
                { borderBottomColor: colors.divider },
                i === OPTIONS.length - 4 && { marginTop: 12 },
              ]}
              onPress={() => handlePress(opt)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: opt.danger ? "#FEE2E2" : colors.secondary }]}>
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={opt.danger ? colors.destructive : colors.primary}
                />
              </View>

              <Text style={[
                styles.label,
                { color: opt.danger ? colors.destructive : colors.foreground },
              ]}>
                {opt.label}
              </Text>

              {opt.hasToggle === "mute" && (
                <Switch
                  value={isMuted}
                  onValueChange={onToggleMute}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              )}
              {opt.hasToggle === "pin" && (
                <Switch
                  value={isPinned}
                  onValueChange={onTogglePin}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              )}
              {!opt.hasToggle && (
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 20 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius:  22,
    borderTopRightRadius: 22,
    paddingHorizontal: 0,
    paddingTop: 10,
    maxHeight: "80%",
    shadowColor:  "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius:  12,
    elevation: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 14,
  },
  title: {
    fontSize: 18, fontFamily: "Inter_700Bold",
    paddingHorizontal: 20, marginBottom: 8,
  },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    marginRight: 14,
  },
  label: {
    flex: 1, fontSize: 15, fontFamily: "Inter_500Medium",
  },
});
