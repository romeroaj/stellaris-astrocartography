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
import { BirthData, PlanetName, LineType, LineActivation } from "@/lib/types";
import { getActiveProfile, formatDistance, DistanceUnit, getSettings } from "@/lib/storage";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  findNearestLines,
  SideOfLine,
} from "@/lib/astronomy";
import {
  getPlanetSymbol,
  getPlanetIcon,
  getSideOfLineInfo,
  getInterpretation,
} from "@/lib/interpretations";
import {
  classifyLine,
  SENTIMENT_COLORS,
  LineSentiment,
} from "@/lib/lineClassification";
import { WORLD_CITIES as CITY_LIST } from "@/lib/cities";
import { filterAstroLines, filterNearbyByImpact } from "@/lib/settings";
import { useFriendView } from "@/lib/FriendViewContext";
import {
  getCurrentActivations,
  getTransitSynthesis,
  type TransitSynthesisRange,
  type TransitSynthesis,
} from "@/lib/transits";
import TimeScrubber from "@/components/TimeScrubber";
import * as Location from "expo-location";

const KEYWORD_TAGS = [
  "love", "money", "career", "home", "creativity",
  "spiritual", "travel", "healing", "leadership", "partnerships",
];

function SignalIcon({ distance, color }: { distance: number; color: string }) {
  const bars = distance < 282 ? 4 : distance < 483 ? 3 : distance < 966 ? 2 : 1;
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

interface CityLineInfo {
  planet: PlanetName;
  lineType: LineType;
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

type ActiveTab = "summary" | "transits" | "places";
type PlacesMode = "best" | "avoid";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [placesMode, setPlacesMode] = useState<PlacesMode>("best");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [includeMinorPlanets, setIncludeMinorPlanets] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const [hideMildImpacts, setHideMildImpacts] = useState(false);

  // Current location
  const [currentCity, setCurrentCity] = useState<string | null>(null);

  // Cyclocartography time state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeLines, setActiveLines] = useState<LineActivation[]>([]);

  // Transit synthesis: best/worst places in 1m/3m/1y
  const [synthesisRange, setSynthesisRange] = useState<TransitSynthesisRange>("3m");
  const [transitSynthesis, setTransitSynthesis] = useState<TransitSynthesis | null>(null);

  // City search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{
    name: string; lat: number; lon: number;
  } | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const friendIdParam = Array.isArray(params.viewFriendId) ? params.viewFriendId[0] : params.viewFriendId;
  const friendNameParam = Array.isArray(params.viewFriendName) ? params.viewFriendName[0] : params.viewFriendName;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const { viewFriendId: ctxFriendId, viewFriendName: ctxFriendName, setFriendView, clearFriendView } = useFriendView();
  const effectiveFriendId = (typeof friendIdParam === "string" && friendIdParam) ? friendIdParam : ctxFriendId;
  const effectiveFriendName = (typeof friendNameParam === "string" && friendNameParam) ? friendNameParam : ctxFriendName;
  const isFriendView = typeof effectiveFriendId === "string" && effectiveFriendId.length > 0;

  useEffect(() => {
    if (friendIdParam && friendNameParam) {
      setFriendView(friendIdParam, friendNameParam);
    }
  }, [friendIdParam, friendNameParam, setFriendView]);

  useEffect(() => {
    if (tabParam === "summary" || tabParam === "transits" || tabParam === "places") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Get user's current city name
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getLastKnownPositionAsync();
        if (!loc) return;
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo) {
          setCurrentCity(geo.city || geo.subregion || geo.region || null);
        }
      } catch {}
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      getSettings().then((s) => {
        setIncludeMinorPlanets(s.includeMinorPlanets);
        setDistanceUnit(s.distanceUnit);
        setHideMildImpacts(s.hideMildImpacts);
      });
    }, [effectiveFriendId, effectiveFriendName])
  );

  const loadProfile = async () => {
    setLoading(true);
    if (effectiveFriendId) {
      const { fetchFriendProfile } = await import("@/lib/friendProfile");
      const friendData = await fetchFriendProfile(effectiveFriendId, effectiveFriendName || undefined);
      if (friendData) {
        setProfile({ ...friendData, name: effectiveFriendName || friendData.name || "Friend" });
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

  // Cyclocartography: compute active transits
  useEffect(() => {
    if (!profile) { setActiveLines([]); return; }
    try {
      const activations = getCurrentActivations(
        profile.date, profile.time, profile.longitude, selectedDate
      );
      setActiveLines(activations);
    } catch {
      setActiveLines([]);
    }
  }, [profile, selectedDate]);

  // Transit synthesis: best/intense places in 1m/3m/1y
  useEffect(() => {
    if (!profile) { setTransitSynthesis(null); return; }
    try {
      const syn = getTransitSynthesis(
        profile.date, profile.time, profile.longitude,
        synthesisRange, undefined, hideMildImpacts
      );
      setTransitSynthesis(syn);
    } catch {
      setTransitSynthesis(null);
    }
  }, [profile, synthesisRange, hideMildImpacts]);

  const astroLines = useMemo(() => {
    if (!profile) return [];
    const [year, month, day] = profile.date.split("-").map(Number);
    const [hour, minute] = profile.time.split(":").map(Number);
    const positions = calculatePlanetPositions(year, month, day, hour, minute, profile.longitude);
    const gst = calculateGST(year, month, day, hour, minute, profile.longitude);
    const raw = generateAstroLines(positions, gst);
    return filterAstroLines(raw, includeMinorPlanets);
  }, [profile, includeMinorPlanets]);

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

  // City analysis
  const WORLD_CITIES = useMemo(() =>
    CITY_LIST.map((c) => ({ name: c.name, country: c.country, lat: c.latitude, lon: c.longitude })),
  []);

  const allCityAnalyses = useMemo((): CityAnalysis[] => {
    if (astroLines.length === 0) return [];
    const results: CityAnalysis[] = [];

    for (const city of WORLD_CITIES) {
      const nearby = filterNearbyByImpact(
        findNearestLines(astroLines, city.lat, city.lon, 12),
        hideMildImpacts
      );
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

      const posStrength = lines
        .filter((l) => l.sentiment === "positive")
        .reduce((acc, l) => acc + Math.exp(-0.693 * l.distance / 310), 0);
      const diffStrength = lines
        .filter((l) => l.sentiment === "difficult")
        .reduce((acc, l) => acc + Math.exp(-0.693 * l.distance / 310), 0);

      const sideBonus = lines.reduce((acc, l) => {
        if (l.sentiment === "positive") return acc + (l.onPreferredSide ? 3 : -1);
        if (l.sentiment === "difficult") return acc + (l.onPreferredSide ? 2 : -2);
        return acc;
      }, 0);

      const score = positiveCount * 8 + posStrength * 12 - difficultCount * 6 - diffStrength * 10 + sideBonus;
      results.push({ ...city, lines, positiveCount, difficultCount, neutralCount, score });
    }
    return results;
  }, [astroLines, WORLD_CITIES, hideMildImpacts]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const citiesWithPositive = allCityAnalyses.filter((c) => c.positiveCount > 0).length;
    const citiesWithDifficult = allCityAnalyses.filter((c) => c.difficultCount > 0).length;

    const sortedBest = [...allCityAnalyses].filter((c) => c.positiveCount > 0).sort((a, b) => b.score - a.score);
    const sortedWorst = [...allCityAnalyses].filter((c) => c.difficultCount > 0).sort((a, b) => {
      const aS = a.lines.filter((l) => l.sentiment === "difficult").reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0) * a.difficultCount;
      const bS = b.lines.filter((l) => l.sentiment === "difficult").reduce((acc, l) => acc + Math.max(0, 1 - l.distance / 1500), 0) * b.difficultCount;
      return bS - aS;
    });

    return {
      citiesWithPositive, citiesWithDifficult,
      topBest: sortedBest.slice(0, 3),
      topAvoid: sortedWorst.slice(0, 3),
    };
  }, [allCityAnalyses]);

  // Current location transit summary
  const locationSummary = useMemo(() => {
    if (!currentCity || activeLines.length === 0) return null;
    const hereActivations = activeLines.filter((a) => a.intensity === "exact" || a.intensity === "strong");
    if (hereActivations.length === 0) return null;
    return hereActivations.slice(0, 3);
  }, [currentCity, activeLines]);

  const activationKey = (activation: LineActivation) =>
    `${activation.source}-${activation.transitPlanet}-${activation.aspect}-${activation.natalPlanet}`;

  const transitImpactsByActivation = useMemo(() => {
    const intensityWeight: Record<LineActivation["intensity"], number> = {
      exact: 1,
      strong: 0.85,
      moderate: 0.65,
      fading: 0.45,
    };

    const map = new Map<string, { city: string; country: string; strength: number; influence: string; lineType: LineType }[]>();
    activeLines.forEach((activation) => {
      const impacted = allCityAnalyses
        .map((city) => {
          const hit = city.lines
            .filter((line) => line.planet === activation.natalPlanet)
            .sort((a, b) => a.distance - b.distance)[0];
          if (!hit) return null;
          const lineStrength = Math.exp(-0.693 * hit.distance / 310);
          return {
            city: city.name,
            country: city.country,
            strength: lineStrength * intensityWeight[activation.intensity],
            influence: hit.influence,
            lineType: hit.lineType,
          };
        })
        .filter((item): item is { city: string; country: string; strength: number; influence: string; lineType: LineType } => !!item)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 3);
      map.set(activationKey(activation), impacted);
    });
    return map;
  }, [activeLines, allCityAnalyses]);

  const jumpToMapTransit = (activation: LineActivation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const paramsToMap: Record<string, string> = {
      focusTransit: "1",
      transitDate: selectedDate.toISOString(),
      transitPlanet: activation.transitPlanet,
      natalPlanet: activation.natalPlanet,
    };
    if (isFriendView && effectiveFriendId && effectiveFriendName) {
      paramsToMap.viewFriendId = effectiveFriendId;
      paramsToMap.viewFriendName = effectiveFriendName;
    }
    router.push({ pathname: "/(tabs)", params: paramsToMap });
  };

  // Filtered lists
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

  const openCity = (city: CityAnalysis) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const p: Record<string, string> = { name: city.name, country: city.country, lat: String(city.lat), lon: String(city.lon) };
    if (isFriendView && effectiveFriendId && effectiveFriendName) {
      p.viewFriendId = effectiveFriendId;
      p.viewFriendName = effectiveFriendName;
    }
    router.push({ pathname: "/city-detail", params: p });
  };

  // Render: City card
  const renderCityCard = (place: CityAnalysis, index: number, mode: "best" | "avoid") => {
    const intensityOrder: Record<LineActivation["intensity"], number> = {
      exact: 0,
      strong: 1,
      moderate: 2,
      fading: 3,
    };
    const strongestLines = [...place.lines].sort((a, b) => a.distance - b.distance).slice(0, 2);
    const anchorLine = strongestLines[0];
    const anchorInterp = anchorLine ? getInterpretation(anchorLine.planet, anchorLine.lineType) : null;
    const transitHits = activeLines
      .filter((a) => place.lines.some((line) => line.planet === a.natalPlanet))
      .sort((a, b) => {
        const intensityDiff = intensityOrder[a.intensity] - intensityOrder[b.intensity];
        if (intensityDiff !== 0) return intensityDiff;
        return a.orb - b.orb;
      })
      .slice(0, 2);
    const dominantColor = mode === "best" ? SENTIMENT_COLORS.positive : SENTIMENT_COLORS.difficult;

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
          <Text style={[styles.citySignalLabel, { color: dominantColor }]}>
            {mode === "best" ? "Supportive" : "Watchlist"}
          </Text>
        </View>
        <View style={styles.citySignalRow}>
          {strongestLines.map((line, j) => {
            const sentColor = SENTIMENT_COLORS[line.sentiment];
            return (
              <View key={`${line.planet}-${line.lineType}-${j}`} style={styles.citySignalChip}>
                <SignalIcon distance={line.distance} color={sentColor} />
                <Text style={[styles.citySignalChipText, { color: sentColor }]}>
                  {getPlanetSymbol(line.planet)} {line.lineType}
                </Text>
                <Text style={styles.citySignalChipDist}>
                  {formatDistance(line.distance, distanceUnit)}
                </Text>
              </View>
            );
          })}
        </View>
        {!!anchorInterp?.livingHere && (
          <Text style={styles.citySummaryText} numberOfLines={2}>
            <Text style={styles.citySummaryLabel}>Living: </Text>
            {anchorInterp.livingHere}
          </Text>
        )}
        {!!anchorInterp?.visitingHere && (
          <Text style={styles.citySummaryText} numberOfLines={2}>
            <Text style={styles.citySummaryLabel}>Visiting: </Text>
            {anchorInterp.visitingHere}
          </Text>
        )}
        {transitHits.length > 0 && (
          <View style={styles.cityTransitNow}>
            <Ionicons name="pulse-outline" size={13} color={Colors.dark.secondary} />
            <Text style={styles.cityTransitNowText} numberOfLines={2}>
              Transit now: {transitHits.map((hit) => `${getPlanetSymbol(hit.transitPlanet)}→${getPlanetSymbol(hit.natalPlanet)} (${hit.intensity})`).join(" • ")}
            </Text>
          </View>
        )}
        <View style={styles.cityFooter}>
          <Text style={styles.cityFooterText}>Tap for full breakdown</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
        </View>
      </Pressable>
    );
  };

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

  const activePlaces = placesMode === "best" ? bestPlaces : avoidPlaces;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        {isFriendView && (
          <View style={styles.friendBanner}>
            <Text style={styles.friendBannerText}>
              Viewing {effectiveFriendName || profile.name}&apos;s insights
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
          {(["summary", "transits", "places"] as ActiveTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "summary" ? "Summary" : tab === "transits" ? "Transits" : "Places"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── SUMMARY TAB ── */}
      {activeTab === "summary" && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {/* Right Now card */}
          <LinearGradient
            colors={[Colors.dark.primary + "12", Colors.dark.background]}
            style={styles.overviewCard}
          >
            <View style={styles.nowHeader}>
              <Ionicons name="location" size={18} color={Colors.dark.primary} />
              <Text style={styles.nowTitle}>Right Now</Text>
            </View>
            <Text style={styles.nowLocation}>
              {currentCity || "Location unavailable"}
            </Text>
            <Text style={styles.nowLocationSecondary}>
              Birth base: {profile.locationName.split(",")[0]}
            </Text>
            {locationSummary && locationSummary.length > 0 ? (
              <View style={styles.nowTransits}>
                {locationSummary.map((a, i) => {
                  const planetColor = Colors.planets[a.natalPlanet] || "#FFF";
                  return (
                    <View key={`now-${i}`} style={styles.nowTransitRow}>
                      <View style={[styles.nowDot, { backgroundColor: planetColor }]} />
                      <Text style={styles.nowTransitText}>
                        {getPlanetSymbol(a.transitPlanet)} {a.aspect} {getPlanetSymbol(a.natalPlanet)} — {a.insight}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.nowQuiet}>No strong transits hitting your lines right now. Smooth sailing.</Text>
            )}
            <Text style={styles.nowExplain}>
              These transits activate your natal lines globally. City impact depends on where those natal lines run.
            </Text>
            <View style={styles.nowStats}>
              <View style={styles.nowStatItem}>
                <Text style={[styles.nowStatNum, { color: SENTIMENT_COLORS.positive }]}>{summaryStats.citiesWithPositive}</Text>
                <Text style={styles.nowStatLabel}>cities supportive</Text>
              </View>
              <View style={styles.nowStatDivider} />
              <View style={styles.nowStatItem}>
                <Text style={[styles.nowStatNum, { color: SENTIMENT_COLORS.difficult }]}>{summaryStats.citiesWithDifficult}</Text>
                <Text style={styles.nowStatLabel}>cities challenging</Text>
              </View>
              <View style={styles.nowStatDivider} />
              <View style={styles.nowStatItem}>
                <Text style={[styles.nowStatNum, { color: Colors.dark.secondary }]}>{activeLines.length}</Text>
                <Text style={styles.nowStatLabel}>active transits</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Explore a city */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Explore a City</Text>
            <Text style={styles.sectionDesc}>Search any city to see your full cosmic breakdown.</Text>
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
                  const p: Record<string, string> = {
                    name: searchLocation.name, country: "",
                    lat: String(searchLocation.lat), lon: String(searchLocation.lon),
                  };
                  if (isFriendView && effectiveFriendId && effectiveFriendName) {
                    p.viewFriendId = effectiveFriendId;
                    p.viewFriendName = effectiveFriendName;
                  }
                  router.push({ pathname: "/city-detail", params: p });
                }}
              >
                <Ionicons name="location" size={18} color={Colors.dark.primary} />
                <Text style={styles.searchResultText}>{searchLocation.name}</Text>
                <Text style={styles.searchResultCta}>View breakdown</Text>
              </Pressable>
            )}
          </View>

          {/* Top best */}
          {summaryStats.topBest.length > 0 && (
            <View style={styles.summarySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="heart" size={18} color={SENTIMENT_COLORS.positive} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Top Cities For You</Text>
                <Pressable onPress={() => { setPlacesMode("best"); setActiveTab("places"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              </View>
              {summaryStats.topBest.map((c) => renderMiniCity(c, "best"))}
            </View>
          )}

          {/* Top avoid */}
          {summaryStats.topAvoid.length > 0 && (
            <View style={styles.summarySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shield" size={18} color={SENTIMENT_COLORS.difficult} />
                <Text style={[styles.sectionTitle, { flex: 1 }]}>Cities to Watch</Text>
                <Pressable onPress={() => { setPlacesMode("avoid"); setActiveTab("places"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              </View>
              {summaryStats.topAvoid.map((c) => renderMiniCity(c, "avoid"))}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ── TRANSITS TAB ── */}
      {activeTab === "transits" && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <View style={styles.summarySection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="pulse" size={18} color={Colors.dark.secondary} />
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Active Transits</Text>
              <View style={styles.activeLinesCount}>
                <Text style={styles.activeLinesCountText}>{activeLines.length} active</Text>
              </View>
            </View>
            <Text style={styles.sectionDesc}>
              Lines currently activated by planetary transits, including top impacted cities. Scrub time to see past and future.
            </Text>
            <Text style={styles.sectionSubtle}>
              One transit can impact many far-apart cities at once because it activates a natal planet globally (MC/IC/ASC/DSC lines worldwide).
            </Text>
            <TimeScrubber
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              compact={false}
            />

            {/* When & Where: best/intense places in 1m/3m/1y */}
            {transitSynthesis && (transitSynthesis.optimal.length > 0 || transitSynthesis.intense.length > 0) && (
              <View style={styles.summarySection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.dark.primary} />
                  <Text style={[styles.sectionTitle, { flex: 1 }]}>When & Where</Text>
                </View>
                <Text style={styles.sectionDesc}>
                  Best and most impactful places to visit in the next period, based on transit activations.
                </Text>
                <View style={styles.synthesisRangeRow}>
                  {(["1m", "3m", "1y"] as TransitSynthesisRange[]).map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.synthesisRangeBtn, synthesisRange === r && styles.synthesisRangeBtnActive]}
                      onPress={() => { setSynthesisRange(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                      <Text style={[styles.synthesisRangeText, synthesisRange === r && styles.synthesisRangeTextActive]}>
                        {r === "1m" ? "1 month" : r === "3m" ? "3 months" : "1 year"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {transitSynthesis.optimal.length > 0 && (
                  <View style={styles.synthesisListSection}>
                    <Text style={[styles.synthesisListTitle, { color: SENTIMENT_COLORS.positive }]}>Optimal for flow</Text>
                    {transitSynthesis.optimal.slice(0, 5).map((c, i) => (
                      <Pressable
                        key={`opt-${c.name}-${i}`}
                        style={({ pressed }) => [styles.synthesisCityRow, pressed && { opacity: 0.7 }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const p: Record<string, string> = { name: c.name, country: c.country, lat: String(c.lat), lon: String(c.lon) };
                          if (isFriendView && effectiveFriendId && effectiveFriendName) {
                            p.viewFriendId = effectiveFriendId;
                            p.viewFriendName = effectiveFriendName;
                          }
                          router.push({ pathname: "/city-detail", params: p });
                        }}
                      >
                        <Text style={styles.synthesisCityName}>{c.name}, {c.country}</Text>
                        {c.topWindow?.shortLabel && (
                          <Text style={[styles.synthesisCityBadge, { color: SENTIMENT_COLORS.positive }]}>{c.topWindow.shortLabel}</Text>
                        )}
                        <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                )}
                {transitSynthesis.intense.length > 0 && (
                  <View style={styles.synthesisListSection}>
                    <Text style={[styles.synthesisListTitle, { color: SENTIMENT_COLORS.difficult }]}>Intense / transformative</Text>
                    {transitSynthesis.intense.slice(0, 5).map((c, i) => (
                      <Pressable
                        key={`int-${c.name}-${i}`}
                        style={({ pressed }) => [styles.synthesisCityRow, pressed && { opacity: 0.7 }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const p: Record<string, string> = { name: c.name, country: c.country, lat: String(c.lat), lon: String(c.lon) };
                          if (isFriendView && effectiveFriendId && effectiveFriendName) {
                            p.viewFriendId = effectiveFriendId;
                            p.viewFriendName = effectiveFriendName;
                          }
                          router.push({ pathname: "/city-detail", params: p });
                        }}
                      >
                        <Text style={styles.synthesisCityName}>{c.name}, {c.country}</Text>
                        {c.topWindow?.shortLabel && (
                          <Text style={[styles.synthesisCityBadge, { color: SENTIMENT_COLORS.difficult }]}>{c.topWindow.shortLabel}</Text>
                        )}
                        <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeLines.length > 0 ? (
              <View style={styles.activeLinesList}>
                {activeLines.slice(0, 8).map((activation, i) => {
                  const intensityColor = activation.intensity === "exact"
                    ? Colors.dark.primary
                    : activation.intensity === "strong"
                      ? Colors.dark.secondary
                      : activation.intensity === "moderate"
                        ? Colors.dark.textSecondary
                        : Colors.dark.textMuted;
                  const aspectSymbol = activation.aspect === "conjunction" ? "☌"
                    : activation.aspect === "opposition" ? "☍"
                    : activation.aspect === "trine" ? "△"
                    : activation.aspect === "square" ? "□"
                    : "⚹";
                  const sourceLabel = activation.source === "progression" ? "Progressed" : "Transit";
                  const planetColor = Colors.planets[activation.natalPlanet] || "#FFFFFF";
                  const impactedCities = transitImpactsByActivation.get(activationKey(activation)) || [];

                  return (
                    <View key={`${activation.transitPlanet}-${activation.natalPlanet}-${i}`} style={styles.activeLineCard}>
                      <View style={styles.activeLineHeader}>
                        <View style={[styles.activeLinePlanetIcon, { backgroundColor: planetColor + "20" }]}>
                          <Ionicons name={getPlanetIcon(activation.natalPlanet) as any} size={14} color={planetColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activeLineTitle}>
                            {getPlanetSymbol(activation.natalPlanet)} Lines
                          </Text>
                          <Text style={styles.activeLineAspect}>
                            {sourceLabel} {getPlanetSymbol(activation.transitPlanet)} {aspectSymbol}
                          </Text>
                        </View>
                        <View style={[styles.intensityBadge, { backgroundColor: intensityColor + "18" }]}>
                          <View style={[styles.intensityDot, { backgroundColor: intensityColor }]} />
                          <Text style={[styles.intensityText, { color: intensityColor }]}>
                            {activation.intensity}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.activeLineInsight} numberOfLines={2}>
                        {activation.insight}
                      </Text>
                      {impactedCities.length > 0 && (
                        <View style={styles.activeImpactRow}>
                          <Ionicons name="location-outline" size={12} color={Colors.dark.textMuted} />
                          <Text style={styles.activeImpactText} numberOfLines={2}>
                            Impacting {impactedCities.map((city) => `${city.city} (${city.lineType}, ${city.influence})`).join(" • ")}
                          </Text>
                        </View>
                      )}
                      <View style={styles.activeLineFooter}>
                        {activation.applying && (
                          <View style={styles.applyingBadge}>
                            <Ionicons name="arrow-forward" size={10} color={Colors.dark.primary} />
                            <Text style={styles.applyingText}>Applying — getting stronger</Text>
                          </View>
                        )}
                        <Pressable
                          style={({ pressed }) => [styles.transitMapBtn, pressed && { opacity: 0.75 }]}
                          onPress={() => jumpToMapTransit(activation)}
                        >
                          <Ionicons name="map-outline" size={12} color={Colors.dark.primary} />
                          <Text style={styles.transitMapBtnText}>See on map</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {activeLines.length > 8 && (
                  <Text style={styles.moreActivationsText}>
                    + {activeLines.length - 8} more activations
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.noActiveLines}>
                <Ionicons name="moon-outline" size={24} color={Colors.dark.textMuted} />
                <Text style={styles.noActiveLinesText}>
                  No strong activations for this period. Try a different date.
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* ── PLACES TAB ── */}
      {activeTab === "places" && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {/* Best / Avoid toggle */}
          <View style={styles.placesToggle}>
            <Pressable
              style={[styles.placesToggleBtn, placesMode === "best" && styles.placesToggleBtnActive]}
              onPress={() => { setPlacesMode("best"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="heart" size={14} color={placesMode === "best" ? Colors.dark.background : SENTIMENT_COLORS.positive} />
              <Text style={[styles.placesToggleText, placesMode === "best" && styles.placesToggleTextActive]}>Best</Text>
            </Pressable>
            <Pressable
              style={[styles.placesToggleBtn, placesMode === "avoid" && styles.placesToggleBtnActiveAvoid]}
              onPress={() => { setPlacesMode("avoid"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="shield" size={14} color={placesMode === "avoid" ? Colors.dark.background : SENTIMENT_COLORS.difficult} />
              <Text style={[styles.placesToggleText, placesMode === "avoid" && styles.placesToggleTextActive]}>Avoid</Text>
            </Pressable>
          </View>

          <Text style={styles.tabDesc}>
            {placesMode === "best"
              ? "Cities ranked by your strongest positive planetary energies."
              : "Cities where challenging energies are strongest. Not necessarily bad — just be aware."}
            {keywordFilter ? ` Filtered for "${keywordFilter}".` : ""}
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
          {activePlaces.length > 0 ? (
            <View style={styles.cityList}>
              {activePlaces.map((p, i) => renderCityCard(p, i, placesMode))}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name={placesMode === "best" ? "telescope-outline" : "shield-checkmark-outline"} size={32} color={Colors.dark.textMuted} />
              <Text style={styles.noResultsText}>
                {keywordFilter ? `No places found for "${keywordFilter}"` : placesMode === "best" ? "No positive places found" : "No challenging places found — lucky you!"}
              </Text>
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

  // ── Right Now card ──
  overviewCard: { borderRadius: 20, padding: 20, marginBottom: 24, marginTop: 4 },
  nowHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  nowTitle: { fontSize: 18, fontFamily: "Outfit_700Bold", color: Colors.dark.text },
  nowLocation: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: Colors.dark.textSecondary, marginBottom: 2 },
  nowLocationSecondary: { fontSize: 12, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, marginBottom: 12 },
  nowTransits: { gap: 8, marginBottom: 16 },
  nowTransitRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  nowDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  nowTransitText: { flex: 1, fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.text, lineHeight: 19 },
  nowQuiet: { fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, lineHeight: 19, marginBottom: 16 },
  nowExplain: { fontSize: 11, fontFamily: "Outfit_500Medium", color: Colors.dark.textMuted, lineHeight: 16, marginBottom: 12 },
  nowStats: { flexDirection: "row", alignItems: "center" },
  nowStatItem: { flex: 1, alignItems: "center" },
  nowStatNum: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  nowStatLabel: { fontSize: 11, fontFamily: "Outfit_500Medium", color: Colors.dark.textSecondary, marginTop: 2, textAlign: "center" },
  nowStatDivider: { width: 1, height: 32, backgroundColor: Colors.dark.cardBorder },

  // ── Summary sections ──
  summarySection: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, lineHeight: 19, marginBottom: 12 },
  sectionSubtle: { fontSize: 11, fontFamily: "Outfit_500Medium", color: Colors.dark.textMuted, lineHeight: 16, marginTop: -4, marginBottom: 10 },
  seeAllText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },

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

  // ── Places tab ──
  placesToggle: { flexDirection: "row", gap: 8, marginBottom: 14 },
  placesToggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.cardBorder,
  },
  placesToggleBtnActive: { backgroundColor: SENTIMENT_COLORS.positive, borderColor: SENTIMENT_COLORS.positive },
  placesToggleBtnActiveAvoid: { backgroundColor: SENTIMENT_COLORS.difficult, borderColor: SENTIMENT_COLORS.difficult },
  placesToggleText: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: Colors.dark.textSecondary },
  placesToggleTextActive: { color: Colors.dark.background },

  tabDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, lineHeight: 21, marginBottom: 14 },
  chipRow: { flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  chipActive: { backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary },
  chipText: { fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.textSecondary, textTransform: "capitalize" as "capitalize" },
  chipTextActive: { color: Colors.dark.primary },
  cityList: { gap: 12 },
  cityCard: { backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.dark.cardBorder },
  cityCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  cityRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.primaryMuted, alignItems: "center", justifyContent: "center" },
  cityRankText: { fontSize: 13, fontFamily: "Outfit_700Bold", color: Colors.dark.primary },
  cityName: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
  cityCountry: { fontSize: 12, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  citySignalLabel: { fontSize: 11, fontFamily: "Outfit_700Bold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  citySignalRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  citySignalChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
  },
  citySignalChipText: { flex: 1, fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  citySignalChipDist: { fontSize: 10, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
  citySummaryText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  citySummaryLabel: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  cityTransitNow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.secondaryMuted,
    marginBottom: 8,
  },
  cityTransitNowText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.secondary,
    textTransform: "capitalize" as const,
  },
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

  // ── Active Lines (Transits tab) ──
  activeLinesCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.dark.secondaryMuted },
  activeLinesCountText: { fontSize: 12, fontFamily: "Outfit_600SemiBold", color: Colors.dark.secondary },
  activeLinesList: { gap: 10, marginTop: 12 },
  activeLineCard: {
    backgroundColor: Colors.dark.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.cardBorder,
  },
  activeLineHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  activeLinePlanetIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  activeLineTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
  activeLineAspect: { fontSize: 11, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted, marginTop: 1 },
  intensityBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  intensityDot: { width: 6, height: 6, borderRadius: 3 },
  intensityText: { fontSize: 11, fontFamily: "Outfit_600SemiBold", textTransform: "capitalize" as "capitalize" },
  activeLineInsight: {
    fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  activeImpactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
  },
  activeImpactText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "capitalize" as const,
  },
  activeLineFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  applyingBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: Colors.dark.primaryMuted, alignSelf: "flex-start" as "flex-start",
  },
  applyingText: { fontSize: 10, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },
  transitMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.dark.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.dark.primary + "55",
  },
  transitMapBtnText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
  moreActivationsText: {
    fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.textMuted,
    textAlign: "center", paddingVertical: 8,
  },
  noActiveLines: { alignItems: "center", gap: 10, paddingVertical: 24 },
  noActiveLinesText: {
    fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted,
    textAlign: "center", lineHeight: 19,
  },

  // ── Transit synthesis (When & Where) ──
  synthesisRangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  synthesisRangeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.cardBorder,
    alignItems: "center", justifyContent: "center",
  },
  synthesisRangeBtnActive: {
    backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary,
  },
  synthesisRangeText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: Colors.dark.textSecondary },
  synthesisRangeTextActive: { color: Colors.dark.primary },
  synthesisListSection: { marginTop: 12 },
  synthesisListTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold", marginBottom: 8 },
  synthesisCityRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.dark.card, borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.dark.cardBorder,
  },
  synthesisCityName: { flex: 1, fontSize: 14, fontFamily: "Outfit_500Medium", color: Colors.dark.text },
  synthesisCityBadge: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
});
