import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const CARD_WIDTH = (Dimensions.get("window").width - 48) / 2;

interface Product {
  id: number;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string;
  imageUrl: string | null;
  status: string;
  location: string | null;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "phone-portrait-outline",
  clothing: "shirt-outline",
  food: "restaurant-outline",
  services: "briefcase-outline",
  vehicles: "car-outline",
  real_estate: "home-outline",
  other: "grid-outline",
};

export function ProductCard({ product, onPress }: ProductCardProps) {
  const colors = useColors();

  const icon = CATEGORY_ICONS[product.category] ?? "grid-outline";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name={icon as any} size={32} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={[styles.price, { color: colors.primary }]}>
          {product.price.toLocaleString()} {product.currency}
        </Text>
        {product.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
            <Text style={[styles.location, { color: colors.mutedForeground }]} numberOfLines={1}>
              {product.location}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  imageContainer: {
    height: 130,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 10,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
