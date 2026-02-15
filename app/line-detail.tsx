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
  getSideOfLineInfo,
} from "@/lib/interpretations";
import { getActiveProfile } from "@/lib/storage";
import { authFetch } from "@/lib/auth";
import {
  calculatePlanetPositions,
  calculateGST,
  generateAstroLines,
} from "@/lib/astronomy";
import { CityWithDistance, findCitiesNearLine } from "@/lib/cities";
import { classifyLine, SENTIMENT_COLORS } from "@/lib/lineClassification";
import { useFocusEffect } from "expo-router";

export default function LineDetailScreen() {
  const params = useLocalSearchParams<{
    planet: string;
    lineType: string;
    viewFriendId?: string;
    viewFriendName?: string;
  }>();
  const { planet, lineType, viewFriendId, viewFriendName } = params;

  const [nearbyCities, setNearbyCities] = React.useState<CityWithDistance[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      calculateCities();
    }, [planet, lineType, viewFriendId])
  );

  const calculateCities = async () => {
    if (!planet || !lineType) {
      setLoadingCities(false);
      return;
    }

    setLoadingCities(true);
    try {
      let profile;
      if (viewFriendId) {
        const { fetchFriendProfile } = await import("@/lib/friendProfile");
        const friendData = await fetchFriendProfile(viewFriendId, viewFriendName || undefined);
        if (!friendData) {
          setLoadingCities(false);
          return;
        }
        profile = {
          ...friendData,
          name: viewFriendName || friendData.name || "Friend",
        };
      } else {
        profile = await getActiveProfile();
      }
      if (!profile) {
        setLoadingCities(false);
        return;
      }

      // Calculate lines to get geometry (use correct profile: user or friend)
      const [year, month, day] = profile.date.split("-").map(Number);
      const [hour, minute] = profile.time.split(":").map(Number);
      const positions = calculatePlanetPositions(
        year,
        month,
        day,
        hour,
        minute,
        profile.longitude
      );
      const gst = calculateGST(year, month, day, hour, minute, profile.longitude);
      const lines = generateAstroLines(positions, gst);

      // Collect ALL segments for this planet+lineType (ASC/DSC split at dateline)
      const matchingSegments = lines.filter(
        (l) => l.planet === planet && l.lineType === lineType
      );

      if (matchingSegments.length > 0) {
        const cities = findCitiesNearLine(matchingSegments, 400);
        setNearbyCities(cities);
      }
    } catch (e) {
      console.error("Error calculating cities:", e);
    } finally {
      setLoadingCities(false);
    }
  };
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const p = planet as PlanetName;
  const lt = lineType as LineType;
  const interp = getInterpretation(p, lt);
  const cls = classifyLine(p, lt);
  const sideInfo = getSideOfLineInfo(p, lt, cls.sentiment);
  const planetColor = Colors.planets[p] || "#FFFFFF";

  const sideHeaderColor = cls.sentiment === "difficult"
    ? SENTIMENT_COLORS.difficult
    : cls.sentiment === "positive"
      ? "#10B981"
      : Colors.dark.primary;

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

          <Pressable
            style={({ pressed }) => [
              styles.showOnMapBtn,
              { borderColor: planetColor },
              pressed && { backgroundColor: planetColor + "15" },
            ]}
            onPress={() => {
              const p: Record<string, string> = { planet, lineType };
              if (viewFriendId && viewFriendName) {
                p.viewFriendId = viewFriendId;
                p.viewFriendName = viewFriendName;
              }
              router.push({
                pathname: "/(tabs)",
                params: p,
              });
            }}
          >
            <Ionicons name="map-outline" size={16} color={planetColor} />
            <Text style={[styles.showOnMapText, { color: planetColor }]}>
              Show on Map
            </Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionContent}>{interp.shortDesc}</Text>
        </View>

        {/* Major Cities Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={18} color={Colors.dark.text} />
            <Text style={styles.sectionTitle}>Major Cities Near This Line</Text>
          </View>

          {loadingCities ? (
            <Text style={[styles.sectionContent, { fontStyle: 'italic', opacity: 0.7 }]}>
              Calculating nearby cities...
            </Text>
          ) : nearbyCities.length > 0 ? (
            <View style={styles.citiesGrid}>
              {nearbyCities.map((city, i) => (
                <View key={i} style={styles.cityChip}>
                  <Ionicons name="location-sharp" size={12} color={Colors.dark.textMuted} />
                  <Text style={styles.cityText}>{city.name}, {city.country}</Text>
                  <Text style={styles.cityDist}>{Math.round(city.distance)} km</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.sectionContent, { fontStyle: 'italic', opacity: 0.7 }]}>
              No major cities found within range of this line.
            </Text>
          )}
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

        {interp.visitingHere ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="airplane-outline" size={18} color={Colors.dark.secondary} />
              <Text style={styles.sectionTitle}>Visiting Here</Text>
            </View>
            <Text style={styles.sectionContent}>{interp.visitingHere}</Text>
          </View>
        ) : null}

        {/* East / West of the Line */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="compass-outline" size={18} color={sideHeaderColor} />
            <Text style={styles.sectionTitle}>East vs West of the Line</Text>
          </View>
          <View style={[styles.sideBadge, {
            backgroundColor: sideHeaderColor + "18",
          }]}>
            <Text style={[styles.sideBadgeText, {
              color: sideHeaderColor,
            }]}>{sideInfo.summary}</Text>
          </View>
          <View style={styles.sideRow}>
            <View style={styles.sideCard}>
              <Text style={styles.sideLabel}>← West</Text>
              <Text style={styles.sideHouse}>{sideInfo.westHouse}</Text>
              <Text style={styles.sideDesc}>{sideInfo.westDesc}</Text>
            </View>
            <View style={styles.sideCard}>
              <Text style={styles.sideLabel}>East →</Text>
              <Text style={styles.sideHouse}>{sideInfo.eastHouse}</Text>
              <Text style={styles.sideDesc}>{sideInfo.eastDesc}</Text>
            </View>
          </View>
        </View>

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
  sideBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  sideBadgeText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  sideRow: {
    gap: 10,
  },
  sideCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  sideLabel: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  sideHouse: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 6,
    textTransform: "capitalize" as const,
  },
  sideDesc: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  showOnMapBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: Colors.dark.surface,
  },
  showOnMapText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  citiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  cityText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.text,
  },
  cityDist: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
});
