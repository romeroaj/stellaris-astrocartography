import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { PlanetName, LineType, BirthData, CityActivation, LineActivation, ActivationWindow } from "@/lib/types";
import {
  getInterpretation,
  getPlanetSymbol,
  getPlanetIcon,
  getSideOfLineInfo,
} from "@/lib/interpretations";
import { getActiveProfile, formatDistance, DistanceUnit } from "@/lib/storage";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
  findNearestLines,
  SideOfLine,
} from "@/lib/astronomy";
import { getSettings } from "@/lib/storage";
import { filterAstroLines } from "@/lib/settings";
import {
  classifyLine,
  SENTIMENT_COLORS,
  LineSentiment,
} from "@/lib/lineClassification";
import { useFocusEffect } from "expo-router";
import { getCityActivation } from "@/lib/transits";
import TimeScrubber from "@/components/TimeScrubber";

// ── Signal strength bars ──────────────────────────────────────────
// Jim Lewis thresholds: 0-282km=Peak(4), 282-483km=Strong(3), 483-966km=Moderate(2), 966-1287km=Subtle(1)
function SignalBars({ distance, color }: { distance: number; color: string }) {
  const bars = distance < 282 ? 4 : distance < 483 ? 3 : distance < 966 ? 2 : 1;
  const label = distance < 282 ? "Peak" : distance < 483 ? "Strong" : distance < 966 ? "Moderate" : "Subtle";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 }}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={{
              width: 4,
              height: 4 + level * 3.5,
              borderRadius: 2,
              backgroundColor: level <= bars ? color : Colors.dark.textMuted + "30",
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, fontFamily: "Outfit_600SemiBold", color: color + "CC" }}>
        {label}
      </Text>
    </View>
  );
}

interface CityLine {
  planet: PlanetName;
  lineType: LineType;
  distance: number;
  influence: string;
  sentiment: LineSentiment;
  keywords: string[];
  side: SideOfLine;
  onPreferredSide: boolean;
}

function getSideMessage(line: CityLine): string {
  if (line.side === "on") return "Directly on this line — full intensity";

  const sideLabel = line.side === "west" ? "west" : "east";
  // West = angular = more intense expression; East = cadent = subtler/internalized
  const isAngular = line.side === "west";

  if (line.sentiment === "positive") {
    return isAngular
      ? `You're ${sideLabel} of this line — direct, full-strength benefits`
      : `You're ${sideLabel} of this line — benefits are present but more subtle`;
  }
  if (line.sentiment === "difficult") {
    return isAngular
      ? `You're ${sideLabel} of this line — challenges hit at full force here`
      : `You're ${sideLabel} of this line — challenges are softer and more manageable`;
  }
  // neutral
  return isAngular
    ? `You're ${sideLabel} of this line — effects are direct and noticeable`
    : `You're ${sideLabel} of this line — effects are more internalized`;
}

