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
import { filterPlanets, filterAstroLines, filterNearbyByImpact } from "@/lib/settings";
import { authFetch } from "@/lib/auth";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  computeCompositePositions,
  findNearestLines,
} from "@/lib/astronomy";
import { getPlanetSymbol, getPlanetIcon } from "@/lib/interpretations";
import { getCurrentActivations } from "@/lib/transits";
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
  const [hideMildImpacts, setHideMildImpacts] = useState(false);
  const [enabledPlanets, setEnabledPlanets] = useState<Set<PlanetName>>(
    new Set(ALL_PLANETS_RAW)
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
  const [selectedTransitLine, setSelectedTransitLine] = useState<AstroLine | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [sentimentMode, setSentimentMode] = useState(false);
  const mapRef = useRef<import("@/components/AstroMap").AstroMapHandle>(null);

  // ── Cyclocartography (CCG) state ──
  const [showTimeMode, setShowTimeMode] = useState(false);
  const [showTransitLines, setShowTransitLines] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
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
      setSelectedTransitLine(null);
      pan.setValue({ x: 0, y: 0 });
    }
  }, [selectedLine]);

  useEffect(() => {
    if (!showTransitLines) {
      setSelectedTransitLine(null);
    }
  }, [showTransitLines]);

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
        setHideMildImpacts(s.hideMildImpacts);
      });
    }, [effectiveFriendId, effectiveFriendName, partnerIdParam, isBondMode])
  );

  const focusTransitParam = Array.isArray(params.focusTransit) ? params.focusTransit[0] : params.focusTransit;
  const transitDateParam = Array.isArray(params.transitDate) ? params.transitDate[0] : params.transitDate;
  const transitPlanetParam = Array.isArray(params.transitPlanet) ? params.transitPlanet[0] : params.transitPlanet;
  const natalPlanetParam = Array.isArray(params.natalPlanet) ? params.natalPlanet[0] : params.natalPlanet;

  const focusedTransitPlanet = useMemo(
    () => (typeof transitPlanetParam === "string" && ALL_PLANETS_RAW.includes(transitPlanetParam as PlanetName)
      ? (transitPlanetParam as PlanetName)
      : null),
    [transitPlanetParam]
  );
  const focusedNatalPlanet = useMemo(
    () => (typeof natalPlanetParam === "string" && ALL_PLANETS_RAW.includes(natalPlanetParam as PlanetName)
      ? (natalPlanetParam as PlanetName)
      : null),
    [natalPlanetParam]
  );

  useEffect(() => {
    if (focusTransitParam === "1" || focusTransitParam === "true") {
      setShowTimeMode(true);
      setShowTransitLines(true);
    }
    if (typeof transitDateParam === "string" && transitDateParam.length > 0) {
      const parsed = new Date(transitDateParam);
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
      }
    }
  }, [focusTransitParam, transitDateParam]);

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

  // ── Cyclocartography: compute activations (no transit lines) ──
  useEffect(() => {
    if (!showTimeMode || !profile) {
      setActiveActivations([]);
      return;
    }
    try {
      const activations = getCurrentActivations(
        profile.date, profile.time, profile.longitude, selectedDate
      );
      setActiveActivations(activations);
    } catch (e) {
      console.error("Error computing activations:", e);
      setActiveActivations([]);
    }
  }, [showTimeMode, selectedDate, profile]);

  const focusedActivationsForMap = useMemo(() => {
    return activeActivations.filter((activation) => {
      if (focusedTransitPlanet && activation.transitPlanet !== focusedTransitPlanet) return false;
      if (focusedNatalPlanet && activation.natalPlanet !== focusedNatalPlanet) return false;
      return true;
    });
  }, [activeActivations, focusedTransitPlanet, focusedNatalPlanet]);

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
    if (!profile || isBondMode) return [];

    const hotspots: (MapHotspot & { score: number })[] = [];
    const citySample = CITY_LIST.slice(0, 120);

    for (const city of citySample) {
      const nearby = filterNearbyByImpact(
        findNearestLines(processedLines, city.latitude, city.longitude, 12),
        hideMildImpacts
      );
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
  }, [profile, isBondMode, processedLines, activeActivations, hideMildImpacts]);

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

  // ── Transit glows: soft circles around cities energized by current transits ──
  const transitGlows = useMemo(() => {
    if (!showTimeMode || focusedActivationsForMap.length === 0) return [];
    const citySample = CITY_LIST.slice(0, 120);
    const glows: { id: string; latitude: number; longitude: number; intensity: number; color: string; label: string }[] = [];
    const activatedPlanets = new Set(focusedActivationsForMap.map((a) => a.natalPlanet));

    for (const city of citySample) {
      const nearby = filterNearbyByImpact(
        findNearestLines(processedLines, city.latitude, city.longitude, 12),
        hideMildImpacts
      );
      if (nearby.length === 0) continue;

      const hits = nearby.filter((n) => activatedPlanets.has(n.planet));
      if (hits.length === 0) continue;

      const bestHit = hits.reduce((best, h) => h.strength > best.strength ? h : best, hits[0]);
      const activation = focusedActivationsForMap.find((a) => a.natalPlanet === bestHit.planet);
      if (!activation) continue;

      const intensityScore = activation.intensity === "exact" ? 1.0
        : activation.intensity === "strong" ? 0.75
        : activation.intensity === "moderate" ? 0.5 : 0.3;

      const cls = classifyLine(bestHit.planet, bestHit.lineType);
      const color = SENTIMENT_COLORS[cls.sentiment];

      glows.push({
        id: `${city.name}-${city.country}`,
        latitude: city.latitude,
        longitude: city.longitude,
        intensity: Math.min(1, bestHit.strength * 0.6 + intensityScore * 0.4),
        color,
        label: `${city.name} · ${getPlanetSymbol(activation.transitPlanet)} → ${getPlanetSymbol(activation.natalPlanet)}`,
      });
    }

    return glows.sort((a, b) => b.intensity - a.intensity).slice(0, 25);
  }, [showTimeMode, focusedActivationsForMap, processedLines, hideMildImpacts]);

  // ── Optional transit line overlay ──
  const transitLines = useMemo<AstroLine[]>(() => {
    if (!showTimeMode || !showTransitLines || !profile || isBondMode || focusedActivationsForMap.length === 0) {
      return [];
    }

    const activeTransitPlanets = new Set(focusedActivationsForMap.map((a) => a.transitPlanet));
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const transitPositions = calculatePlanetPositions(year, month, day, hour, minute)
      .filter((pos) => activeTransitPlanets.has(pos.name));
    if (transitPositions.length === 0) return [];

    const transitGst = calculateGST(year, month, day, hour, minute);
    return generateAstroLines(transitPositions, transitGst, "transit");
  }, [showTimeMode, showTransitLines, profile, isBondMode, focusedActivationsForMap, selectedDate]);

  // ── Map render lines ──
  // react-native-maps on iOS has a bug where removing a <Polyline> component
  // does NOT remove the native MKOverlay from the map.  To work around this we
  // ALWAYS render every line, but mark filtered-out lines as `hidden`.  The
  // AstroMap component renders hidden lines as fully transparent (strokeWidth 0)
  // so the native overlay stays alive but invisible.  This means planet toggling
  // never triggers mount/unmount of native overlays — only style changes.
  const mapRenderLines = useMemo<AstroLine[]>(() => {
    const visibleIds = new Set(processedLines.map((l) => l.id));

    // All natal lines — visible ones carry synastry overlap tags, hidden ones
    // come straight from astroLines.
    const natalLines: AstroLine[] = [];
    for (const line of processedLines) {
      natalLines.push({ ...line, hidden: false });
    }
    for (const line of astroLines) {
      if (!visibleIds.has(line.id)) {
        natalLines.push({ ...line, hidden: true });
      }
    }

    // Transit lines (always visible when present)
    if (showTimeMode && showTransitLines && transitLines.length > 0) {
      return [...natalLines, ...transitLines.map((l) => ({ ...l, hidden: false }))];
    }
    return natalLines;
  }, [astroLines, processedLines, showTimeMode, showTransitLines, transitLines]);

  const ccgDualToneEnabled = useMemo(
    () => showTimeMode && !isBondMode && mapRenderLines.some((line) => !line.hidden && line.sourceId === "transit"),
    [showTimeMode, isBondMode, mapRenderLines]
  );

  const selectedTransitActivations = useMemo(() => {
    if (!selectedTransitLine) return [];
    return focusedActivationsForMap
      .filter((activation) => activation.transitPlanet === selectedTransitLine.planet)
      .slice(0, 4);
  }, [selectedTransitLine, focusedActivationsForMap]);

  const hasActiveFilters = enabledSentiments.size < ALL_SENTIMENTS.length || enabledKeywords.size > 0;

  const getAspectGlyph = (aspect: string): string => {
    if (aspect === "conjunction") return "☌";
    if (aspect === "opposition") return "☍";
    if (aspect === "trine") return "△";
    if (aspect === "square") return "□";
    return "⚹";
  };

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
    // Any planets visible → clear everything. Nothing visible → enable all.
    if (enabledPlanets.size > 0) {
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
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);
      setShowInsights(true);
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 12,
        longitudeDelta: 18,
      }, 800);
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
  const somePlanetsEnabled = enabledPlanets.size > 0 && !allPlanetsEnabled;

  return (
    <View style={styles.container}>
      <AstroMap
        ref={mapRef}
        lines={mapRenderLines}
        hotspots={mapHotspots}
        transitGlows={transitGlows}
        birthLat={profile.latitude}
        birthLon={profile.longitude}
        userLat={initialGps?.latitude ?? userLocation?.latitude}
        userLon={initialGps?.longitude ?? userLocation?.longitude}
        showUserLocation={!!(userLocation || initialGps)}
        colorMode={sentimentMode ? "sentiment" : "planet"}
        bondMode={isBondMode && partnerProfile ? bondTypeParam : undefined}
        ccgDualTone={ccgDualToneEnabled}
        showOverlapHighlights={showOverlapHighlights}
        onLinePress={(line) => {
          if (line.sourceId === "transit") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTransitLine(line);
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelectedTransitLine(null);
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
              Viewing {effectiveFriendName || profile.name}&apos;s chart
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
                sentimentMode && styles.helpButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSentimentMode(!sentimentMode);
              }}
            >
              <Ionicons
                name={sentimentMode ? "color-palette" : "color-palette-outline"}
                size={22}
                color={sentimentMode ? Colors.dark.primary : Colors.dark.textSecondary}
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
            name={sentimentMode ? "color-palette" : "analytics-outline"}
            size={13}
            color={sentimentMode ? Colors.dark.primary : Colors.dark.textSecondary}
          />
          <Text style={styles.modeBannerText}>
            {sentimentMode
              ? "Sentiment: Lines colored by positive / difficult / neutral"
              : "Planet Colors: Lines colored by planet"}
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
          {!isBondMode && (
            <Pressable
              style={[
                styles.ccgTransitToggle,
                showTransitLines && styles.ccgTransitToggleActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTransitLines(!showTransitLines);
              }}
            >
              <View style={styles.ccgTransitToggleLeft}>
                <Ionicons
                  name={showTransitLines ? "git-network" : "git-network-outline"}
                  size={14}
                  color={showTransitLines ? "#7DD3FC" : Colors.dark.textSecondary}
                />
                <Text style={styles.ccgTransitToggleText}>
                  {showTransitLines ? "Transit lines on" : "Transit lines off"}
                </Text>
              </View>
              <Text style={styles.ccgTransitToggleHint}>
                {showTransitLines ? "Hide" : "Show"}
              </Text>
            </Pressable>
          )}
          {focusedActivationsForMap.length > 0 && (
            <View style={styles.ccgActivationSummary}>
              <Text style={styles.ccgActivationTitle}>
                {focusedActivationsForMap.length} line{focusedActivationsForMap.length !== 1 ? "s" : ""} activated
              </Text>
              {(focusedTransitPlanet || focusedNatalPlanet) && (
                <Text style={styles.ccgFilterNote}>
                  Focused: {focusedTransitPlanet ? getPlanetSymbol(focusedTransitPlanet) : "Any"} → {focusedNatalPlanet ? getPlanetSymbol(focusedNatalPlanet) : "Any"}
                </Text>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ccgChips}>
                {focusedActivationsForMap.slice(0, 5).map((a, i) => {
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
          {transitGlows.length > 0 && (
            <View style={styles.ccgTransitKey}>
              <View style={[styles.ccgKeyDot, { backgroundColor: SENTIMENT_COLORS.positive }]} />
              <View style={[styles.ccgKeyDot, { backgroundColor: SENTIMENT_COLORS.difficult }]} />
              <View style={[styles.ccgKeyDot, { backgroundColor: SENTIMENT_COLORS.neutral }]} />
              <Text style={styles.ccgKeyText}>Glowing areas = cities energized by transits</Text>
            </View>
          )}
          {showTransitLines && (
            <View style={styles.ccgTransitLegend}>
              <View style={[styles.ccgKeyDotLong, { backgroundColor: "#E8E2D699" }]} />
              <Text style={styles.ccgKeyText}>Natal lines</Text>
              <View style={[styles.ccgKeyDotLong, { backgroundColor: "#7DD3FC" }]} />
              <Text style={styles.ccgKeyText}>Transit lines</Text>
            </View>
          )}
          {showTransitLines && (
            <Text style={styles.ccgExplainText}>
              Transit lines show where the moving planet is angular now. City glows show where that transit is activating your natal lines. Tap transit lines for details.
            </Text>
          )}
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
              (allPlanetsEnabled || somePlanetsEnabled)
                ? { backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary }
                : {},
            ]}
            onPress={toggleAllPlanets}
          >
            <Ionicons
              name={allPlanetsEnabled ? "checkmark-done" : somePlanetsEnabled ? "remove" : "ellipse-outline"}
              size={14}
              color={(allPlanetsEnabled || somePlanetsEnabled) ? Colors.dark.primary : Colors.dark.textMuted}
            />
            <Text
              style={[
                styles.planetChipText,
                (allPlanetsEnabled || somePlanetsEnabled) && { color: Colors.dark.primary },
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

      {sentimentMode && !showFilters && (
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

      {selectedTransitLine && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedTransitLine(null)}
          />
          <View style={styles.transitOverlay}>
            <View style={styles.transitCard}>
              <View style={styles.selectedCardHeader}>
                <View
                  style={[
                    styles.selectedDot,
                    { backgroundColor: "#7DD3FC" },
                  ]}
                />
                <Text style={styles.selectedCardTitle}>
                  {getPlanetSymbol(selectedTransitLine.planet)} Transit {Colors.lineTypes[selectedTransitLine.lineType]?.label || selectedTransitLine.lineType}
                </Text>
              </View>
              <Text style={styles.selectedCardHint}>
                This is where the moving planet is angular at the selected time.
              </Text>
              {selectedTransitActivations.length > 0 ? (
                <View style={styles.transitActivationList}>
                  {selectedTransitActivations.map((activation, index) => (
                    <Text key={`${activation.transitPlanet}-${activation.natalPlanet}-${index}`} style={styles.transitActivationText}>
                      {getPlanetSymbol(activation.transitPlanet)} {getAspectGlyph(activation.aspect)} {getPlanetSymbol(activation.natalPlanet)} ({activation.intensity})
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.transitActivationEmpty}>
                  No active natal-line aspect match for this transit line at this time.
                </Text>
              )}
              <Pressable
                style={({ pressed }) => [styles.transitDetailsBtn, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  setSelectedTransitLine(null);
                  router.push({ pathname: "/(tabs)/insights", params: { tab: "transits" } });
                }}
              >
                <Ionicons name="analytics-outline" size={13} color={Colors.dark.primary} />
                <Text style={styles.transitDetailsBtnText}>Open Transit Insights</Text>
              </Pressable>
            </View>
          </View>
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
  ccgTransitToggle: {
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ccgTransitToggleActive: {
    borderColor: "#7DD3FC77",
    backgroundColor: Colors.dark.surface,
  },
  ccgTransitToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ccgTransitToggleText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  ccgTransitToggleHint: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textMuted,
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
  ccgFilterNote: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textMuted,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ccgKeyDotLong: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  ccgKeyText: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
  ccgTransitLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.card + "EE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  ccgExplainText: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    lineHeight: 15,
    marginTop: 2,
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
  transitOverlay: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
  },
  transitCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#7DD3FC55",
    gap: 8,
  },
  transitActivationList: {
    gap: 4,
  },
  transitActivationText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
  },
  transitActivationEmpty: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
  transitDetailsBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.primary + "60",
    backgroundColor: Colors.dark.primaryMuted,
  },
  transitDetailsBtnText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
});
