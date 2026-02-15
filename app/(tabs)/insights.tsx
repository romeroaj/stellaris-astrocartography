import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
  SideOfLine,
} from "@/lib/astronomy";
import {
  getInterpretation,
  getPlanetSymbol,
  getPlanetIcon,
  getSideOfLineInfo,
} from "@/lib/interpretations";
import {
  classifyLine,
  lineMatchesKeyword,
  SENTIMENT_COLORS,
  LineSentiment,
} from "@/lib/lineClassification";
import { WORLD_CITIES as CITY_LIST } from "@/lib/cities";
import { getSettings } from "@/lib/storage";
import { filterAstroLines } from "@/lib/settings";
import { useFriendView } from "@/lib/FriendViewContext";

const KEYWORD_TAGS = [
  "love", "money", "career", "home", "creativity",
  "spiritual", "travel", "healing", "leadership", "partnerships",
];

// ── Signal strength bars (small) ──────────────────────────────────
function SignalIcon({ distance, color }: { distance: number; color: string }) {
  const bars = distance < 150 ? 4 : distance < 400 ? 3 : distance < 800 ? 2 : 1;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 1.5, height: 14 }}>
      {[1, 2, 3, 4].map((level) => (
        <View
          key={level}
          style={{
            width: 3.5,
            height: 3 + level * 3,
            borderRadius: 1.5,
            backgroundColor: level <= bars ? color : Colors.dark.textMuted + "40",
          }}
        />
      ))}
    </View>
  );
}

// ── Types ────────────────────────────────────────────────────────
interface CityLineInfo {
  planet: PlanetName;
  lineType: string;
  distance: number;
  influence: string;
  keywords: string[];
  sentiment: LineSentiment;
  side: SideOfLine;
  onPreferredSide: boolean;
}

interface CityAnalysis {
  name: string;
  country: string;
  lat: number;
  lon: number;
  lines: CityLineInfo[];
  positiveCount: number;
  difficultCount: number;
  neutralCount: number;
  score: number;
}