export default function CityDetailScreen() {
  const { name, country, lat, lon } = useLocalSearchParams<{
    name: string;
    country: string;
    lat: string;
    lon: string;
  }>();

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [lines, setLines] = React.useState<CityLine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [includeMinorPlanets, setIncludeMinorPlanets] = React.useState(true);
  const [distanceUnit, setDistanceUnit] = React.useState<DistanceUnit>("km");
  const [cityActivation, setCityActivation] = React.useState<CityActivation | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  useFocusEffect(
    React.useCallback(() => {
      analyze();
    }, [name, lat, lon])
  );

  // Re-compute activations when date changes (without re-analyzing all lines)
  React.useEffect(() => {
    if (!lat || !lon || loading) return;
    const recomputeActivation = async () => {
      try {
        const profile = await getActiveProfile();
        if (!profile) return;
        const activation = getCityActivation(
          name || "", parseFloat(lat), parseFloat(lon),
          profile.date, profile.time, profile.longitude, selectedDate
        );
        setCityActivation(activation);
      } catch (e) {
        console.error("Error recomputing city activation:", e);
      }
    };
    recomputeActivation();
  }, [selectedDate]);

  const analyze = async () => {
    if (!lat || !lon) { setLoading(false); return; }
    setLoading(true);
    try {
      const [profile, s] = await Promise.all([getActiveProfile(), getSettings()]);
      if (!profile) { setLoading(false); return; }
      setIncludeMinorPlanets(s.includeMinorPlanets);
      setDistanceUnit(s.distanceUnit);

      const [year, month, day] = profile.date.split("-").map(Number);
      const [hour, minute] = profile.time.split(":").map(Number);
      const positions = calculatePlanetPositions(year, month, day, hour, minute, profile.longitude);
      const gst = calculateGST(year, month, day, hour, minute, profile.longitude);
      const raw = generateAstroLines(positions, gst);
      const astroLines = filterAstroLines(raw, s.includeMinorPlanets);
      const nearby = findNearestLines(astroLines, parseFloat(lat), parseFloat(lon), 20);

      const cityLines: CityLine[] = nearby.map((item) => {
        const cls = classifyLine(item.planet, item.lineType);
        const lt = item.lineType as LineType;
        const sideInfo = getSideOfLineInfo(item.planet, lt, cls.sentiment);
        const onPreferred = item.side === "on" || item.side === sideInfo.preferredSide || sideInfo.preferredSide === "both";
        return {
          planet: item.planet,
          lineType: lt,
          distance: item.distance,
          influence: item.influence,
          sentiment: cls.sentiment,
          keywords: cls.keywords,
          side: item.side,
          onPreferredSide: onPreferred,
        };
      });

      setLines(cityLines);

      // Compute cyclocartography activation for this city
      try {
        const activation = getCityActivation(
          name || "", parseFloat(lat), parseFloat(lon),
          profile.date, profile.time, profile.longitude, selectedDate
        );
        setCityActivation(activation);
      } catch (e) {
        console.error("Error computing city activation:", e);
      }
    } catch (e) {
      console.error("Error analyzing city:", e);
    } finally {
      setLoading(false);
    }
  };

  const positive = lines.filter((l) => l.sentiment === "positive");
  const difficult = lines.filter((l) => l.sentiment === "difficult");
  const neutral = lines.filter((l) => l.sentiment === "neutral");

  // Overall vibe
  const vibeText = positive.length > difficult.length
    ? "This city has mostly positive energy for you."
    : difficult.length > positive.length
      ? "This city carries some challenging energy — proceed with awareness."
      : lines.length > 0
        ? "This city has a mix of energies — both opportunities and challenges."
        : "No major planetary lines near this city for you.";

  const vibeColor = positive.length > difficult.length
    ? SENTIMENT_COLORS.positive
    : difficult.length > positive.length
      ? SENTIMENT_COLORS.difficult
      : SENTIMENT_COLORS.neutral;

  // Top themes
  const allThemes = lines
    .flatMap((l) => l.keywords.slice(0, 4))
    .reduce((acc, kw) => {
      acc[kw] = (acc[kw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const topThemes = Object.entries(allThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([theme]) => theme);

  const renderLineGroup = (
    title: string,
    icon: string,
    groupLines: CityLine[],
    color: string,
    description: string
  ) => {
    if (groupLines.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon as any} size={18} color={color} />
          <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: color + "18" }]}>
            <Text style={[styles.countText, { color }]}>{groupLines.length}</Text>
          </View>
        </View>
        <Text style={styles.sectionDesc}>{description}</Text>
        {groupLines.map((line, i) => {
          const interp = getInterpretation(line.planet, line.lineType);
          const sentColor = SENTIMENT_COLORS[line.sentiment];
          const planetColor = Colors.planets[line.planet] || "#FFFFFF";
          return (
            <Pressable
              key={`${line.planet}-${line.lineType}-${i}`}
              style={({ pressed }) => [styles.lineCard, pressed && { opacity: 0.8 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/line-detail",
                  params: { planet: line.planet, lineType: line.lineType },
                });
              }}
            >
              <View style={styles.lineCardTop}>
                <View style={[styles.planetIcon, { backgroundColor: planetColor + "20" }]}>
                  <Ionicons name={getPlanetIcon(line.planet) as any} size={16} color={planetColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>
                    {getPlanetSymbol(line.planet)} {Colors.lineTypes[line.lineType]?.label}
                  </Text>
                  <Text style={styles.lineDist}>{formatDistance(line.distance, distanceUnit)} away</Text>
                </View>
                <SignalBars distance={line.distance} color={sentColor} />
              </View>
              {/* East / West side badge */}
              <View style={styles.sideRow}>
                <Ionicons
                  name="compass-outline"
                  size={13}
                  color={line.onPreferredSide ? "#10B981" : (line.sentiment === "difficult" ? SENTIMENT_COLORS.difficult : Colors.dark.textMuted)}
                />
                <Text style={[
                  styles.sideText,
                  { color: line.onPreferredSide ? "#10B981" : (line.sentiment === "difficult" ? SENTIMENT_COLORS.difficult : Colors.dark.textMuted) },
                ]}>
                  {getSideMessage(line)}
                </Text>
              </View>
              <Text style={styles.lineDesc} numberOfLines={3}>
                {interp.shortDesc}
              </Text>
              {interp.themes.length > 0 && (
                <View style={styles.lineThemes}>
                  {interp.themes.slice(0, 4).map((theme) => (
                    <View key={theme} style={[styles.lineThemeBadge, { backgroundColor: sentColor + "12" }]}>
                      <Text style={[styles.lineThemeText, { color: sentColor }]}>{theme}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.lineArrow}>
                <Text style={styles.lineArrowText}>Full details</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <LinearGradient
            colors={[vibeColor + "18", Colors.dark.background]}
            style={styles.heroSection}
          >
            <Ionicons name="location" size={28} color={vibeColor} />
            <Text style={styles.heroCity}>{name}</Text>
            <Text style={styles.heroCountry}>{country}</Text>

            {/* Summary badges */}
            <View style={styles.summaryRow}>
              {positive.length > 0 && (
                <View style={[styles.summaryBadge, { backgroundColor: SENTIMENT_COLORS.positive + "18" }]}>
                  <Ionicons name="checkmark-circle" size={14} color={SENTIMENT_COLORS.positive} />
                  <Text style={[styles.summaryBadgeText, { color: SENTIMENT_COLORS.positive }]}>
                    {positive.length} positive
                  </Text>
                </View>
              )}
              {difficult.length > 0 && (
                <View style={[styles.summaryBadge, { backgroundColor: SENTIMENT_COLORS.difficult + "18" }]}>
                  <Ionicons name="warning" size={14} color={SENTIMENT_COLORS.difficult} />
                  <Text style={[styles.summaryBadgeText, { color: SENTIMENT_COLORS.difficult }]}>
                    {difficult.length} challenging
                  </Text>
                </View>
              )}
              {neutral.length > 0 && (
                <View style={[styles.summaryBadge, { backgroundColor: SENTIMENT_COLORS.neutral + "18" }]}>
                  <Ionicons name="remove-circle" size={14} color={SENTIMENT_COLORS.neutral} />
                  <Text style={[styles.summaryBadgeText, { color: SENTIMENT_COLORS.neutral }]}>
                    {neutral.length} neutral
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.vibeText, { color: vibeColor }]}>{vibeText}</Text>

            {/* Show on Map CTA */}
            <Pressable
              style={({ pressed }) => [styles.mapBtn, { borderColor: vibeColor }, pressed && { backgroundColor: vibeColor + "15" }]}
              onPress={() => {
                router.push({ pathname: "/(tabs)", params: {} });
              }}
            >
              <Ionicons name="map-outline" size={16} color={vibeColor} />
              <Text style={[styles.mapBtnText, { color: vibeColor }]}>Show on Map</Text>
            </Pressable>
          </LinearGradient>

          {/* ── Cyclocartography: Transit Activation ── */}
          {cityActivation && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pulse" size={18} color={Colors.dark.secondary} />
                <Text style={[styles.sectionTitle, { color: Colors.dark.secondary }]}>
                  Cosmic Timing
                </Text>
                <View style={[
                  styles.activationBadge,
                  {
                    backgroundColor: cityActivation.activationStrength === "peak" ? Colors.dark.primary + "20"
                      : cityActivation.activationStrength === "active" ? Colors.dark.secondary + "20"
                      : cityActivation.activationStrength === "building" ? Colors.dark.textSecondary + "20"
                      : Colors.dark.textMuted + "20",
                  },
                ]}>
                  <View style={[
                    styles.activationDot,
                    {
                      backgroundColor: cityActivation.activationStrength === "peak" ? Colors.dark.primary
                        : cityActivation.activationStrength === "active" ? Colors.dark.secondary
                        : cityActivation.activationStrength === "building" ? Colors.dark.textSecondary
                        : Colors.dark.textMuted,
                    },
                  ]} />
                  <Text style={[
                    styles.activationBadgeText,
                    {
                      color: cityActivation.activationStrength === "peak" ? Colors.dark.primary
                        : cityActivation.activationStrength === "active" ? Colors.dark.secondary
                        : cityActivation.activationStrength === "building" ? Colors.dark.textSecondary
                        : Colors.dark.textMuted,
                    },
                  ]}>
                    {cityActivation.activationStrength === "peak" ? "Peak Activation"
                      : cityActivation.activationStrength === "active" ? "Active"
                      : cityActivation.activationStrength === "building" ? "Building"
                      : "Quiet"}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionDesc}>
                {cityActivation.activationStrength === "peak"
                  ? "This city's energy is at its strongest right now — an exceptional time to engage with it."
                  : cityActivation.activationStrength === "active"
                    ? "Transits are activating your lines near this city — heightened energy and significance."
                    : cityActivation.activationStrength === "building"
                      ? "Energy is building here — approaching a more significant period."
                      : "No major transits activating this city's lines right now."}
              </Text>

              <TimeScrubber
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                compact
              />

              {/* Active transits for this city */}
              {cityActivation.activeTransits.length > 0 && (
                <View style={styles.cityTransitList}>
                  {cityActivation.activeTransits.slice(0, 4).map((transit, i) => {
                    const planetColor = Colors.planets[transit.natalPlanet] || "#FFFFFF";
                    const intensityColor = transit.intensity === "exact" ? Colors.dark.primary
                      : transit.intensity === "strong" ? Colors.dark.secondary
                      : Colors.dark.textSecondary;

                    return (
                      <View key={`${transit.transitPlanet}-${transit.natalPlanet}-${i}`} style={styles.cityTransitCard}>
                        <View style={[styles.cityTransitDot, { backgroundColor: intensityColor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cityTransitTitle}>
                            {getPlanetSymbol(transit.transitPlanet)} → {getPlanetSymbol(transit.natalPlanet)} Lines
                          </Text>
                          <Text style={styles.cityTransitDesc} numberOfLines={2}>
                            {transit.insight}
                          </Text>
                        </View>
                        <Text style={[styles.cityTransitIntensity, { color: intensityColor }]}>
                          {transit.intensity}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Best time to visit */}
              {cityActivation.bestVisitWindow && (
                <View style={styles.bestVisitCard}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.dark.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bestVisitTitle}>Best Time to Visit</Text>
                    <Text style={styles.bestVisitDates}>
                      {cityActivation.bestVisitWindow.startDate} — {cityActivation.bestVisitWindow.endDate}
                    </Text>
                    <Text style={styles.bestVisitDesc}>
                      {cityActivation.bestVisitWindow.peakDescription}
                    </Text>
                  </View>
                </View>
              )}

              {/* Next activation */}
              {cityActivation.nextActivation && !cityActivation.bestVisitWindow && (
                <View style={styles.nextActivationCard}>
                  <Ionicons name="time-outline" size={16} color={Colors.dark.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextActivationTitle}>Next Activation</Text>
                    <Text style={styles.nextActivationDates}>
                      {cityActivation.nextActivation.startDate} — {cityActivation.nextActivation.endDate}
                    </Text>
                    <Text style={styles.nextActivationDesc}>
                      {cityActivation.nextActivation.peakDescription}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Top themes ── */}
          {topThemes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="layers-outline" size={18} color={Colors.dark.secondary} />
                <Text style={[styles.sectionTitle, { color: Colors.dark.secondary }]}>Key Themes Here</Text>
              </View>
              <View style={styles.themesGrid}>
                {topThemes.map((theme) => (
                  <View key={theme} style={styles.themeChip}>
                    <Text style={styles.themeChipText}>{theme}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Line groups ── */}
          {renderLineGroup(
            "The Good",
            "checkmark-circle-outline",
            positive,
            SENTIMENT_COLORS.positive,
            "Beneficial planetary energies that support and uplift you here."
          )}
          {renderLineGroup(
            "The Challenging",
            "warning-outline",
            difficult,
            SENTIMENT_COLORS.difficult,
            "Difficult energies to be aware of — not deal-breakers, but worth knowing."
          )}
          {renderLineGroup(
            "The Neutral",
            "remove-circle-outline",
            neutral,
            SENTIMENT_COLORS.neutral,
            "Mixed energies that can go either way depending on how you engage with them."
          )}

          {lines.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="telescope-outline" size={40} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>
                No major planetary lines pass near {name}. This location has minimal astrological influence for you.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  // ── Hero ──
  heroSection: {
    alignItems: "center",
    paddingVertical: 28,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroCity: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
    marginTop: 12,
  },
  heroCountry: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryBadgeText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  vibeText: {
    fontSize: 15,
    fontFamily: "Outfit_500Medium",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 22,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: Colors.dark.surface,
  },
  mapBtnText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  // ── Sections ──
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    marginBottom: 12,
    lineHeight: 19,
  },
  // ── Themes ──
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.secondaryMuted,
  },
  themeChipText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.secondary,
    textTransform: "capitalize" as const,
  },
  // ── Line cards ──
  lineCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  lineCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  planetIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  lineName: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  lineDist: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  sideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  sideText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    lineHeight: 16,
  },
  lineDesc: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 21,
    marginBottom: 10,
  },
  lineThemes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  lineThemeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lineThemeText: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    textTransform: "capitalize" as const,
  },
  lineArrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  lineArrowText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textMuted,
  },
  // ── Empty ──
  emptyState: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  // ── Cyclocartography: Transit Activation ──
  activationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activationBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
  },
  cityTransitList: {
    gap: 8,
    marginTop: 12,
  },
  cityTransitCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 12,
  },
  cityTransitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  cityTransitTitle: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  cityTransitDesc: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  cityTransitIntensity: {
    fontSize: 10,
    fontFamily: "Outfit_700Bold",
    textTransform: "capitalize" as const,
  },
  bestVisitCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.dark.success + "10",
    borderWidth: 1,
    borderColor: Colors.dark.success + "30",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  bestVisitTitle: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.success,
    marginBottom: 2,
  },
  bestVisitDates: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  bestVisitDesc: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  nextActivationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  nextActivationTitle: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  nextActivationDates: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  nextActivationDesc: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
});
