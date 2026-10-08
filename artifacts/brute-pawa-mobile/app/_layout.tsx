import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrutePawaSplash } from "@/components/BrutePawaSplash";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

setBaseUrl(API_BASE_URL);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Routes que l'on ne doit pas persister (login, racine)
const NON_PERSIST = new Set(["/login", "/", ""]);
const ROUTE_KEY = "bp_last_route";

function RootLayoutNav() {
  const { token, isLoading } = useAuth();
  const pathname = usePathname();
  const authHandled = useRef(false);
  const prevToken = useRef<string | null>(null);

  // ── Persistance de route (natif) ──────────────────────────────────────────
  // Sauvegarder la route courante à chaque navigation (uniquement natif, le web
  // conserve déjà l'URL dans la barre d'adresse).
  useEffect(() => {
    if (Platform.OS !== "web" && token && !NON_PERSIST.has(pathname)) {
      AsyncStorage.setItem(ROUTE_KEY, pathname).catch(() => {});
    }
  }, [pathname, token]);

  // ── Redirection au démarrage / après login/logout ─────────────────────────
  useEffect(() => {
    if (isLoading) return;

    const justLoggedOut =
      prevToken.current !== null && token === null;
    const justLoggedIn =
      prevToken.current === null && token !== null;
    prevToken.current = token;

    if (!token) {
      // Déconnecté : effacer la route sauvegardée et aller au login
      AsyncStorage.removeItem(ROUTE_KEY).catch(() => {});
      authHandled.current = false;
      router.replace("/login");
      return;
    }

    // Authentifié — on ne redirige que lors du premier chargement ou d'un login
    const shouldRedirect = !authHandled.current || justLoggedIn || justLoggedOut;
    if (!shouldRedirect) return;
    authHandled.current = true;

    if (Platform.OS === "web") {
      // Sur le web, l'URL du navigateur est conservée entre les rechargements.
      // On ne redirige que si l'utilisateur est sur /login ou la racine vide.
      const webPath =
        typeof window !== "undefined"
          ? window.location.pathname
          : pathname;
      if (!webPath || webPath === "/" || webPath === "/login") {
        router.replace("/(tabs)/" as any);
      }
      // Sinon expo-router rendra directement la page correspondant à l'URL.
    } else {
      // Sur natif, restaurer la dernière route ou aller à l'accueil.
      AsyncStorage.getItem(ROUTE_KEY)
        .then((saved) => {
          if (saved && !NON_PERSIST.has(saved)) {
            router.replace(saved as any);
          } else {
            router.replace("/(tabs)/" as any);
          }
        })
        .catch(() => router.replace("/(tabs)/" as any));
    }
  }, [token, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* ── Create bottom sheet ─────────────────────────────────── */}
      <Stack.Screen
        name="create/index"
        options={{ headerShown: false, presentation: "transparentModal", animation: "none" }}
      />
      <Stack.Screen
        name="create/post"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="create/product"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="create/service"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="create/group"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="create/job"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="create/course"
        options={{ headerShown: false, presentation: "modal" }}
      />

      <Stack.Screen
        name="chat/[userId]"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />

      {/* ── Contact info screens ────────────────────────────────── */}
      <Stack.Screen
        name="contact/[userId]/index"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/profile"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/search"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/mute"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/pin"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/favorites"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/add-friend"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/add-to-group"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/share"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/block"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/report"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="contact/[userId]/delete"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="groups/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="groups/new"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/new"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/index"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/rename"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/members"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/confirm-clear"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/filters"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/notifications"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/date-search"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/import-phone"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/ringtone"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/vibration"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/priority"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/preview-mode"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/media"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/stats"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/advanced"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/export"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/export-history"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/security"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/ai"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/activity-log"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/import-file"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/sync-contacts"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/cloud-backup"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/cover"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/color"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="broadcast/[id]/author-search"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const finishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (showSplash) {
    return <BrutePawaSplash onFinished={finishSplash} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
