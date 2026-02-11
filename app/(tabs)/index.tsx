import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { BirthData, PlanetName, AstroLine } from "@/lib/types";
import { getActiveProfile } from "@/lib/storage";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
} from "@/lib/astronomy";
import { getPlanetSymbol } from "@/lib/interpretations";
import AstroMap from "@/components/AstroMap";

const ALL_PLANETS: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabledPlanets, setEnabledPlanets] = useState<Set<PlanetName>>(
    new Set(["sun", "moon", "venus", "mars", "jupiter"])
  );
  const [selectedLine, setSelectedLine] = useState<AstroLine | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    setLoading(true);
    const p = await getActiveProfile();
    setProfile(p);
    setLoading(false);
    if (!p) {
      router.replace("/onboarding");
    }
  };

  const astroLines = useMemo(() => {
    if (!profile) return [];
    const [year, month, day] = profile.date.split("-").map(Number);
    const [hour, minute] = profile.time.split(":").map(Number);
    const positions = calculatePlanetPositions(year, month, day, hour, minute, profile.longitude);
    const gst = calculateGST(year, month, day, hour, minute, profile.longitude);
    return generateAstroLines(positions, gst);
  }, [profile]);

  const visibleLines = useMemo(() => {
    return astroLines.filter((line) => enabledPlanets.has(line.planet));
  }, [astroLines, enabledPlanets]);

  const togglePlanet = (planet: PlanetName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabledPlanets((prev) => {
      const next = new Set(prev);
      if (next.has(planet)) {
        next.delete(planet);
      } else {
        next.add(planet);
      }
      return next;
    });
  };

  const getLineColor = (planet: PlanetName): string => {
    return Colors.planets[planet] || "#FFFFFF";
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <AstroMap
        lines={visibleLines}
        birthLat={profile.latitude}
        birthLon={profile.longitude}
        onLinePress={(line) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelectedLine(line);
        }}
      />

      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>{profile.name}</Text>
            <Text style={styles.headerSubtitle}>{profile.locationName.split(",")[0]}</Text>
          </View>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendScroll}>
          {ALL_PLANETS.map((planet) => (
            <Pressable
              key={planet}
              style={[
                styles.planetChip,
                enabledPlanets.has(planet) && {
                  backgroundColor: getLineColor(planet) + "25",
                  borderColor: getLineColor(planet),
                },
              ]}
              onPress={() => togglePlanet(planet)}
            >
              <View
                style={[
                  styles.planetDot,
                  { backgroundColor: getLineColor(planet) },
                  !enabledPlanets.has(planet) && { opacity: 0.3 },
                ]}
              />
              <Text
                style={[
                  styles.planetChipText,
                  enabledPlanets.has(planet) && { color: getLineColor(planet) },
                ]}
              >
                {getPlanetSymbol(planet)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.lineTypeLegend}>
        {Object.entries(Colors.lineTypes).map(([key, val]) => (
          <View key={key} style={styles.lineTypeItem}>
            <View style={styles.lineTypeSample}>
              <View
                style={[
                  styles.lineTypeLine,
                  val.dash.length > 0 && { borderStyle: "dashed" as const },
                ]}
              />
            </View>
            <Text style={styles.lineTypeLabel}>{val.label}</Text>
          </View>
        ))}
      </View>

      {selectedLine && (
        <Pressable
          style={styles.selectedOverlay}
          onPress={() => setSelectedLine(null)}
        >
          <Pressable
            style={styles.selectedCard}
            onPress={() => {
              router.push({
                pathname: "/line-detail",
                params: {
                  planet: selectedLine.planet,
                  lineType: selectedLine.lineType,
                },
              });
            }}
          >
            <View style={styles.selectedCardHeader}>
              <View style={[styles.selectedDot, { backgroundColor: getLineColor(selectedLine.planet) }]} />
              <Text style={styles.selectedCardTitle}>
                {getPlanetSymbol(selectedLine.planet)} {Colors.lineTypes[selectedLine.lineType]?.label || selectedLine.lineType}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.selectedCardHint}>Tap to learn what this line means for you</Text>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    backgroundColor: Colors.dark.overlay,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  legendContainer: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
  },
  legendScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  planetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.overlay,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  planetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planetChipText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textMuted,
  },
  lineTypeLegend: {
    position: "absolute",
    bottom: 140,
    right: 16,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 4,
  },
  lineTypeItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineTypeSample: { width: 24, height: 12, justifyContent: "center" },
  lineTypeLine: {
    height: 0,
    borderTopWidth: 2,
    borderTopColor: Colors.dark.textSecondary,
  },
  lineTypeLabel: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
  },
  selectedOverlay: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
  },
  selectedCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  selectedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedDot: { width: 12, height: 12, borderRadius: 6 },
  selectedCardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  selectedCardHint: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 6,
  },
});
