import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import colors, { splashColors } from "@/constants/colors";

interface BrutePawaSplashProps {
  onFinished: () => void;
}

const DISPLAY_DURATION = 2450;

export function BrutePawaSplash({ onFinished }: BrutePawaSplashProps) {
  const { width, height } = useWindowDimensions();
  const entrance = useSharedValue(0);
  const pulse = useSharedValue(0);
  const progress = useSharedValue(0);
  const exit = useSharedValue(1);

  const logoSize = Math.min(width * 0.47, height * 0.27, 272);
  const compact = height < 720;

  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: 720,
      easing: Easing.out(Easing.cubic),
    });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1050, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    progress.value = withTiming(1, {
      duration: DISPLAY_DURATION - 280,
      easing: Easing.inOut(Easing.cubic),
    });
    exit.value = withDelay(
      DISPLAY_DURATION,
      withTiming(
        0,
        { duration: 360, easing: Easing.inOut(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onFinished)();
        },
      ),
    );
  }, [entrance, exit, onFinished, progress, pulse]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: exit.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: interpolate(entrance.value, [0, 1], [18, 0]) },
      { scale: interpolate(entrance.value, [0, 1], [0.9, 1]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.48, 0.9]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.94, 1.08]) }],
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 0.45, 1], [0, 0, 1]),
    transform: [
      {
        translateY: interpolate(entrance.value, [0, 1], [12, 0]),
      },
    ],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [12, 72])}%`,
  }));

  return (
    <Animated.View style={[styles.screen, screenStyle]}>
      <StatusBar style="light" translucent backgroundColor={splashColors.transparent} />
      <LinearGradient
        colors={[
          splashColors.backgroundDeep,
          splashColors.background,
          splashColors.backgroundDeep,
        ]}
        locations={[0, 0.44, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.hero, { marginTop: compact ? height * 0.23 : height * 0.33 }]}>
        <Animated.View
          style={[
            styles.logoGlow,
            glowStyle,
            { width: logoSize * 1.12, height: logoSize * 1.12, borderRadius: logoSize * 0.3 },
          ]}
        />
        <Animated.View
          style={[
            styles.logoFrame,
            logoStyle,
            {
              width: logoSize,
              height: logoSize,
              borderRadius: logoSize * 0.25,
            },
          ]}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            contentFit="cover"
            style={[StyleSheet.absoluteFill, styles.logoImage]}
          />
        </Animated.View>
        <View
          style={[
            styles.logoFloor,
            { width: logoSize * 0.86, top: logoSize + 5 },
          ]}
        />
      </View>

      <Animated.View style={[styles.brandBlock, brandStyle, compact && styles.brandBlockCompact]}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkWhite}>Brute</Text>
          <Text style={styles.wordmarkGreen}>Pawa</Text>
          <Text style={styles.registered}>®</Text>
        </View>
        <Text style={styles.tagline}>PLUS QU’UN RÉSEAU SOCIAL</Text>
      </Animated.View>

      <View
        style={[
          styles.loadingBlock,
          {
            bottom:
              (Platform.OS === "web" ? 34 : 0) + (compact ? height * 0.055 : height * 0.085),
          },
        ]}
      >
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.loadingText}>CHARGEMENT...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: splashColors.backgroundDeep,
    alignItems: "center",
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    backgroundColor: splashColors.glowSoft,
    shadowColor: splashColors.glow,
    shadowOpacity: 0.72,
    shadowRadius: 30,
  },
  logoFrame: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: splashColors.glow,
    backgroundColor: colors.light.primary,
    shadowColor: splashColors.glow,
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  logoImage: {
    transform: [{ scale: 1.17 }],
  },
  logoFloor: {
    position: "absolute",
    height: 2,
    backgroundColor: splashColors.glow,
    shadowColor: splashColors.glow,
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  brandBlock: {
    marginTop: 48,
    alignItems: "center",
    opacity: 0,
  },
  brandBlockCompact: {
    marginTop: 34,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    transform: [{ scaleX: 1.15 }],
  },
  wordmarkWhite: {
    color: splashColors.white,
    fontFamily: "Inter_700Bold",
    fontSize: 50,
    letterSpacing: -2.8,
    lineHeight: 57,
  },
  wordmarkGreen: {
    color: splashColors.glow,
    fontFamily: "Inter_700Bold",
    fontSize: 50,
    letterSpacing: -2.8,
    lineHeight: 57,
  },
  registered: {
    color: splashColors.glow,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
    marginLeft: 4,
  },
  tagline: {
    marginTop: 5,
    color: splashColors.mutedText,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 4.7,
    transform: [{ scaleX: 1.13 }],
  },
  loadingBlock: {
    position: "absolute",
    alignItems: "center",
    width: "100%",
  },
  progressTrack: {
    width: 128,
    height: 2,
    backgroundColor: splashColors.track,
    overflow: "visible",
  },
  progressFill: {
    height: 2,
    alignSelf: "center",
    backgroundColor: splashColors.glow,
    shadowColor: splashColors.glow,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 18,
    color: splashColors.mutedText,
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 3.6,
  },
});