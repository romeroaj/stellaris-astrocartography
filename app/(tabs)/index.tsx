import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  PanResponder,
  Animated,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { BirthData, PlanetName, AstroLine } from "@/lib/types";
import { getActiveProfile } from "@/lib/storage";
import { authFetch } from "@/lib/auth";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
} from "@/lib/astronomy";
import { getPlanetSymbol } from "@/lib/interpretations";
import {
  classifyLine,
  lineMatchesKeyword,
  LineSentiment,
  SENTIMENT_COLORS,
  SENTIMENT_LABELS,
} from "@/lib/lineClassification";
import AstroMap from "@/components/AstroMap";
import Svg, { Line } from "react-native-svg";
import * as Location from "expo-location";
import { LiveInsightsCard } from "@/components/LiveInsightsCard";

const ALL_PLANETS: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

const ALL_SENTIMENTS: LineSentiment[] = ["positive", "difficult", "neutral"];

const KEYWORD_TAGS = [
  "love", "career", "home", "creativity", "luck",
  "spiritual", "travel", "healing", "leadership", "partnerships",
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabledPlanets, setEnabledPlanets] = useState<Set<PlanetName>>(
    new Set(ALL_PLANETS)
  );

  // Check for Bond params
  const { mode, bondType, partnerName } = params;
  const friendIdParam = Array.isArray(params.viewFriendId) ? params.viewFriendId[0] : params.viewFriendId;
  const friendNameParam = Array.isArray(params.viewFriendName) ? params.viewFriendName[0] : params.viewFriendName;
  const isFriendView = typeof friendIdParam === "string" && friendIdParam.length > 0;

  // ── Live Location Insights State ──
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (mode === "bond" && partnerName) {
      // Temporary acknowledgment until dual-rendering is built
      setTimeout(() => {
        Alert.alert(
          "Bond Initialized",
          `Viewing ${bondType === "synastry" ? "Synastry" : "Composite"} Chart with ${partnerName}.\n\n(Dual-chart rendering coming in next update!)`
        );
      }, 500);
    }
  }, [mode, bondType, partnerName]);

  useEffect(() => {
    if (mode === "bond" && partnerName) {
      // Temporary acknowledgment until dual-rendering is built
      setTimeout(() => {
        Alert.alert(
          "Bond Initialized",
          `Viewing ${bondType === "synastry" ? "Synastry" : "Composite"} Chart with ${partnerName}.\n\n(Dual-chart rendering coming in next update!)`
        );
      }, 500);
    }
  }, [mode, bondType, partnerName]);

  const [selectedLine, setSelectedLine] = useState<AstroLine | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [simplifiedView, setSimplifiedView] = useState(false);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [enabledSentiments, setEnabledSentiments] = useState<Set<LineSentiment>>(
    new Set(ALL_SENTIMENTS)
  );
  const [enabledKeywords, setEnabledKeywords] = useState<Set<string>>(new Set());

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    if (selectedLine) {
      pan.setValue({ x: 0, y: 0 });
    }
  }, [selectedLine]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: Animated.event([null, { dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          setSelectedLine(null);
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [friendIdParam, friendNameParam])
  );

  const loadProfile = async () => {
    setLoading(true);
    if (friendIdParam) {
      const res = await authFetch<{ profile: any }>("GET", `/api/friends/${friendIdParam}/profile`);
      if (res.data?.profile) {
        const fp = res.data.profile;
        setProfile({
          id: `friend_${fp.id}`,
          name: friendNameParam || fp.name || "Friend",
          date: fp.birthDate,
          time: fp.birthTime,
          latitude: fp.latitude,
          longitude: fp.longitude,
          locationName: fp.locationName,
          createdAt: Date.now(),
        });
      } else {
        Alert.alert("Friend View Unavailable", res.error || "Could not load your friend's chart.");
        router.replace("/(tabs)");
      }
      setLoading(false);
      return;
    }
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

  // Combined filter: planets AND sentiments AND keywords
  const visibleLines = useMemo(() => {
    // Pre-compute keyword array once outside loop
    const activeKeywords = enabledKeywords.size > 0 ? Array.from(enabledKeywords) : [];
    const filterBySentiment = enabledSentiments.size < ALL_SENTIMENTS.length;

    return astroLines.filter((line) => {
      // Planet filter
      if (!enabledPlanets.has(line.planet)) return false;

      // Only classify/check if sentiment or keyword filters are active
      if (filterBySentiment || activeKeywords.length > 0) {
        // Sentiment filter
        if (filterBySentiment) {
          const cls = classifyLine(line.planet, line.lineType);
          if (!enabledSentiments.has(cls.sentiment)) return false;
        }

        // Keyword filter using alias expansion
        if (activeKeywords.length > 0) {
          const hasMatch = activeKeywords.some((kw) =>
            lineMatchesKeyword(line.planet, line.lineType, kw)
          );
          if (!hasMatch) return false;
        }
      }

      return true;
    });
  }, [astroLines, enabledPlanets, enabledSentiments, enabledKeywords]);

  // Handle Deep Linking from Learn Tab
  useEffect(() => {
    if (params.planet && params.lineType && visibleLines.length > 0) {
      const target = visibleLines.find(
        (l) => l.planet === params.planet && l.lineType === params.lineType
      );
      if (target) {
        setSelectedLine(target);
      }
    }
  }, [params.planet, params.lineType, visibleLines]);

  // Debounce lines sent to the map to prevent native crash from rapid Polyline updates
  const [debouncedLines, setDebouncedLines] = useState<AstroLine[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLines(visibleLines);
    }, 80);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  const hasActiveFilters = enabledSentiments.size < ALL_SENTIMENTS.length || enabledKeywords.size > 0;

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

  const toggleAllPlanets = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (enabledPlanets.size === ALL_PLANETS.length) {
      setEnabledPlanets(new Set());
    } else {
      setEnabledPlanets(new Set(ALL_PLANETS));
    }
  };

  const toggleSentiment = (sentiment: LineSentiment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabledSentiments((prev) => {
      const next = new Set(prev);
      if (next.has(sentiment)) {
        next.delete(sentiment);
      } else {
        next.add(sentiment);
      }
      return next;
    });
  };

  const toggleKeyword = (keyword: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabledKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEnabledSentiments(new Set(ALL_SENTIMENTS));
    setEnabledKeywords(new Set());
  };

  const handleLocateMe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to your location to show live cosmic insights.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setShowInsights(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Could not fetch location");
    } finally {
      setIsLocating(false);
    }
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

  const allPlanetsEnabled = enabledPlanets.size === ALL_PLANETS.length;

  return (
    <View style={styles.container}>
      <AstroMap
        lines={debouncedLines}
        birthLat={profile.latitude}
        birthLon={profile.longitude}
        colorMode={simplifiedView ? "simplified" : "planet"}
        onLinePress={(line) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelectedLine(line);
        }}
      />

      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        {isFriendView && (
          <View style={styles.friendViewBanner}>
            <Text style={styles.friendViewText}>
              Viewing {friendNameParam || profile.name}'s chart
            </Text>
            <Pressable
              style={({ pressed }) => [styles.friendViewClose, pressed && { opacity: 0.7 }]}
              onPress={() => router.replace("/(tabs)")}
            >
              <Ionicons name="close" size={16} color={Colors.dark.primary} />
              <Text style={styles.friendViewCloseText}>Back to Mine</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>{profile.name}</Text>
            <Text style={styles.headerSubtitle}>
              {profile.locationName.split(",")[0]}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.helpButton,
                pressed && { opacity: 0.7 },
                simplifiedView && styles.helpButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSimplifiedView(!simplifiedView);
              }}
            >
              <Ionicons
                name={simplifiedView ? "color-palette" : "color-palette-outline"}
                size={22}
                color={simplifiedView ? Colors.dark.primary : Colors.dark.textSecondary}
              />
            </Pressable>

            {/* GPS Button */}
            <Pressable
              style={({ pressed }) => [
                styles.helpButton,
                pressed && { opacity: 0.7 },
                isLocating && styles.helpButtonActive,
                showInsights && styles.helpButtonActive,
              ]}
              onPress={() => {
                if (showInsights) {
                  setShowInsights(false);
                } else {
                  handleLocateMe();
                }
              }}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <Ionicons
                  name={showInsights ? "navigate" : "navigate-outline"}
                  size={20}
                  color={(showInsights || isLocating) ? Colors.dark.primary : Colors.dark.textSecondary}
                />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.helpButton,
                pressed && { opacity: 0.7 },
                (showFilters || hasActiveFilters) && styles.helpButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowFilters(!showFilters);
              }}
            >
              <Ionicons
                name={showFilters ? "close" : "funnel"}
                size={20}
                color={(showFilters || hasActiveFilters) ? Colors.dark.primary : Colors.dark.textSecondary}
              />
              {hasActiveFilters && !showFilters && (
                <View style={styles.filterBadge} />
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.helpButton,
                pressed && { opacity: 0.7 },
                showLegend && styles.helpButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLegend(!showLegend);
              }}
            >
              <Ionicons
                name={showLegend ? "close" : "help-circle-outline"}
                size={24}
                color={showLegend ? Colors.dark.primary : Colors.dark.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setShowFilters(false)} />
          <View style={[styles.filterPanel, { top: topInset + 80 }]}>
            {/* Sentiment Row */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Sentiment</Text>
              <View style={styles.filterChipRow}>
                {ALL_SENTIMENTS.map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.filterChip,
                      enabledSentiments.has(s) && {
                        backgroundColor: SENTIMENT_COLORS[s] + "25",
                        borderColor: SENTIMENT_COLORS[s],
                      },
                    ]}
                    onPress={() => toggleSentiment(s)}
                  >
                    <View
                      style={[
                        styles.filterChipDot,
                        { backgroundColor: SENTIMENT_COLORS[s] },
                        !enabledSentiments.has(s) && { opacity: 0.3 },
                      ]}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        enabledSentiments.has(s) && { color: SENTIMENT_COLORS[s] },
                      ]}
                    >
                      {SENTIMENT_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Keyword Tags Row */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Themes</Text>
              <View style={styles.filterChipWrap}>
                {KEYWORD_TAGS.map((kw) => (
                  <Pressable
                    key={kw}
                    style={[
                      styles.filterChip,
                      enabledKeywords.has(kw) && styles.filterChipActive,
                    ]}
                    onPress={() => toggleKeyword(kw)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        enabledKeywords.has(kw) && styles.filterChipTextActive,
                      ]}
                    >
                      {kw}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Clear button */}
            {hasActiveFilters && (
              <Pressable
                style={({ pressed }) => [
                  styles.clearFiltersBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={clearAllFilters}
              >
                <Ionicons name="refresh" size={14} color={Colors.dark.primary} />
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      {/* ── Planet Chips (bottom) ── */}
      <View style={styles.legendContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendScroll}>
          {/* Select/Deselect All button */}
          <Pressable
            style={[
              styles.planetChip,
              allPlanetsEnabled
                ? { backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary }
                : {},
            ]}
            onPress={toggleAllPlanets}
          >
            <Ionicons
              name={allPlanetsEnabled ? "checkmark-done" : "ellipse-outline"}
              size={14}
              color={allPlanetsEnabled ? Colors.dark.primary : Colors.dark.textMuted}
            />
            <Text
              style={[
                styles.planetChipText,
                allPlanetsEnabled && { color: Colors.dark.primary },
              ]}
            >
              All
            </Text>
          </Pressable>

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

      {showLegend && (
        <View style={[styles.lineTypeLegend, { top: topInset + 80 }]}>
          {Object.entries(Colors.lineTypes).map(([key, val]) => (
            <View key={key} style={styles.lineTypeItem}>
              <View style={styles.lineTypeSample}>
                <Svg height="2" width="40">
                  <Line
                    x1="0"
                    y1="1"
                    x2="40"
                    y2="1"
                    stroke={Colors.dark.textSecondary}
                    strokeWidth="2"
                    strokeDasharray={val.dash}
                  />
                </Svg>
              </View>
              <Text style={styles.lineTypeLabel}>{val.label}</Text>
            </View>
          ))}
        </View>
      )}

      {simplifiedView && !showFilters && (
        <View style={[styles.sentimentLegend, { top: topInset + 80 }]}>
          {ALL_SENTIMENTS.map((key) => (
            <View key={key} style={styles.lineTypeItem}>
              <View
                style={[
                  styles.sentimentDot,
                  { backgroundColor: SENTIMENT_COLORS[key] },
                ]}
              />
              <Text style={styles.lineTypeLabel}>{SENTIMENT_LABELS[key]}</Text>
            </View>
          ))}
        </View>
      )}

      {selectedLine && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedLine(null)}
          />
          <Animated.View
            style={[
              styles.selectedOverlay,
              { transform: [{ translateY: pan.y }] },
            ]}
            {...panResponder.panHandlers}
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
                <View
                  style={[
                    styles.selectedDot,
                    { backgroundColor: getLineColor(selectedLine.planet) },
                  ]}
                />
                <Text style={styles.selectedCardTitle}>
                  {getPlanetSymbol(selectedLine.planet)}{" "}
                  {Colors.lineTypes[selectedLine.lineType]?.label ||
                    selectedLine.lineType}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.dark.textSecondary}
                />
              </View>
              <Text style={styles.selectedCardHint}>
                Tap to learn what this line means for you
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Live Insights Overlay */}
      {showInsights && (
        <LiveInsightsCard
          location={userLocation}
          birthProfile={profile}
          onClose={() => setShowInsights(false)}
        />
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
  friendViewBanner: {
    marginBottom: 10,
    backgroundColor: Colors.dark.primary + "14",
    borderWidth: 1,
    borderColor: Colors.dark.primary + "40",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  friendViewText: {
    flex: 1,
    color: Colors.dark.primary,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
  },
  friendViewClose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary + "18",
  },
  friendViewCloseText: {
    color: Colors.dark.primary,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
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
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  helpButtonActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryMuted,
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    zIndex: 20,
  },
  // ── Filter Panel ──
  filterPanel: {
    zIndex: 30,
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 14,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  filterChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "capitalize" as const,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primaryMuted,
    borderColor: Colors.dark.primary,
  },
  filterChipTextActive: {
    color: Colors.dark.primary,
  },
  clearFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  clearFiltersText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.primary,
  },
  // ── Planet Legend (bottom) ──
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
  // ── Line Type Legend ──
  lineTypeLegend: {
    position: "absolute",
    right: 16,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 12,
  },
  lineTypeItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineTypeSample: { width: 40, height: 12, justifyContent: "center" },
  lineTypeLabel: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
  },
  // ── Sentiment Legend ──
  sentimentLegend: {
    position: "absolute",
    left: 16,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 12,
  },
  sentimentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // ── Selected Line Card ──
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
