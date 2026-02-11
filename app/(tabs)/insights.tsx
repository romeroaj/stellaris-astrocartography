import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { BirthData, PlanetName, LineType } from "@/lib/types";
import { getActiveProfile } from "@/lib/storage";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  findNearestLines,
} from "@/lib/astronomy";
import {
  getInterpretation,
  getPlanetSymbol,
  getPlanetIcon,
} from "@/lib/interpretations";

const ALL_PLANETS: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"lines" | "explore">("lines");

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
  };

  const astroLines = useMemo(() => {
    if (!profile) return [];
    const [year, month, day] = profile.date.split("-").map(Number);
    const [hour, minute] = profile.time.split(":").map(Number);
    const positions = calculatePlanetPositions(year, month, day, hour, minute, profile.longitude);
    const gst = calculateGST(year, month, day, hour, minute, profile.longitude);
    return generateAstroLines(positions, gst);
  }, [profile]);

  const nearbyLines = useMemo(() => {
    if (!searchLocation || astroLines.length === 0) return [];
    return findNearestLines(astroLines, searchLocation.lat, searchLocation.lon, 20);
  }, [searchLocation, astroLines]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&limit=1`,
        { headers: { "User-Agent": "StellarisMobileApp/1.0" } }
      );
      const data = await response.json();
      if (data.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSearchLocation({
          name: data[0].display_name.split(",").slice(0, 2).join(","),
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        });
      } else {
        Alert.alert("Not Found", "Could not find that location. Try a different search.");
      }
    } catch {
      Alert.alert("Error", "Could not search. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const getInfluenceColor = (influence: string): string => {
    switch (influence) {
      case "very strong": return Colors.dark.primary;
      case "strong": return Colors.dark.secondary;
      case "moderate": return "#43D9AD";
      default: return Colors.dark.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Set up your birth data first</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.screenTitle}>Insights</Text>
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === "lines" && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("lines");
            }}
          >
            <Text style={[styles.tabText, activeTab === "lines" && styles.tabTextActive]}>
              Your Lines
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "explore" && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("explore");
            }}
          >
            <Text style={[styles.tabText, activeTab === "explore" && styles.tabTextActive]}>
              Explore
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === "lines" ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {ALL_PLANETS.map((planet) => (
            <View key={planet} style={styles.planetSection}>
              <View style={styles.planetHeader}>
                <View style={[styles.planetIcon, { backgroundColor: Colors.planets[planet] + "20" }]}>
                  <Ionicons
                    name={getPlanetIcon(planet) as any}
                    size={18}
                    color={Colors.planets[planet]}
                  />
                </View>
                <Text style={[styles.planetName, { color: Colors.planets[planet] }]}>
                  {getPlanetSymbol(planet)}
                </Text>
              </View>
              <View style={styles.linesGrid}>
                {(["MC", "IC", "ASC", "DSC"] as LineType[]).map((lineType) => {
                  const interp = getInterpretation(planet, lineType);
                  return (
                    <Pressable
                      key={`${planet}-${lineType}`}
                      style={({ pressed }) => [
                        styles.lineCard,
                        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/line-detail",
                          params: { planet, lineType },
                        });
                      }}
                    >
                      <View style={styles.lineCardHeader}>
                        <Text style={styles.lineTypeTag}>
                          {Colors.lineTypes[lineType]?.label || lineType}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                      </View>
                      <Text style={styles.lineCardDesc} numberOfLines={2}>
                        {interp.shortDesc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.exploreDesc}>
            Search any city to discover which planetary energies are strongest
            there for you.
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search a city..."
              placeholderTextColor={Colors.dark.textMuted}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Pressable
              style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
              onPress={handleSearch}
            >
              {searching ? (
                <ActivityIndicator size="small" color={Colors.dark.background} />
              ) : (
                <Ionicons name="search" size={20} color={Colors.dark.background} />
              )}
            </Pressable>
          </View>

          {searchLocation && (
            <View style={styles.locationResult}>
              <LinearGradient
                colors={[Colors.dark.card, Colors.dark.surface]}
                style={styles.locationCard}
              >
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={20} color={Colors.dark.primary} />
                  <Text style={styles.locationName}>{searchLocation.name}</Text>
                </View>
                <Text style={styles.locationCoords}>
                  {searchLocation.lat.toFixed(2)}, {searchLocation.lon.toFixed(2)}
                </Text>
              </LinearGradient>

              {nearbyLines.length > 0 ? (
                <View style={styles.analysisContainer}>
                  <Text style={styles.analysisTitle}>Planetary Influences</Text>
                  {nearbyLines.map((item, i) => {
                    const interp = getInterpretation(item.planet, item.lineType);
                    return (
                      <Pressable
                        key={i}
                        style={({ pressed }) => [
                          styles.analysisCard,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: "/line-detail",
                            params: { planet: item.planet, lineType: item.lineType },
                          });
                        }}
                      >
                        <View style={styles.analysisCardTop}>
                          <View style={[styles.analysisDot, { backgroundColor: Colors.planets[item.planet] }]} />
                          <Text style={styles.analysisCardTitle}>
                            {getPlanetSymbol(item.planet)} {Colors.lineTypes[item.lineType]?.label}
                          </Text>
                          <View style={[styles.influenceBadge, { backgroundColor: getInfluenceColor(item.influence) + "20" }]}>
                            <Text style={[styles.influenceText, { color: getInfluenceColor(item.influence) }]}>
                              {item.influence}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.analysisDistance}>
                          {Math.round(item.distance)} km away
                        </Text>
                        <Text style={styles.analysisDesc} numberOfLines={2}>
                          {interp.shortDesc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noResults}>
                  <Ionicons name="telescope-outline" size={32} color={Colors.dark.textMuted} />
                  <Text style={styles.noResultsText}>
                    No strong planetary lines near this location
                  </Text>
                </View>
              )}
            </View>
          )}

          {!searchLocation && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Popular Destinations</Text>
              {[
                { name: "New York", query: "New York, USA" },
                { name: "London", query: "London, UK" },
                { name: "Tokyo", query: "Tokyo, Japan" },
                { name: "Paris", query: "Paris, France" },
                { name: "Bali", query: "Bali, Indonesia" },
                { name: "Sydney", query: "Sydney, Australia" },
              ].map((city) => (
                <Pressable
                  key={city.name}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setSearchQuery(city.query);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="location-outline" size={18} color={Colors.dark.textSecondary} />
                  <Text style={styles.suggestionText}>{city.name}</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.dark.textMuted} />
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { justifyContent: "center", alignItems: "center" },
  emptyText: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.dark.background,
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: { backgroundColor: Colors.dark.primary },
  tabText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
  },
  tabTextActive: { color: Colors.dark.background },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20 },
  planetSection: { marginBottom: 24 },
  planetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  planetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  planetName: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
  },
  linesGrid: { gap: 8 },
  lineCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  lineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  lineTypeTag: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
  lineCardDesc: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  exploreDesc: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  searchRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  searchBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locationResult: { gap: 16 },
  locationCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationName: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  locationCoords: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 4,
    marginLeft: 30,
  },
  analysisContainer: { gap: 10 },
  analysisTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  analysisCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  analysisCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  analysisDot: { width: 10, height: 10, borderRadius: 5 },
  analysisCardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  influenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  influenceText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    textTransform: "uppercase" as const,
  },
  analysisDistance: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  analysisDesc: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  noResults: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
  },
  suggestionsContainer: { gap: 8 },
  suggestionsTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
  },
});
