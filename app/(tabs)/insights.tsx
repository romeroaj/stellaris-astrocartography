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
import {
  classifyLine,
  SENTIMENT_COLORS,
  SENTIMENT_LABELS,
  LineSentiment,
} from "@/lib/lineClassification";

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
  const [activeTab, setActiveTab] = useState<"great" | "explore">("great");
  const [keywordFilter, setKeywordFilter] = useState("");

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

  // ── Great Places computation ────────────────────────────────────
  const WORLD_CITIES = useMemo(() => [
    { name: "New York", country: "USA", lat: 40.7128, lon: -74.006 },
    { name: "Los Angeles", country: "USA", lat: 34.0522, lon: -118.2437 },
    { name: "London", country: "UK", lat: 51.5074, lon: -0.1278 },
    { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
    { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
    { name: "Bali", country: "Indonesia", lat: -8.3405, lon: 115.092 },
    { name: "Barcelona", country: "Spain", lat: 41.3851, lon: 2.1734 },
    { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
    { name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
    { name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708 },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
    { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332 },
    { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816 },
    { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241 },
    { name: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
    { name: "Lisbon", country: "Portugal", lat: 38.7223, lon: -9.1393 },
    { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
    { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
    { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784 },
    { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
    { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729 },
    { name: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207 },
    { name: "Honolulu", country: "USA", lat: 21.3069, lon: -157.8583 },
    { name: "Reykjavik", country: "Iceland", lat: 64.1466, lon: -21.9426 },
    { name: "Marrakech", country: "Morocco", lat: 31.6295, lon: -7.9811 },
    { name: "Athens", country: "Greece", lat: 37.9838, lon: 23.7275 },
    { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
    { name: "San Francisco", country: "USA", lat: 37.7749, lon: -122.4194 },
    { name: "Miami", country: "USA", lat: 25.7617, lon: -80.1918 },
  ], []);

  interface GreatPlace {
    name: string;
    country: string;
    lat: number;
    lon: number;
    positiveLines: { planet: PlanetName; lineType: string; distance: number; keywords: string[]; sentiment: LineSentiment }[];
    score: number;
  }

  const greatPlaces = useMemo((): GreatPlace[] => {
    if (astroLines.length === 0) return [];

    const results: GreatPlace[] = [];

    for (const city of WORLD_CITIES) {
      const nearby = findNearestLines(astroLines, city.lat, city.lon, 15);
      const positiveLines: GreatPlace["positiveLines"] = [];

      for (const item of nearby) {
        const cls = classifyLine(item.planet, item.lineType);
        positiveLines.push({
          planet: item.planet,
          lineType: item.lineType,
          distance: item.distance,
          keywords: cls.keywords,
          sentiment: cls.sentiment,
        });
      }

      // Score: heavily weight positive lines, slightly penalize difficult
      const posCount = positiveLines.filter((l) => l.sentiment === "positive").length;
      const proximity = positiveLines
        .filter((l) => l.sentiment === "positive")
        .reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0);
      const score = posCount * 10 + proximity * 5;

      if (posCount > 0) {
        results.push({
          ...city,
          positiveLines,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [astroLines, WORLD_CITIES]);

  const filteredGreatPlaces = useMemo(() => {
    if (!keywordFilter.trim()) return greatPlaces;
    const term = keywordFilter.toLowerCase().trim();
    return greatPlaces.filter((place) =>
      place.positiveLines.some((line) =>
        line.keywords.some((kw) => kw.includes(term))
      )
    );
  }, [greatPlaces, keywordFilter]);

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
            style={[styles.tab, activeTab === "great" && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("great");
            }}
          >
            <Text style={[styles.tabText, activeTab === "great" && styles.tabTextActive]}>
              Great Places
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

      {activeTab === "great" ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.exploreDesc}>
            Discover the best places in the world for you based on your positive planetary lines.
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={keywordFilter}
              onChangeText={setKeywordFilter}
              placeholder="Filter by keyword (love, career, home...)"
              placeholderTextColor={Colors.dark.textMuted}
              returnKeyType="search"
            />
            {keywordFilter.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setKeywordFilter("")}
              >
                <Ionicons name="close" size={20} color={Colors.dark.background} />
              </Pressable>
            )}
          </View>

          {/* Keyword suggestion chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.keywordChipRow}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          >
            {["love", "career", "home", "creativity", "luck", "spiritual", "travel", "healing"].map((kw) => (
              <Pressable
                key={kw}
                style={[
                  styles.keywordChip,
                  keywordFilter.toLowerCase() === kw && styles.keywordChipActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setKeywordFilter(keywordFilter.toLowerCase() === kw ? "" : kw);
                }}
              >
                <Text
                  style={[
                    styles.keywordChipText,
                    keywordFilter.toLowerCase() === kw && styles.keywordChipTextActive,
                  ]}
                >
                  {kw}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {filteredGreatPlaces.length > 0 ? (
            <View style={styles.analysisContainer}>
              {filteredGreatPlaces.map((place, i) => {
                const posLines = place.positiveLines.filter((l) => l.sentiment === "positive");
                const relevantLines = keywordFilter.trim()
                  ? place.positiveLines.filter((l) =>
                    l.keywords.some((kw) => kw.includes(keywordFilter.toLowerCase().trim()))
                  )
                  : posLines;
                return (
                  <View key={`${place.name}-${i}`} style={styles.greatPlaceCard}>
                    <View style={styles.greatPlaceHeader}>
                      <View style={styles.greatPlaceRank}>
                        <Text style={styles.greatPlaceRankText}>#{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.greatPlaceName}>{place.name}</Text>
                        <Text style={styles.greatPlaceCountry}>{place.country}</Text>
                      </View>
                      <View style={styles.greatPlaceBadge}>
                        <Ionicons name="star" size={12} color={Colors.dark.primary} />
                        <Text style={styles.greatPlaceBadgeText}>
                          {posLines.length} positive
                        </Text>
                      </View>
                    </View>
                    <View style={styles.greatPlaceLines}>
                      {relevantLines.slice(0, 4).map((line, j) => (
                        <Pressable
                          key={`${line.planet}-${line.lineType}-${j}`}
                          style={({ pressed }) => [
                            styles.greatPlaceLineItem,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({
                              pathname: "/line-detail",
                              params: { planet: line.planet, lineType: line.lineType },
                            });
                          }}
                        >
                          <View
                            style={[
                              styles.greatPlaceLineDot,
                              { backgroundColor: SENTIMENT_COLORS[line.sentiment] },
                            ]}
                          />
                          <Text style={styles.greatPlaceLineText}>
                            {getPlanetSymbol(line.planet)} {Colors.lineTypes[line.lineType]?.label}
                          </Text>
                          <Text style={styles.greatPlaceLineDist}>
                            {Math.round(line.distance)} km
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {relevantLines.length > 0 && (
                      <View style={styles.greatPlaceThemes}>
                        {relevantLines
                          .flatMap((l) => l.keywords.slice(0, 3))
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .slice(0, 5)
                          .map((theme) => (
                            <View key={theme} style={styles.themeBadge}>
                              <Text style={styles.themeBadgeText}>{theme}</Text>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="telescope-outline" size={32} color={Colors.dark.textMuted} />
              <Text style={styles.noResultsText}>
                {keywordFilter
                  ? `No great places found for "${keywordFilter}"`
                  : "No great places found"}
              </Text>
            </View>
          )}
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
  // ── Great Places styles ──────────────────────────
  keywordChipRow: {
    flexGrow: 0,
  },
  keywordChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  keywordChipActive: {
    backgroundColor: Colors.dark.primaryMuted,
    borderColor: Colors.dark.primary,
  },
  keywordChipText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "capitalize" as const,
  },
  keywordChipTextActive: {
    color: Colors.dark.primary,
  },
  greatPlaceCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  greatPlaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  greatPlaceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  greatPlaceRankText: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.primary,
  },
  greatPlaceName: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  greatPlaceCountry: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  greatPlaceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.primaryMuted,
  },
  greatPlaceBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
  greatPlaceLines: {
    gap: 6,
    marginBottom: 10,
  },
  greatPlaceLineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
  },
  greatPlaceLineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  greatPlaceLineText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
  },
  greatPlaceLineDist: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
  greatPlaceThemes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  themeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.secondaryMuted,
  },
  themeBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.secondary,
    textTransform: "capitalize" as const,
  },
});
