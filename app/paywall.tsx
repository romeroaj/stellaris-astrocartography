/**
 * Paywall screen: Subscribe to premium (Custom Friends, future features).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { usePurchase } from "@/lib/PurchaseContext";
import { isRevenueCatAvailable } from "@/lib/purchases";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { purchase, restore, isPremium } = usePurchase();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handlePurchase = async () => {
    if (!isRevenueCatAvailable()) {
      Alert.alert(
        "Upgrade",
        "In-app purchases are only available in the iOS and Android apps. Please open Stellaris on your phone to subscribe."
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      const ok = await purchase();
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    try {
      const ok = await restore();
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases to restore.");
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const features = [
    { icon: "person-add-outline" as const, text: "Custom Friends — Add birth charts for anyone" },
    { icon: "planet-outline" as const, text: "More features coming soon" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Stellaris Pro</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.dark.primaryMuted, Colors.dark.card]}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="star" size={48} color={Colors.dark.primary} />
          </View>
          <Text style={styles.heroTitle}>Unlock Premium</Text>
          <Text style={styles.heroDesc}>
            Get Custom Friends and upcoming premium features. Support the development of Stellaris.
          </Text>
        </LinearGradient>

        <View style={styles.features}>
          {features.map(({ icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <Ionicons name={icon} size={22} color={Colors.dark.primary} />
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          onPress={handlePurchase}
          disabled={purchasing || isPremium}
        >
          {purchasing ? (
            <ActivityIndicator color={Colors.dark.background} />
          ) : isPremium ? (
            <Text style={styles.primaryBtnText}>{"You're a Pro"}</Text>
          ) : (
            <Text style={styles.primaryBtnText}>Subscribe</Text>
          )}
        </Pressable>

        {isRevenueCatAvailable() && (
          <Pressable
            style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.7 }]}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={Colors.dark.textSecondary} />
            ) : (
              <Text style={styles.restoreBtnText}>Restore Purchases</Text>
            )}
          </Pressable>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  hero: {
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.primary + "30",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dark.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  features: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.text,
  },
  primaryBtn: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.background,
  },
  restoreBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  restoreBtnText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
  },
});
