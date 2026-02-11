import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { PlanetName, LineType } from "@/lib/types";
import {
  getInterpretation,
  getPlanetSymbol,
  getPlanetIcon,
} from "@/lib/interpretations";

export default function LineDetailScreen() {
  const { planet, lineType } = useLocalSearchParams<{
    planet: string;
    lineType: string;
  }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const p = planet as PlanetName;
  const lt = lineType as LineType;
  const interp = getInterpretation(p, lt);
  const planetColor = Colors.planets[p] || "#FFFFFF";

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[planetColor + "20", Colors.dark.background]}
          style={styles.heroSection}
        >
          <View style={[styles.heroIcon, { backgroundColor: planetColor + "25" }]}>
            <Ionicons
              name={getPlanetIcon(p) as any}
              size={36}
              color={planetColor}
            />
          </View>
          <Text style={styles.heroTitle}>{interp.title}</Text>
          <View style={styles.heroBadge}>
            <View style={[styles.heroDot, { backgroundColor: planetColor }]} />
            <Text style={[styles.heroBadgeText, { color: planetColor }]}>
              {getPlanetSymbol(p)} {Colors.lineTypes[lt]?.label || lt}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionContent}>{interp.shortDesc}</Text>
        </View>

        {interp.livingHere ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home-outline" size={18} color={Colors.dark.primary} />
              <Text style={styles.sectionTitle}>Living Here</Text>
            </View>
            <Text style={styles.sectionContent}>{interp.livingHere}</Text>
          </View>
        ) : null}

        {interp.themes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="layers-outline" size={18} color={Colors.dark.secondary} />
              <Text style={styles.sectionTitle}>Key Themes</Text>
            </View>
            <View style={styles.tagsContainer}>
              {interp.themes.map((theme, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: Colors.dark.secondaryMuted }]}>
                  <Text style={[styles.tagText, { color: Colors.dark.secondary }]}>
                    {theme}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {interp.bestFor.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.dark.success} />
              <Text style={styles.sectionTitle}>Best For</Text>
            </View>
            <View style={styles.listContainer}>
              {interp.bestFor.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.listDot, { backgroundColor: Colors.dark.success }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {interp.challenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={18} color={Colors.dark.danger} />
              <Text style={styles.sectionTitle}>Challenges</Text>
            </View>
            <View style={styles.listContainer}>
              {interp.challenges.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.listDot, { backgroundColor: Colors.dark.danger }]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  sectionContent: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  listContainer: { gap: 10 },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 21,
  },
});
