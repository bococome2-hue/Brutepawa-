import { Ionicons } from "@expo/vector-icons";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@/context/AuthContext";

const GREEN = "#22C55E";
const GREEN_DARK = "#16A34A";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#111827";
const TEXT_MED = "#374151";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";
const BG = "#F9FAFB";

const { width: SCREEN_W } = Dimensions.get("window");

const LANGS = ["Français", "English", "Português"];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [showPw, setShowPw] = useState(false);
  const [langIdx, setLangIdx] = useState(0);
  const [showLang, setShowLang] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<"contact" | "password" | null>(null);

  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPw, setRegPw] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [focusedReg, setFocusedReg] = useState<string | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await signIn(data.token, data.user as AuthUser);
        router.replace("/(tabs)/");
      },
      onError: (err: any) => setError(err?.data?.error ?? err?.message ?? "Identifiants incorrects"),
    },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async (data) => {
        await signIn(data.token, data.user as AuthUser);
        router.replace("/(tabs)/");
      },
      onError: (err: any) => setError(err?.data?.error ?? err?.message ?? "Erreur lors de l'inscription"),
    },
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  function handleSubmit() {
    setError(null);
    if (mode === "login") {
      if (!contact || !password) return setError("Veuillez remplir tous les champs");
      const isEmail = contact.includes("@");
      loginMutation.mutate({ data: { email: isEmail ? contact : `${contact}@brutepawa.com`, password } });
    } else {
      if (!regFirst || !regLast || !regEmail || !regPhone || !regPw) return setError("Veuillez remplir tous les champs");
      if (regPw.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères");
      registerMutation.mutate({ data: { firstName: regFirst, lastName: regLast, email: regEmail, phone: regPhone, password: regPw, country: "CI" } });
    }
  }

  const inputStyle = (key: string) => [
    styles.inputRow,
    { borderColor: focusedReg === key ? GREEN : BORDER, backgroundColor: WHITE },
  ];

  return (
    <View style={styles.root}>
      {/* ── Fond décoratif SVG ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 390 900" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id="rg1" cx="85%" cy="8%" r="50%">
              <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.10" />
              <Stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="rg2" cx="5%" cy="90%" r="50%">
              <Stop offset="0%" stopColor="#16A34A" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="390" height="900" fill="url(#rg1)" />
          <Rect width="390" height="900" fill="url(#rg2)" />
          <Circle cx="345" cy="55" r="110" fill="#22C55E" fillOpacity="0.05" />
          <Circle cx="20" cy="180" r="68" fill="#16A34A" fillOpacity="0.06" />
          <Circle cx="355" cy="820" r="130" fill="#22C55E" fillOpacity="0.04" />
          <Circle cx="50" cy="750" r="55" fill="#4ADE80" fillOpacity="0.07" />
          <Circle cx="80" cy="420" r="6" fill="#22C55E" fillOpacity="0.18" />
          <Circle cx="340" cy="300" r="5" fill="#22C55E" fillOpacity="0.18" />
          <Circle cx="360" cy="480" r="4" fill="#4ADE80" fillOpacity="0.2" />
          <Path d="M -30 280 Q 120 170 270 260 T 420 240" stroke="#22C55E" strokeWidth="1" fill="none" strokeOpacity="0.08" />
        </Svg>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Sélecteur langue ── */}
          <View style={styles.langRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.langBtn} onPress={() => setShowLang(v => !v)} activeOpacity={0.75}>
              <Ionicons name="globe-outline" size={15} color={GREEN_DARK} />
              <Text style={styles.langText}>{LANGS[langIdx]}</Text>
              <Ionicons name={showLang ? "chevron-up" : "chevron-down"} size={13} color={GREEN_DARK} />
            </TouchableOpacity>
            {showLang && (
              <View style={styles.langDropdown}>
                {LANGS.map((l, i) => (
                  <TouchableOpacity key={l} style={styles.langOption} onPress={() => { setLangIdx(i); setShowLang(false); }}>
                    <Text style={[styles.langOptionText, i === langIdx && { color: GREEN, fontFamily: "Inter_600SemiBold" }]}>{l}</Text>
                    {i === langIdx && <Ionicons name="checkmark" size={14} color={GREEN} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <View style={styles.logoInner}>
                <Text style={styles.logoLetter}>b</Text>
                <View style={styles.logoDotRow}>
                  <View style={styles.logoDot} />
                  <View style={styles.logoDot} />
                  <View style={styles.logoDot} />
                </View>
              </View>
            </View>
            <Text style={styles.appName}>brutepawa</Text>
          </View>

          {mode === "register" ? (
            <>
              {/* ── Titre ── */}
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>
                Rejoignez BrutePawa et développez votre activité partout en Afrique francophone.
              </Text>

              {/* ── Erreur ── */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* ── Formulaire simplifié ── */}
              <View style={styles.form}>
                {/* Prénom + Nom */}
                <View style={styles.row}>
                  <View style={[inputStyle("first"), styles.halfInput]}>
                    <Ionicons name="person-outline" size={18} color={focusedReg === "first" ? GREEN : TEXT_MUTED} />
                    <TextInput
                      style={styles.input}
                      placeholder="Prénom"
                      placeholderTextColor={TEXT_MUTED}
                      value={regFirst}
                      onChangeText={setRegFirst}
                      onFocus={() => setFocusedReg("first")}
                      onBlur={() => setFocusedReg(null)}
                    />
                  </View>
                  <View style={[inputStyle("last"), styles.halfInput]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Nom"
                      placeholderTextColor={TEXT_MUTED}
                      value={regLast}
                      onChangeText={setRegLast}
                      onFocus={() => setFocusedReg("last")}
                      onBlur={() => setFocusedReg(null)}
                    />
                  </View>
                </View>

                {/* Téléphone ou email */}
                <View style={inputStyle("contact")}>
                  <Ionicons name="phone-portrait-outline" size={18} color={focusedReg === "contact" ? GREEN : TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Numéro de téléphone ou adresse e-mail"
                    placeholderTextColor={TEXT_MUTED}
                    value={regEmail}
                    onChangeText={(v) => { setRegEmail(v); if (v.includes("@")) {} else setRegPhone(v); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedReg("contact")}
                    onBlur={() => setFocusedReg(null)}
                  />
                </View>

                {/* Mot de passe */}
                <View style={inputStyle("pw")}>
                  <Ionicons name="lock-closed-outline" size={18} color={focusedReg === "pw" ? GREEN : TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe"
                    placeholderTextColor={TEXT_MUTED}
                    value={regPw}
                    onChangeText={setRegPw}
                    secureTextEntry={!showRegPw}
                    onFocus={() => setFocusedReg("pw")}
                    onBlur={() => setFocusedReg(null)}
                  />
                  <TouchableOpacity onPress={() => setShowRegPw(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showRegPw ? "eye" : "eye-off-outline"} size={20} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                {/* Bouton principal */}
                <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85}>
                  {isLoading ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Créer mon compte</Text>
                      <Ionicons name="arrow-forward" size={18} color={WHITE} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Séparateur */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Lien connexion */}
                <View style={styles.loginRow}>
                  <Text style={styles.loginLabel}>Vous avez déjà un compte ?</Text>
                  <TouchableOpacity onPress={() => { setMode("login"); setError(null); }}>
                    <Text style={styles.loginLink}>Se connecter</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Legal */}
              <Text style={styles.legal}>
                En vous inscrivant, vous acceptez nos{" "}
                <Text style={styles.legalLink}>Conditions d'utilisation</Text>
                {" "}et notre{" "}
                <Text style={styles.legalLink}>Politique de confidentialité</Text>.
              </Text>
            </>
          ) : (
            <>
              {/* ── LOGIN MODE ── */}
              <Text style={styles.title}>Se connecter</Text>
              <Text style={styles.subtitle}>
                Bon retour sur BrutePawa 👋
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.form}>
                <View style={[styles.inputRow, { borderColor: focused === "contact" ? GREEN : BORDER, backgroundColor: WHITE }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color={focused === "contact" ? GREEN : TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Téléphone ou adresse e-mail"
                    placeholderTextColor={TEXT_MUTED}
                    value={contact}
                    onChangeText={setContact}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocused("contact")}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={[styles.inputRow, { borderColor: focused === "password" ? GREEN : BORDER, backgroundColor: WHITE }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={focused === "password" ? GREEN : TEXT_MUTED} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe"
                    placeholderTextColor={TEXT_MUTED}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPw ? "eye" : "eye-off-outline"} size={20} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.85}>
                  {isLoading ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Se connecter</Text>
                      <Ionicons name="arrow-forward" size={18} color={WHITE} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.loginRow}>
                  <Text style={styles.loginLabel}>Pas encore de compte ?</Text>
                  <TouchableOpacity onPress={() => { setMode("register"); setError(null); }}>
                    <Text style={styles.loginLink}>S'inscrire</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.legal}>
                En vous connectant, vous acceptez nos{" "}
                <Text style={styles.legalLink}>Conditions d'utilisation</Text>.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  flex: { flex: 1 },

  /* Lang */
  langRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, position: "relative", zIndex: 20 },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#BBF7D0" },
  langText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GREEN_DARK },
  langDropdown: { position: "absolute", top: 38, right: 0, backgroundColor: WHITE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8, minWidth: 140, zIndex: 100 },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  langOptionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_DARK },

  /* Logo */
  logoSection: { alignItems: "center", marginTop: 8, marginBottom: 20, gap: 10 },
  logoBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", shadowColor: GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  logoInner: { alignItems: "center", gap: 4 },
  logoLetter: { fontSize: 36, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 40 },
  logoDotRow: { flexDirection: "row", gap: 3 },
  logoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.8)" },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold", color: GREEN_DARK, letterSpacing: -0.5 },

  /* Titles */
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: TEXT_DARK, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_MED, textAlign: "center", lineHeight: 21, marginBottom: 20, paddingHorizontal: 10 },

  /* Error */
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#DC2626", flex: 1 },

  /* Form */
  form: { gap: 12, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT_DARK, height: "100%" },
  eyeBtn: { padding: 2 },

  /* Submit */
  submitBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: { fontSize: 17, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: 0.2 },

  /* Divider */
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_MUTED },

  /* Login link */
  loginRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  loginLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT_MED },
  loginLink: { fontSize: 15, fontFamily: "Inter_700Bold", color: GREEN },

  /* Legal */
  legal: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_MUTED, textAlign: "center", lineHeight: 18, marginTop: 16, paddingHorizontal: 10 },
  legalLink: { color: GREEN, fontFamily: "Inter_500Medium" },
});
