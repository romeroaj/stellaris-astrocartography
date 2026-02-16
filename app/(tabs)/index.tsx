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
import { BirthData, PlanetName, AstroLine, OverlapClassification, LineActivation, MapHotspot } from "@/lib/types";
import { getActiveProfile, getSettings, DistanceUnit } from "@/lib/storage";
import { filterPlanets, filterAstroLines } from "@/lib/settings";
import { authFetch } from "@/lib/auth";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  computeCompositePositions,
  findNearestLines,
} from "@/lib/astronomy";
import { getPlanetSymbol, getPlanetIcon } from "@/lib/interpretations";
import { getCurrentActivations, getTransitPositions } from "@/lib/transits";
import TimeScrubber from "@/components/TimeScrubber";
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
import {
  tagSynastryOverlaps,
  SynastryOverlap,
  OVERLAP_COLORS,
  OVERLAP_LABELS,
  OVERLAP_DESCRIPTIONS,
} from "@/lib/synastryAnalysis";
import { useFriendView } from "@/lib/FriendViewContext";
import { WORLD_CITIES as CITY_LIST } from "@/lib/cities";

const ALL_PLANETS_RAW: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron",
  "northnode", "southnode", "lilith",
  "ceres", "pallas", "juno", "vesta",
];

const DEFAULT_PLANETS_RAW: PlanetName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron",
  "northnode", "southnode", "lilith",
];

const ALL_SENTIMENTS: LineSentiment[] = ["positive", "difficult", "neutral"];

const KEYWORD_TAGS = [
  "love", "career", "home", "creativity", "luck",
  "spiritual", "travel", "healing", "leadership", "partnerships",
];