type ActiveTab = "summary" | "best" | "avoid";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [includeMinorPlanets, setIncludeMinorPlanets] = useState(true);

  // Explore tab search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const friendIdParam = Array.isArray(params.viewFriendId) ? params.viewFriendId[0] : params.viewFriendId;
  const friendNameParam = Array.isArray(params.viewFriendName) ? params.viewFriendName[0] : params.viewFriendName;
  const { viewFriendId: ctxFriendId, viewFriendName: ctxFriendName, setFriendView, clearFriendView } = useFriendView();
  const effectiveFriendId = (typeof friendIdParam === "string" && friendIdParam) ? friendIdParam : ctxFriendId;
  const effectiveFriendName = (typeof friendNameParam === "string" && friendNameParam) ? friendNameParam : ctxFriendName;
  const isFriendView = typeof effectiveFriendId === "string" && effectiveFriendId.length > 0;

  useEffect(() => {
    if (friendIdParam && friendNameParam) {
      setFriendView(friendIdParam, friendNameParam);
    }
  }, [friendIdParam, friendNameParam, setFriendView]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      getSettings().then((s) => setIncludeMinorPlanets(s.includeMinorPlanets));
    }, [effectiveFriendId, effectiveFriendName])
  );

  const loadProfile = async () => {
    setLoading(true);
    if (effectiveFriendId) {
      const { fetchFriendProfile } = await import("@/lib/friendProfile");
      const friendData = await fetchFriendProfile(effectiveFriendId, effectiveFriendName || undefined);
      if (friendData) {
        setProfile({
          ...friendData,
          name: effectiveFriendName || friendData.name || "Friend",
        });
      } else {
        Alert.alert("Friend View Unavailable", "Could not load your friend's insights.");
        clearFriendView();
        router.replace({ pathname: "/(tabs)/insights", params: {} });
      }
      setLoading(false);
      return;
    }
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
    const raw = generateAstroLines(positions, gst);
    return filterAstroLines(raw, includeMinorPlanets);
  }, [profile, includeMinorPlanets]);

  // ── City search ──
  const nearbyLines = useMemo(() => {
    if (!searchLocation || astroLines.length === 0) return [];
    return findNearestLines(astroLines, searchLocation.lat, searchLocation.lon, 20);
  }, [searchLocation, astroLines]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
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

  // ── City analysis ──
  const WORLD_CITIES = useMemo(() =>
    CITY_LIST.map((c) => ({ name: c.name, country: c.country, lat: c.latitude, lon: c.longitude })),
  []);

  const allCityAnalyses = useMemo((): CityAnalysis[] => {
    if (astroLines.length === 0) return [];
    const results: CityAnalysis[] = [];

    for (const city of WORLD_CITIES) {
      const nearby = findNearestLines(astroLines, city.lat, city.lon, 15);
      if (nearby.length === 0) continue;

      const lines: CityLineInfo[] = nearby.map((item) => {
        const cls = classifyLine(item.planet, item.lineType);
        const sideInfo = getSideOfLineInfo(item.planet, item.lineType as LineType, cls.sentiment);
        const onPreferred = item.side === "on" || item.side === sideInfo.preferredSide || sideInfo.preferredSide === "both";
        return {
          planet: item.planet,
          lineType: item.lineType,
          distance: item.distance,
          influence: item.influence,
          keywords: cls.keywords,
          sentiment: cls.sentiment,
          side: item.side,
          onPreferredSide: onPreferred,
        };
      });

      const positiveCount = lines.filter((l) => l.sentiment === "positive").length;
      const difficultCount = lines.filter((l) => l.sentiment === "difficult").length;
      const neutralCount = lines.filter((l) => l.sentiment === "neutral").length;

      const posProximity = lines
        .filter((l) => l.sentiment === "positive")
        .reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0);
      const diffProximity = lines
        .filter((l) => l.sentiment === "difficult")
        .reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0);

      // East/west side bonus: preferred side boosts positive, softens difficult
      const sideBonus = lines.reduce((acc, l) => {
        if (l.sentiment === "positive") {
          return acc + (l.onPreferredSide ? 3 : -1);
        }
        if (l.sentiment === "difficult") {
          return acc + (l.onPreferredSide ? 2 : -2);
        }
        return acc;
      }, 0);

      const score = positiveCount * 10 + posProximity * 5 - difficultCount * 8 - diffProximity * 4 + sideBonus;

      results.push({ ...city, lines, positiveCount, difficultCount, neutralCount, score });
    }
    return results;
  }, [astroLines, WORLD_CITIES]);

  // ── Summary stats ──
  const summaryStats = useMemo(() => {
    const totalPositive = allCityAnalyses.reduce((a, c) => a + c.positiveCount, 0);
    const totalDifficult = allCityAnalyses.reduce((a, c) => a + c.difficultCount, 0);
    const totalNeutral = allCityAnalyses.reduce((a, c) => a + c.neutralCount, 0);
    const citiesWithPositive = allCityAnalyses.filter((c) => c.positiveCount > 0).length;
    const citiesWithDifficult = allCityAnalyses.filter((c) => c.difficultCount > 0).length;

    // Theme breakdown across all positive lines
    const themeMap: Record<string, number> = {};
    for (const city of allCityAnalyses) {
      for (const line of city.lines) {
        if (line.sentiment === "positive") {
          for (const kw of KEYWORD_TAGS) {
            if (line.keywords.some((k) => k.includes(kw))) {
              themeMap[kw] = (themeMap[kw] || 0) + 1;
            }
          }
        }
      }
    }
    const topPositiveThemes = Object.entries(themeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    // Top cities
    const sortedBest = [...allCityAnalyses].filter((c) => c.positiveCount > 0).sort((a, b) => b.score - a.score);
    const sortedWorst = [...allCityAnalyses].filter((c) => c.difficultCount > 0).sort((a, b) => {
      const aS = a.lines.filter((l) => l.sentiment === "difficult").reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0) * a.difficultCount;
      const bS = b.lines.filter((l) => l.sentiment === "difficult").reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0) * b.difficultCount;
      return bS - aS;
    });

    return {
      totalPositive, totalDifficult, totalNeutral,
      citiesWithPositive, citiesWithDifficult,
      topPositiveThemes,
      topBest: sortedBest.slice(0, 3),
      topAvoid: sortedWorst.slice(0, 3),
    };
  }, [allCityAnalyses]);

  // ── Filtered lists ──
  const bestPlaces = useMemo(() => {
    let places = allCityAnalyses.filter((c) => c.positiveCount > 0);
    if (keywordFilter.trim()) {
      const term = keywordFilter.toLowerCase().trim();
      places = places
        .map((place) => {
          const matchingLines = place.lines.filter((l) =>
            l.keywords.some((kw) => kw.includes(term))
          );
          const kwScore = matchingLines.reduce((acc, l) => {
            const w = l.sentiment === "positive" ? 10 : l.sentiment === "neutral" ? 4 : -5;
            return acc + w + Math.max(0, 1 - l.distance / 1500) * 5;
          }, 0);
          return { ...place, score: kwScore };
        })
        .filter((p) => p.score > 0);
    }
    return places.sort((a, b) => b.score - a.score);
  }, [allCityAnalyses, keywordFilter]);

  const avoidPlaces = useMemo(() => {
    let places = allCityAnalyses.filter((c) => c.difficultCount > 0);
    if (keywordFilter.trim()) {
      const term = keywordFilter.toLowerCase().trim();
      places = places.filter((c) =>
        c.lines.some((l) => l.sentiment === "difficult" && l.keywords.some((kw) => kw.includes(term)))
      );
    }
    return places.sort((a, b) => {
      const aS = a.lines.filter((l) => l.sentiment === "difficult").reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0) * a.difficultCount;
      const bS = b.lines.filter((l) => l.sentiment === "difficult").reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0) * b.difficultCount;
      return bS - aS;
    });
  }, [allCityAnalyses, keywordFilter]);

  // ── Navigation to city detail ──
  const openCity = (city: CityAnalysis) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/city-detail",
      params: { name: city.name, country: city.country, lat: String(city.lat), lon: String(city.lon) },
    });
  };

  // ── Render: City card for list views ──
  const renderCityCard = (place: CityAnalysis, index: number, mode: "best" | "avoid") => {
    const relevantLines = mode === "avoid"
      ? place.lines.filter((l) => l.sentiment === "difficult")
      : keywordFilter.trim()
        ? place.lines.filter((l) => l.keywords.some((kw) => kw.includes(keywordFilter.toLowerCase().trim())))
        : place.lines.filter((l) => l.sentiment === "positive");

    return (
      <Pressable
        key={`${place.name}-${index}`}
        style={({ pressed }) => [styles.cityCard, pressed && { opacity: 0.85 }]}
        onPress={() => openCity(place)}
      >
        <View style={styles.cityCardHeader}>
          <View style={styles.cityRank}>
            <Text style={styles.cityRankText}>#{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cityName}>{place.name}</Text>
            <Text style={styles.cityCountry}>{place.country}</Text>
          </View>
          <View style={styles.cityBadges}>
            {place.positiveCount > 0 && (
              <View style={[styles.miniBadge, { backgroundColor: SENTIMENT_COLORS.positive + "20" }]}>
                <Text style={[styles.miniBadgeText, { color: SENTIMENT_COLORS.positive }]}>{place.positiveCount}+</Text>
              </View>
            )}
            {place.difficultCount > 0 && (
              <View style={[styles.miniBadge, { backgroundColor: SENTIMENT_COLORS.difficult + "20" }]}>
                <Text style={[styles.miniBadgeText, { color: SENTIMENT_COLORS.difficult }]}>{place.difficultCount}!</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cityLines}>
          {relevantLines.slice(0, 3).map((line, j) => {
            const sentColor = SENTIMENT_COLORS[line.sentiment];
            const sideLabel = line.side === "on" ? "On line" : line.side === "west" ? "W" : "E";
            const sideColor = line.onPreferredSide
              ? "#10B981"
              : line.sentiment === "difficult" ? SENTIMENT_COLORS.difficult : Colors.dark.textMuted;
            return (
              <View key={`${line.planet}-${line.lineType}-${j}`} style={styles.cityLineItem}>
                <SignalIcon distance={line.distance} color={sentColor} />
                <View style={[styles.cityLineDot, { backgroundColor: sentColor }]} />
                <Text style={[styles.cityLineText, { color: sentColor }]}>
                  {getPlanetSymbol(line.planet)} {Colors.lineTypes[line.lineType]?.label}
                </Text>
                <View style={[styles.sidePill, { backgroundColor: sideColor + "18" }]}>
                  <Text style={[styles.sidePillText, { color: sideColor }]}>{sideLabel}</Text>
                </View>
                <Text style={styles.cityLineDist}>{Math.round(line.distance)} km</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.cityFooter}>
          <Text style={styles.cityFooterText}>Tap for full breakdown</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
        </View>
      </Pressable>
    );
  };

  // ── Render: Summary mini city row ──
  const renderMiniCity = (place: CityAnalysis, mode: "best" | "avoid") => {
    const sentColor = mode === "best" ? SENTIMENT_COLORS.positive : SENTIMENT_COLORS.difficult;
    const count = mode === "best" ? place.positiveCount : place.difficultCount;
    return (
      <Pressable
        key={place.name}
        style={({ pressed }) => [styles.miniCityRow, pressed && { opacity: 0.7 }]}
        onPress={() => openCity(place)}
      >
        <Text style={styles.miniCityName}>{place.name}, {place.country}</Text>
        <View style={[styles.miniCityBadge, { backgroundColor: sentColor + "20" }]}>
          <Text style={[styles.miniCityBadgeText, { color: sentColor }]}>
            {count} {mode === "best" ? "positive" : "difficult"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
      </Pressable>
    );
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
        {isFriendView && (
          <View style={styles.friendBanner}>
            <Text style={styles.friendBannerText}>
              Viewing {effectiveFriendName || profile.name}'s insights
            </Text>
            <Pressable
              style={styles.friendBannerClose}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                clearFriendView();
                router.replace({ pathname: "/(tabs)/insights", params: {} });
              }}
            >
              <Ionicons name="close" size={16} color={Colors.dark.primary} />
              <Text style={styles.friendBannerCloseText}>Back to Mine</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.screenTitle}>Insights</Text>
        <View style={styles.tabRow}>
          {(["summary", "best", "avoid"] as ActiveTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "summary" ? "Summary" : tab === "best" ? "Best Places" : "Avoid"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── SUMMARY TAB ── */}
      {activeTab === "summary" && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {/* Stats overview */}
          <LinearGradient
            colors={[Colors.dark.primary + "12", Colors.dark.background]}
            style={styles.overviewCard}
          >
            <Text style={styles.overviewTitle}>Your Astro Profile</Text>
            <Text style={styles.overviewSubtitle}>
              Across {allCityAnalyses.length} major cities worldwide
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: SENTIMENT_COLORS.positive }]}>
                  {summaryStats.totalPositive}
                </Text>
                <Text style={styles.statLabel}>Beneficial Lines</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: SENTIMENT_COLORS.difficult }]}>
                  {summaryStats.totalDifficult}
                </Text>
                <Text style={styles.statLabel}>Challenging Lines</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: SENTIMENT_COLORS.neutral }]}>
                  {summaryStats.totalNeutral}
                </Text>
                <Text style={styles.statLabel}>Neutral Lines</Text>
              </View>
            </View>

            <View style={styles.cityCounts}>
              <View style={styles.cityCountRow}>
                <Ionicons name="checkmark-circle" size={16} color={SENTIMENT_COLORS.positive} />
                <Text style={styles.cityCountText}>
                  <Text style={{ color: SENTIMENT_COLORS.positive, fontFamily: "Outfit_700Bold" }}>
                    {summaryStats.citiesWithPositive}
                  </Text> cities have positive energy for you
                </Text>
              </View>
              <View style={styles.cityCountRow}>
                <Ionicons name="warning" size={16} color={SENTIMENT_COLORS.difficult} />
                <Text style={styles.cityCountText}>
                  <Text style={{ color: SENTIMENT_COLORS.difficult, fontFamily: "Outfit_700Bold" }}>
                    {summaryStats.citiesWithDifficult}
                  </Text> cities have challenging energy
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Search a city */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Explore a City</Text>
            <Text style={styles.sectionDesc}>Search any city to see your full cosmic breakdown there.</Text>
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
              <Pressable style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]} onPress={handleSearch}>
                {searching ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <Ionicons name="search" size={20} color={Colors.dark.background} />
                )}
              </Pressable>
            </View>
            {searchLocation && (
              <Pressable
                style={styles.searchResult}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({
                    pathname: "/city-detail",
                    params: {
                      name: searchLocation.name,
                      country: "",
                      lat: String(searchLocation.lat),
                      lon: String(searchLocation.lon),
                    },
                  });
                }}
              >
                <Ionicons name="location" size={18} color={Colors.dark.primary} />
                <Text style={styles.searchResultText}>{searchLocation.name}</Text>
                <Text style={styles.searchResultCta}>View breakdown →</Text>
              </Pressable>
            )}
          </View>

          {/* Top 3 best */}
          {summaryStats.topBest.length > 0 && (
            <View style={styles.summarySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="heart" size={18} color={SENTIMENT_COLORS.positive} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Top Cities For You</Text>
                <Pressable onPress={() => { setActiveTab("best"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.seeAllText}>See all →</Text>
                </Pressable>
              </View>
              {summaryStats.topBest.map((c) => renderMiniCity(c, "best"))}
            </View>
          )}

          {/* Top 3 avoid */}
          {summaryStats.topAvoid.length > 0 && (
            <View style={styles.summarySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shield" size={18} color={SENTIMENT_COLORS.difficult} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Cities to Be Careful</Text>
                <Pressable onPress={() => { setActiveTab("avoid"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.seeAllText}>See all →</Text>
                </Pressable>
              </View>
              {summaryStats.topAvoid.map((c) => renderMiniCity(c, "avoid"))}
            </View>
          )}

          {/* Strongest themes */}
          {summaryStats.topPositiveThemes.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Your Strongest Themes</Text>
              <Text style={styles.sectionDesc}>
                The themes that come up most across your beneficial planetary lines.
              </Text>
              <View style={styles.themesList}>
                {summaryStats.topPositiveThemes.map(([theme, count]) => (
                  <Pressable
                    key={theme}
                    style={styles.themeRow}
                    onPress={() => {
                      setKeywordFilter(theme);
                      setActiveTab("best");
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.themeIcon}>
                      <Text style={styles.themeEmoji}>
                        {theme === "love" ? "💕" : theme === "money" ? "💰" : theme === "career" ? "🚀" : theme === "home" ? "🏡"
                          : theme === "creativity" ? "🎨" : theme === "spiritual" ? "🔮"
                          : theme === "travel" ? "✈️" : theme === "healing" ? "💚" : theme === "leadership" ? "👑"
                          : "🤝"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.themeRowTitle}>{theme}</Text>
                      <Text style={styles.themeRowCount}>{count} beneficial lines across cities</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ── BEST PLACES TAB ── */}
      {activeTab === "best" && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.tabDesc}>
            Cities ranked by your strongest positive planetary energies.
            {keywordFilter ? ` Filtered for "${keywordFilter}".` : " Tap a keyword to focus."}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {KEYWORD_TAGS.map((kw) => (
              <Pressable
                key={kw}
                style={[styles.chip, keywordFilter.toLowerCase() === kw && styles.chipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setKeywordFilter(keywordFilter.toLowerCase() === kw ? "" : kw);
                }}
              >
                <Text style={[styles.chipText, keywordFilter.toLowerCase() === kw && styles.chipTextActive]}>{kw}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {bestPlaces.length > 0 ? (
            <View style={styles.cityList}>
              {bestPlaces.map((p, i) => renderCityCard(p, i, "best"))}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="telescope-outline" size={32} color={Colors.dark.textMuted} />
              <Text style={styles.noResultsText}>
                {keywordFilter ? `No places found for "${keywordFilter}"` : "No positive places found"}
              </Text>
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ── AVOID TAB ── */}
      {activeTab === "avoid" && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.tabDesc}>
            Cities where challenging planetary energies are strongest.
            Not necessarily bad — just be aware of what you might face.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {KEYWORD_TAGS.map((kw) => (
              <Pressable
                key={kw}
                style={[styles.chip, keywordFilter.toLowerCase() === kw && styles.chipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setKeywordFilter(keywordFilter.toLowerCase() === kw ? "" : kw);
                }}
              >
                <Text style={[styles.chipText, keywordFilter.toLowerCase() === kw && styles.chipTextActive]}>{kw}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {avoidPlaces.length > 0 ? (
            <View style={styles.cityList}>
              {avoidPlaces.map((p, i) => renderCityCard(p, i, "avoid"))}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="shield-checkmark-outline" size={32} color={Colors.dark.success} />
              <Text style={styles.noResultsText}>No strong difficult lines found — lucky you!</Text>
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary },
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.dark.background },
  friendBanner: {
    marginBottom: 10, backgroundColor: Colors.dark.primary + "14",
    borderWidth: 1, borderColor: Colors.dark.primary + "40", borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 10,
  },
  friendBannerText: { flex: 1, color: Colors.dark.primary, fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  friendBannerClose: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.dark.primary + "18" },
  friendBannerCloseText: { color: Colors.dark.primary, fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  screenTitle: { fontSize: 32, fontFamily: "Outfit_700Bold", color: Colors.dark.text, marginBottom: 16 },
  tabRow: { flexDirection: "row", backgroundColor: Colors.dark.card, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: Colors.dark.primary },
  tabText: { fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.textSecondary },
  tabTextActive: { color: Colors.dark.background },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20 },
  // ── Summary ──
  overviewCard: { borderRadius: 20, padding: 24, marginBottom: 24 },
  overviewTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", color: Colors.dark.text, marginBottom: 4 },
  overviewSubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, marginBottom: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Outfit_500Medium", color: Colors.dark.textSecondary, marginTop: 4, textAlign: "center" },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.dark.cardBorder },
  cityCounts: { gap: 8 },
  cityCountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cityCountText: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary },
  summarySection: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, lineHeight: 19, marginBottom: 12 },
  seeAllText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },
  // Themes
  themesList: { gap: 8 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.dark.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  themeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center" },
  themeEmoji: { fontSize: 18 },
  themeRowTitle: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text, textTransform: "capitalize" as const },
  themeRowCount: { fontSize: 12, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  // Mini city rows
  miniCityRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.dark.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  miniCityName: { flex: 1, fontSize: 15, fontFamily: "Outfit_500Medium", color: Colors.dark.text },
  miniCityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  miniCityBadgeText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  // Search
  searchRow: { flexDirection: "row", gap: 12 },
  searchInput: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, fontFamily: "Outfit_400Regular", color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  searchBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center" },
  searchResult: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.dark.card, borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.dark.primary + "40" },
  searchResultText: { flex: 1, fontSize: 15, fontFamily: "Outfit_500Medium", color: Colors.dark.text },
  searchResultCta: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },
  // ── List tabs ──
  tabDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, lineHeight: 21, marginBottom: 14 },
  chipRow: { flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  chipActive: { backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary },
  chipText: { fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.textSecondary, textTransform: "capitalize" as const },
  chipTextActive: { color: Colors.dark.primary },
  cityList: { gap: 12 },
  cityCard: { backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  cityCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  cityRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.primaryMuted, alignItems: "center", justifyContent: "center" },
  cityRankText: { fontSize: 13, fontFamily: "Outfit_700Bold", color: Colors.dark.primary },
  cityName: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
  cityCountry: { fontSize: 12, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  cityBadges: { flexDirection: "row", gap: 4 },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  miniBadgeText: { fontSize: 11, fontFamily: "Outfit_700Bold" },
  cityLines: { gap: 6, marginBottom: 10 },
  cityLineItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: Colors.dark.surface, borderRadius: 10 },
  cityLineDot: { width: 6, height: 6, borderRadius: 3 },
  sidePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sidePillText: { fontSize: 10, fontFamily: "Outfit_700Bold" },
  cityLineText: { flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium" },
  cityLineDist: { fontSize: 11, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
  cityFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  cityFooterText: { fontSize: 12, fontFamily: "Outfit_500Medium", color: Colors.dark.textMuted },
  noResults: { alignItems: "center", gap: 12, paddingVertical: 40 },
  noResultsText: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, textAlign: "center" },
});