const THEME_EMOJI: Record<string, string> = {
  love: "💖",
  career: "🚀",
  home: "🏡",
  creativity: "🎨",
  luck: "🍀",
  spiritual: "🔮",
  travel: "✈️",
  healing: "💚",
  leadership: "👑",
  partnerships: "🤝",
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [profile, setProfile] = useState<BirthData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<BirthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeMinorPlanets, setIncludeMinorPlanets] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const [enabledPlanets, setEnabledPlanets] = useState<Set<PlanetName>>(
    new Set(DEFAULT_PLANETS_RAW)
  );

  // Check for Bond params
  const { mode, bondType, partnerId, partnerName } = params;
  const friendIdParam = Array.isArray(params.viewFriendId) ? params.viewFriendId[0] : params.viewFriendId;
  const friendNameParam = Array.isArray(params.viewFriendName) ? params.viewFriendName[0] : params.viewFriendName;
  const partnerIdParam = Array.isArray(partnerId) ? partnerId[0] : partnerId;
  const partnerNameParam = Array.isArray(partnerName) ? partnerName[0] : partnerName;
  const bondTypeParam = ((Array.isArray(bondType) ? bondType[0] : bondType) as "synastry" | "composite" | undefined) || "synastry";
  const { viewFriendId: ctxFriendId, viewFriendName: ctxFriendName, setFriendView, clearFriendView } = useFriendView();
  // Params take precedence (from navigation); context persists when switching tabs
  const effectiveFriendId = (typeof friendIdParam === "string" && friendIdParam) ? friendIdParam : ctxFriendId;
  const effectiveFriendName = (typeof friendNameParam === "string" && friendNameParam) ? friendNameParam : ctxFriendName;
  const isFriendView = typeof effectiveFriendId === "string" && effectiveFriendId.length > 0;
  const isBondMode = mode === "bond" && typeof partnerIdParam === "string" && partnerIdParam.length > 0;

  // Sync params to context when navigating with friend view
  useEffect(() => {
    if (friendIdParam && friendNameParam) {
      setFriendView(friendIdParam, friendNameParam);
    }
  }, [friendIdParam, friendNameParam, setFriendView]);

  // ── Live Location Insights State ──
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Silently try to get GPS on first mount for map centering
  const [initialGps, setInitialGps] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getLastKnownPositionAsync();
          if (loc) {
            setInitialGps({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        }
      } catch {}
    })();
  }, []);


  const [selectedLine, setSelectedLine] = useState<AstroLine | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [simplifiedView, setSimplifiedView] = useState(false);

  // ── Cyclocartography (CCG) state ──
  const [showTimeMode, setShowTimeMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transitLines, setTransitLines] = useState<AstroLine[]>([]);
  const [activeActivations, setActiveActivations] = useState<LineActivation[]>([]);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [enabledSentiments, setEnabledSentiments] = useState<Set<LineSentiment>>(
    new Set(ALL_SENTIMENTS)
  );
  const [enabledKeywords, setEnabledKeywords] = useState<Set<string>>(new Set());

  // Synastry overlap highlight mode — defaults to true in synastry
  const [showOverlapHighlights, setShowOverlapHighlights] = useState(true);
  const [synastryOverlaps, setSynastryOverlaps] = useState<SynastryOverlap[]>([]);
  const [overlapPanelCollapsed, setOverlapPanelCollapsed] = useState(false);
  const [overlapPanelHidden, setOverlapPanelHidden] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const hasBanner = (isBondMode && !!partnerProfile) || (isFriendView && !isBondMode);
  // Extra offset when a banner is showing so legend/filter don't overlap header buttons
  const panelTopOffset = topInset + (hasBanner ? 130 : 80);

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
      getSettings().then((s) => {
        setIncludeMinorPlanets(s.includeMinorPlanets);
        setDistanceUnit(s.distanceUnit);
      });
    }, [effectiveFriendId, effectiveFriendName, partnerIdParam, isBondMode])
  );

  const loadProfile = async () => {
    setLoading(true);
    setPartnerProfile(null);

    if (isBondMode) {
      const me = await getActiveProfile();
      if (!me) {
        Alert.alert("Chart Required", "Set up your birth chart first to view bonds.");
        router.replace("/(tabs)");
        setLoading(false);
        return;
      }
      setProfile(me);
      const { fetchFriendProfile } = await import("@/lib/friendProfile");
      const partnerData = await fetchFriendProfile(partnerIdParam, partnerNameParam || undefined);
      if (partnerData) {
        setPartnerProfile({
          ...partnerData,
          id: `partner_${partnerData.id}`,
          name: partnerNameParam || partnerData.name || "Partner",
        });
      } else {
        Alert.alert("Partner Unavailable", "Could not load your partner's chart.");
      }
      setLoading(false);
      return;
    }

    if (effectiveFriendId) {
      const { fetchFriendProfile } = await import("@/lib/friendProfile");
      const friendData = await fetchFriendProfile(effectiveFriendId, effectiveFriendName || undefined);
      if (friendData) {
        setProfile({
          ...friendData,
          name: effectiveFriendName || friendData.name || "Friend",
        });
      } else {
        Alert.alert("Friend View Unavailable", "Could not load your friend's chart.");
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

    if (isBondMode && partnerProfile && bondTypeParam === "composite") {
      const [y1, m1, d1] = profile.date.split("-").map(Number);
      const [h1, mi1] = profile.time.split(":").map(Number);
      const [y2, m2, d2] = partnerProfile.date.split("-").map(Number);
      const [h2, mi2] = partnerProfile.time.split(":").map(Number);
      const pos1 = calculatePlanetPositions(y1, m1, d1, h1, mi1, profile.longitude);
      const pos2 = calculatePlanetPositions(y2, m2, d2, h2, mi2, partnerProfile.longitude);
      const gst1 = calculateGST(y1, m1, d1, h1, mi1, profile.longitude);
      const gst2 = calculateGST(y2, m2, d2, h2, mi2, partnerProfile.longitude);
      const { positions: compositePos, gst: compositeGst } = computeCompositePositions(pos1, pos2, gst1, gst2);
      const raw = generateAstroLines(compositePos, compositeGst);
      return filterAstroLines(raw, includeMinorPlanets);
    }

    if (isBondMode && partnerProfile && bondTypeParam === "synastry") {
      const [y1, m1, d1] = profile.date.split("-").map(Number);
      const [h1, mi1] = profile.time.split(":").map(Number);
      const [y2, m2, d2] = partnerProfile.date.split("-").map(Number);
      const [h2, mi2] = partnerProfile.time.split(":").map(Number);
      const pos1 = calculatePlanetPositions(y1, m1, d1, h1, mi1, profile.longitude);
      const pos2 = calculatePlanetPositions(y2, m2, d2, h2, mi2, partnerProfile.longitude);
      const gst1 = calculateGST(y1, m1, d1, h1, mi1, profile.longitude);
      const gst2 = calculateGST(y2, m2, d2, h2, mi2, partnerProfile.longitude);
      const raw1 = generateAstroLines(pos1, gst1, "user");
      const raw2 = generateAstroLines(pos2, gst2, "partner");
      const filtered1 = filterAstroLines(raw1, includeMinorPlanets);
      const filtered2 = filterAstroLines(raw2, includeMinorPlanets);
      return [...filtered1, ...filtered2];
    }

    const [year, month, day] = profile.date.split("-").map(Number);
    const [hour, minute] = profile.time.split(":").map(Number);
    const positions = calculatePlanetPositions(year, month, day, hour, minute, profile.longitude);
    const gst = calculateGST(year, month, day, hour, minute, profile.longitude);
    const raw = generateAstroLines(positions, gst);
    return filterAstroLines(raw, includeMinorPlanets);
  }, [profile, partnerProfile, includeMinorPlanets, isBondMode, bondTypeParam]);

  // ── Cyclocartography: compute transit overlay lines + activations ──
  useEffect(() => {
    if (!showTimeMode || !profile) {
      setTransitLines([]);
      setActiveActivations([]);
      return;
    }
    try {
      // Generate transit lines for the selected date (outer planet positions)
      const transitPositions = getTransitPositions(selectedDate);
      // Use a "transit" GST based on the selected date
      const tYear = selectedDate.getFullYear();
      const tMonth = selectedDate.getMonth() + 1;
      const tDay = selectedDate.getDate();
      const transitGst = calculateGST(tYear, tMonth, tDay, 12, 0);

      // Only show transit lines for outer planets (the slow-moving ones visible on a map)
      const outerPlanets: PlanetName[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
      const outerPositions = transitPositions.filter((p) => outerPlanets.includes(p.name));
      const rawTransitLines = generateAstroLines(outerPositions, transitGst);
      setTransitLines(rawTransitLines);

      // Compute activations
      const activations = getCurrentActivations(
        profile.date, profile.time, profile.longitude, selectedDate
      );
      setActiveActivations(activations);
    } catch (e) {
      console.error("Error computing transit lines:", e);
      setTransitLines([]);
      setActiveActivations([]);
    }
  }, [showTimeMode, selectedDate, profile]);

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

  // ── Synastry overlap tagging ──
  const synastryResult = useMemo(() => {
    if (isBondMode && bondTypeParam === "synastry" && partnerProfile) {
      return tagSynastryOverlaps(visibleLines);
    }
    return { lines: visibleLines, overlaps: [] as SynastryOverlap[] };
  }, [visibleLines, isBondMode, bondTypeParam, partnerProfile]);

  const processedLines = synastryResult.lines;

  const mapHotspots = useMemo<MapHotspot[]>(() => {
    if (!profile || isBondMode || !simplifiedView) return [];

    const hotspots: (MapHotspot & { score: number })[] = [];
    const citySample = CITY_LIST.slice(0, 120);

    for (const city of citySample) {
      const nearby = findNearestLines(processedLines, city.latitude, city.longitude, 12);
      if (nearby.length === 0) continue;

      const classified = nearby.map((n) => {
        const cls = classifyLine(n.planet, n.lineType);
        return { ...n, sentiment: cls.sentiment, keywords: cls.keywords };
      });

      const positiveScore = classified
        .filter((x) => x.sentiment === "positive")
        .reduce((acc, x) => acc + x.strength, 0);
      const difficultScore = classified
        .filter((x) => x.sentiment === "difficult")
        .reduce((acc, x) => acc + x.strength, 0);

      const sentiment = positiveScore > difficultScore * 1.2
        ? "positive"
        : difficultScore > positiveScore * 1.2
          ? "difficult"
          : "neutral";

      const dominant = classified[0];
      const theme = dominant.keywords.find((k) => KEYWORD_TAGS.some((tag) => k.includes(tag))) || "general";
      const emoji = THEME_EMOJI[KEYWORD_TAGS.find((k) => theme.includes(k)) || ""] || "✨";

      const transitHits = activeActivations.filter((a) => classified.some((n) => n.planet === a.natalPlanet));
      const isTransitActive = transitHits.length > 0;

      const strength = Math.min(
        1,
        dominant.strength + (isTransitActive ? 0.15 : 0)
      );

      const details = `${city.name}, ${city.country} · ${theme} · ${
        sentiment === "positive" ? "supportive" : sentiment === "difficult" ? "challenging" : "mixed"
      }`;

      const score = strength + (sentiment === "positive" ? 0.2 : sentiment === "difficult" ? 0.05 : 0.1) + (isTransitActive ? 0.2 : 0);

      hotspots.push({
        id: `${city.name}-${city.country}`,
        city: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        sentiment,
        strength,
        emoji,
        theme,
        isTransitActive,
        details,
        score,
      });
    }

    return hotspots
      .sort((a, b) => b.score - a.score)
      .slice(0, 18)
      .map(({ score, ...rest }) => rest);
  }, [profile, isBondMode, simplifiedView, processedLines, activeActivations]);

  useEffect(() => {
    setSynastryOverlaps(synastryResult.overlaps);
  }, [synastryResult.overlaps]);

  // Handle Deep Linking from Learn Tab
  useEffect(() => {
    if (params.planet && params.lineType && processedLines.length > 0) {
      const target = processedLines.find(
        (l) => l.planet === params.planet && l.lineType === params.lineType
      );
      if (target) {
        setSelectedLine(target);
      }
    }
  }, [params.planet, params.lineType, processedLines]);

  // Merge transit overlay lines when time mode is active
  const allMapLines = useMemo(() => {
    if (!showTimeMode || transitLines.length === 0) return processedLines;
<<<<<<< Updated upstream
    // Mark transit lines with sourceId so map can style them distinctly
    const markedTransit = transitLines.map((line) => ({
      ...line,
      sourceId: "transit" as const,
=======
    // Mark transit lines with a sourceId to distinguish them visually
    const markedTransit = transitLines.map((line) => ({
      ...line,
      sourceId: "partner" as const, // Reuse partner styling for dotted/transparent look
>>>>>>> Stashed changes
    }));
    return [...processedLines, ...markedTransit];
  }, [processedLines, transitLines, showTimeMode]);

  // Debounce lines sent to the map to prevent native crash from rapid Polyline updates
  const [debouncedLines, setDebouncedLines] = useState<AstroLine[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLines(allMapLines);
    }, 80);
    return () => clearTimeout(timer);
  }, [allMapLines]);

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

  const allPlanets = useMemo(() => filterPlanets(ALL_PLANETS_RAW, includeMinorPlanets), [includeMinorPlanets]);
  const defaultPlanets = useMemo(() => filterPlanets(DEFAULT_PLANETS_RAW, includeMinorPlanets), [includeMinorPlanets]);

  const toggleAllPlanets = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const allEnabled = allPlanets.every((p) => enabledPlanets.has(p));
    if (allEnabled) {
      setEnabledPlanets(new Set());
    } else {
      setEnabledPlanets(new Set(allPlanets));
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

  const allPlanetsEnabled = allPlanets.every((p) => enabledPlanets.has(p));

  return (
    <View style={styles.container}>
      <AstroMap
        lines={debouncedLines}
        hotspots={mapHotspots}
        birthLat={profile.latitude}
        birthLon={profile.longitude}
        userLat={initialGps?.latitude ?? userLocation?.latitude}
        userLon={initialGps?.longitude ?? userLocation?.longitude}
        showUserLocation={!!(userLocation || initialGps)}
        colorMode={simplifiedView ? "simplified" : "planet"}
        viewMode={simplifiedView ? "simple" : "advanced"}
        bondMode={isBondMode && partnerProfile ? bondTypeParam : undefined}
        showOverlapHighlights={showOverlapHighlights}
        onLinePress={(line) => {
          if (line.sourceId === "transit") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelectedLine(line);
        }}
        onHotspotPress={(hotspot) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/city-detail",
            params: {
              name: hotspot.city,
              country: hotspot.country,
              lat: String(hotspot.latitude),
              lon: String(hotspot.longitude),
            },
          });
        }}
      />

      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        {isBondMode && partnerProfile && (
          <View style={styles.friendViewBanner}>
            <Text style={styles.friendViewText}>
              {bondTypeParam === "synastry" ? "Synastry" : "Composite"} with {partnerNameParam || partnerProfile.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {bondTypeParam === "synastry" && (
                <Pressable
                  style={({ pressed }) => [
                    styles.friendViewClose,
                    showOverlapHighlights && { backgroundColor: Colors.dark.primary + "30" },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowOverlapHighlights(!showOverlapHighlights);
                  }}
                >
                  <Ionicons
                    name={showOverlapHighlights ? "git-compare" : "git-compare-outline"}
                    size={14}
                    color={Colors.dark.primary}
                  />
                  <Text style={styles.friendViewCloseText}>Overlaps</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.friendViewClose, pressed && { opacity: 0.7 }]}
                onPress={() => router.replace("/(tabs)")}
              >
                <Ionicons name="close" size={16} color={Colors.dark.primary} />
                <Text style={styles.friendViewCloseText}>Exit</Text>
              </Pressable>
            </View>
          </View>
        )}
        {isFriendView && !isBondMode && (
          <View style={styles.friendViewBanner}>
            <Text style={styles.friendViewText}>
              Viewing {effectiveFriendName || profile.name}'s chart
            </Text>
            <Pressable
              style={({ pressed }) => [styles.friendViewClose, pressed && { opacity: 0.7 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                clearFriendView();
                router.replace({ pathname: "/(tabs)", params: {} });
              }}
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
                name={simplifiedView ? "sparkles" : "analytics-outline"}
                size={22}
                color={simplifiedView ? Colors.dark.primary : Colors.dark.textSecondary}
              />
            </Pressable>

            {/* CCG Time Mode Button */}
            <Pressable
              style={({ pressed }) => [
                styles.helpButton,
                pressed && { opacity: 0.7 },
                showTimeMode && styles.helpButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTimeMode(!showTimeMode);
                if (showTimeMode) {
                  setTransitLines([]);
                  setActiveActivations([]);
                }
              }}
            >
              <Ionicons
                name={showTimeMode ? "time" : "time-outline"}
                size={20}
                color={showTimeMode ? Colors.dark.primary : Colors.dark.textSecondary}
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
        <View style={styles.modeBanner}>
          <Ionicons
            name={simplifiedView ? "sparkles" : "analytics-outline"}
            size={13}
            color={simplifiedView ? Colors.dark.primary : Colors.dark.textSecondary}
          />
          <Text style={styles.modeBannerText}>
            {simplifiedView
              ? "Simple Mode: Hotspots only (tap areas for details)"
              : "Advanced Mode: Full natal + transit lines"}
          </Text>
        </View>
      </View>

      {/* ── CCG Time Panel ── */}
      {showTimeMode && !showFilters && (
        <View style={[styles.ccgPanel, { top: panelTopOffset }]}>
          <TimeScrubber
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            compact={false}
          />
          {activeActivations.length > 0 && (
            <View style={styles.ccgActivationSummary}>
              <Text style={styles.ccgActivationTitle}>
                {activeActivations.length} line{activeActivations.length !== 1 ? "s" : ""} activated
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ccgChips}>
                {activeActivations.slice(0, 5).map((a, i) => {
                  const planetColor = Colors.planets[a.natalPlanet] || "#FFF";
                  const intensityOpacity = a.intensity === "exact" ? "FF"
                    : a.intensity === "strong" ? "CC"
                    : a.intensity === "moderate" ? "88" : "55";
                  return (
                    <View key={`${a.transitPlanet}-${a.natalPlanet}-${i}`} style={[styles.ccgChip, { borderColor: planetColor + intensityOpacity }]}>
                      <View style={[styles.ccgChipDot, { backgroundColor: planetColor }]} />
                      <Text style={[styles.ccgChipText, { color: planetColor }]}>
                        {getPlanetSymbol(a.transitPlanet)} → {getPlanetSymbol(a.natalPlanet)}
                      </Text>
                      <Text style={[styles.ccgChipIntensity, { color: planetColor + "AA" }]}>
                        {a.intensity}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
<<<<<<< Updated upstream
          {transitLines.length > 0 && !simplifiedView && (
=======
          {transitLines.length > 0 && (
>>>>>>> Stashed changes
            <View style={styles.ccgTransitKey}>
              <View style={styles.ccgKeyDot} />
              <Text style={styles.ccgKeyText}>Dotted lines = current transit positions</Text>
            </View>
          )}
<<<<<<< Updated upstream
          {simplifiedView && (
            <View style={styles.ccgTransitKey}>
              <View style={[styles.ccgChipDot, { backgroundColor: Colors.dark.primary }]} />
              <Text style={styles.ccgKeyText}>Simple mode highlights city hotspots, not full transit lines</Text>
            </View>
          )}
=======
>>>>>>> Stashed changes
        </View>
      )}

      {/* ── Filter Panel ── */}
      {showFilters && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setShowFilters(false)} />
          <View style={[styles.filterPanel, { top: panelTopOffset }]}>
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

          {allPlanets.map((planet) => (
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
        <View style={[styles.lineTypeLegend, { top: panelTopOffset }]}>
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
        <View style={[styles.sentimentLegend, { top: panelTopOffset }]}>
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

      {/* ── Synastry Overlap Insights ── */}
      {isBondMode && bondTypeParam === "synastry" && showOverlapHighlights && synastryOverlaps.length > 0 && !showFilters && !overlapPanelHidden && (
        <Pressable
          style={[
            styles.overlapPanel,
            { top: panelTopOffset },
            overlapPanelCollapsed && styles.overlapPanelCollapsed,
          ]}
          onPress={overlapPanelCollapsed ? () => setOverlapPanelCollapsed(false) : undefined}
        >
          <View style={[styles.overlapHeader, overlapPanelCollapsed && styles.overlapHeaderCollapsed]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Ionicons name="git-compare" size={14} color={Colors.dark.primary} />
              <Text style={styles.overlapHeaderText}>
                {synastryOverlaps.length} Shared Overlap{synastryOverlaps.length > 1 ? "s" : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Pressable
                style={({ pressed }) => [styles.overlapHeaderBtn, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOverlapPanelCollapsed(!overlapPanelCollapsed);
                }}
              >
                <Ionicons
                  name={overlapPanelCollapsed ? "chevron-down" : "chevron-up"}
                  size={16}
                  color={Colors.dark.primary}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.overlapHeaderBtn, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOverlapPanelHidden(true);
                }}
              >
                <Ionicons name="close" size={14} color={Colors.dark.textMuted} />
              </Pressable>
            </View>
          </View>
          {!overlapPanelCollapsed && (
            <ScrollView
              style={styles.overlapScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {synastryOverlaps.map((overlap) => {
            const color = OVERLAP_COLORS[overlap.classification];
            const label = OVERLAP_LABELS[overlap.classification];
            const planetName = overlap.planet.charAt(0).toUpperCase() + overlap.planet.slice(1);
            const lineLabel = Colors.lineTypes[overlap.lineType]?.label || overlap.lineType;
            return (
              <Pressable
                key={`${overlap.planet}-${overlap.lineType}`}
                style={styles.overlapItem}
                onPress={() => {
                  // Find and select this overlap's user line
                  const target = processedLines.find(
                    (l) =>
                      l.planet === overlap.planet &&
                      l.lineType === overlap.lineType &&
                      l.sourceId === "user"
                  );
                  if (target) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedLine(target);
                  }
                }}
              >
                <View style={[styles.overlapDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.overlapItemTitle}>
                    {getPlanetSymbol(overlap.planet)} {planetName} {lineLabel}
                  </Text>
                  <Text style={[styles.overlapItemLabel, { color }]}>{label}</Text>
                </View>
                <Text style={styles.overlapProximity}>
                  {overlap.proximityDeg.toFixed(0)}°
                </Text>
              </Pressable>
            );
          })}
            </ScrollView>
          )}
        </Pressable>
      )}

      {/* Floating chip to restore overlap panel when hidden */}
      {isBondMode && bondTypeParam === "synastry" && showOverlapHighlights && synastryOverlaps.length > 0 && overlapPanelHidden && !showFilters && (
        <Pressable
          style={[styles.overlapRestoreChip, { top: panelTopOffset }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOverlapPanelHidden(false);
            setOverlapPanelCollapsed(false);
          }}
        >
          <Ionicons name="git-compare" size={14} color={Colors.dark.primary} />
          <Text style={styles.overlapRestoreText}>
            {synastryOverlaps.length} Overlaps
          </Text>
        </Pressable>
      )}

      {/* Synastry color key (when overlap highlights are off) */}
      {isBondMode && bondTypeParam === "synastry" && !showOverlapHighlights && !showFilters && (
        <View style={[styles.sentimentLegend, { top: panelTopOffset }]}>
          <View style={styles.lineTypeItem}>
            <View style={[styles.sentimentDot, { backgroundColor: Colors.dark.primary }]} />
            <Text style={styles.lineTypeLabel}>You</Text>
          </View>
          <View style={styles.lineTypeItem}>
            <View style={[styles.sentimentDot, { backgroundColor: Colors.dark.secondary }]} />
            <Text style={styles.lineTypeLabel}>{partnerNameParam || "Partner"}</Text>
          </View>
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
                const params: Record<string, string> = {
                  planet: selectedLine.planet,
                  lineType: selectedLine.lineType,
                };
                if (isFriendView && effectiveFriendId && effectiveFriendName) {
                  params.viewFriendId = effectiveFriendId;
                  params.viewFriendName = effectiveFriendName;
                }
                router.push({
                  pathname: "/line-detail",
                  params,
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
          includeMinorPlanets={includeMinorPlanets}
          distanceUnit={distanceUnit}
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
  modeBanner: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  modeBannerText: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
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
  // ── CCG Time Panel ──
  ccgPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 25,
    gap: 8,
  },
  ccgActivationSummary: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  ccgActivationTitle: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  ccgChips: {
    gap: 6,
  },
  ccgChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
  },
  ccgChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ccgChipText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
  ccgChipIntensity: {
    fontSize: 10,
    fontFamily: "Outfit_500Medium",
    textTransform: "capitalize" as const,
  },
  ccgTransitKey: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.card + "EE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  ccgKeyDot: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.dark.secondary,
    borderStyle: "dashed" as any,
  },
  ccgKeyText: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
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
  // ── Synastry Overlap Panel ──
  overlapPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    maxHeight: 280,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    zIndex: 10,
  },
  overlapPanelCollapsed: {
    maxHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  overlapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  overlapHeaderCollapsed: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  overlapHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface + "80",
  },
  overlapScroll: {
    maxHeight: 220,
  },
  overlapHeaderText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  overlapItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.cardBorder,
  },
  overlapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  overlapItemTitle: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
  },
  overlapItemLabel: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    marginTop: 1,
  },
  overlapProximity: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
  overlapRestoreChip: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.overlay,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    zIndex: 10,
  },
  overlapRestoreText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
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
