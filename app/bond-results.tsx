import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { BirthData } from "@/lib/types";
import { getActiveProfile, getSettings } from "@/lib/storage";
import { getPlanetSymbol } from "@/lib/interpretations";
import {
  generateBondSummary,
  BondSummary,
  OverlapInsight,
  OVERLAP_COLORS,
  OVERLAP_LABELS,
  OVERLAP_DESCRIPTIONS,
} from "@/lib/synastryAnalysis";

export default function BondResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const partnerId = Array.isArray(params.partnerId)
    ? params.partnerId[0]
    : params.partnerId;
  const partnerName = Array.isArray(params.partnerName)
    ? params.partnerName[0]
    : params.partnerName;
  const bondType = (Array.isArray(params.bondType)
    ? params.bondType[0]
    : params.bondType) as "synastry" | "composite";

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BondSummary | null>(null);
  const [userProfile, setUserProfile] = useState<BirthData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<BirthData | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    loadAndCompute();
  }, []);

  const loadAndCompute = async () => {
    setLoading(true);
    try {
      const [me, partnerData, settings] = await Promise.all([
        getActiveProfile(),
        import("@/lib/friendProfile").then((m) => m.fetchFriendProfile(partnerId, partnerName || undefined)),
        getSettings(),
      ]);

      if (!me) {
        Alert.alert("Chart Required", "Set up your birth chart first.");
        router.back();
        return;
      }
      setUserProfile(me);

      if (!partnerData) {
        Alert.alert("Partner Unavailable", "Could not load your partner's chart.");
        router.back();
        return;
      }

      const partner: BirthData = {
        ...partnerData,
        id: `partner_${partnerData.id}`,
        name: partnerName || partnerData.name || "Partner",
      };
      setPartnerProfile(partner);

      const result = generateBondSummary(
        me,
        partner,
        settings.includeMinorPlanets
      );
      setSummary(result);
    } catch (e) {
      Alert.alert("Error", "Something went wrong generating your bond.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleViewMap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace({
      pathname: "/",
      params: {
        mode: "bond",
        bondType,
        partnerId,
        partnerName,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Reading the stars...</Text>
      </View>
    );
  }

  if (!summary || !userProfile || !partnerProfile) return null;

  const positiveCount =
    summary.harmonious.length + summary.slightlyPositive.length;
  const challengingCount =
    summary.challenging.length + summary.slightlyChallenging.length;
  const firstName = (partnerName || "Partner").split(" ")[0];

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {bondType === "synastry" ? "Synastry" : "Composite"} with{" "}
            {firstName}
          </Text>
          <Text style={styles.headerSub}>
            {summary.totalOverlaps} shared overlap
            {summary.totalOverlaps !== 1 ? "s" : ""} found
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Summary ── */}
        <LinearGradient
          colors={[Colors.dark.card, Colors.dark.surface]}
          style={styles.heroCard}
        >
          <Text style={styles.heroEmoji}>
            {positiveCount > challengingCount
              ? "✨"
              : challengingCount > positiveCount
              ? "🌊"
              : "⚖️"}
          </Text>
          <Text style={styles.heroTitle}>
            {positiveCount > challengingCount
              ? `You and ${firstName} share strong cosmic harmony`
              : challengingCount > positiveCount
              ? `You and ${firstName} face some cosmic challenges`
              : `You and ${firstName} have a balanced cosmic bond`}
          </Text>
          <Text style={styles.heroDesc}>
            {positiveCount > 0 && challengingCount > 0
              ? `${positiveCount} harmonious area${positiveCount !== 1 ? "s" : ""} and ${challengingCount} challenging area${challengingCount !== 1 ? "s" : ""} — every relationship has both.`
              : positiveCount > 0
              ? `${positiveCount} harmonious area${positiveCount !== 1 ? "s" : ""} where you thrive together.`
              : challengingCount > 0
              ? `${challengingCount} area${challengingCount !== 1 ? "s" : ""} of shared intensity — growth through challenge.`
              : "Your charts reveal a balanced shared energy across the globe."}
          </Text>
          <View style={styles.heroStats}>
            <StatPill
              count={summary.harmonious.length}
              label="Harmonious"
              color={OVERLAP_COLORS.harmonious}
            />
            <StatPill
              count={summary.slightlyPositive.length}
              label="Slightly +"
              color={OVERLAP_COLORS.slightly_positive}
            />
            <StatPill
              count={summary.tension.length}
              label="Tension"
              color={OVERLAP_COLORS.tension}
            />
            <StatPill
              count={summary.challenging.length}
              label="Challenging"
              color={OVERLAP_COLORS.challenging}
            />
          </View>
        </LinearGradient>

        {/* ── Sections ── */}
        {summary.harmonious.length > 0 && (
          <InsightSection
            title="Great Places Together"
            subtitle={`Where you and ${firstName} both thrive`}
            icon="heart"
            color={OVERLAP_COLORS.harmonious}
            insights={summary.harmonious}
          />
        )}

        {summary.slightlyPositive.length > 0 && (
          <InsightSection
            title="Generally Good Vibes"
            subtitle="Leaning positive for you both"
            icon="sunny"
            color={OVERLAP_COLORS.slightly_positive}
            insights={summary.slightlyPositive}
          />
        )}

        {summary.neutralOverlap.length > 0 && (
          <InsightSection
            title="Balanced Shared Energy"
            subtitle="Neither strongly positive nor difficult"
            icon="swap-horizontal"
            color={OVERLAP_COLORS.neutral_overlap}
            insights={summary.neutralOverlap}
          />
        )}

        {summary.tension.length > 0 && (
          <InsightSection
            title="Opposite Energies"
            subtitle={`One of you may love it, the other not so much`}
            icon="thunderstorm"
            color={OVERLAP_COLORS.tension}
            insights={summary.tension}
          />
        )}

        {summary.slightlyChallenging.length > 0 && (
          <InsightSection
            title="Slightly Challenging"
            subtitle="A bit more friction in these areas"
            icon="alert-circle"
            color={OVERLAP_COLORS.slightly_challenging}
            insights={summary.slightlyChallenging}
          />
        )}

        {summary.challenging.length > 0 && (
          <InsightSection
            title="Places to Navigate Carefully"
            subtitle={`Shared intensity — requires patience from both`}
            icon="warning"
            color={OVERLAP_COLORS.challenging}
            insights={summary.challenging}
          />
        )}

        {summary.totalOverlaps === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Close Overlaps Found</Text>
            <Text style={styles.emptyDesc}>
              Your charts are quite independent — you each have unique
              strengths in different places. View the map to explore both
              charts side by side.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View
        style={[
          styles.ctaContainer,
          { paddingBottom: (insets.bottom || 0) + 16 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleViewMap}
        >
          <LinearGradient
            colors={[Colors.dark.primary, Colors.dark.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="map" size={20} color="#fff" />
            <Text style={styles.ctaText}>Explore on Map</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Sub-Components ───

function StatPill({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <View style={[styles.statPill, { borderColor: color + "50" }]}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InsightSection({
  title,
  subtitle,
  icon,
  color,
  insights,
}: {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  insights: OverlapInsight[];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
      </View>
      {insights.map((insight) => (
        <InsightCard key={`${insight.planet}-${insight.lineType}`} insight={insight} />
      ))}
    </View>
  );
}

function InsightCard({ insight }: { insight: OverlapInsight }) {
  const color = OVERLAP_COLORS[insight.classification];
  const lineLabel =
    Colors.lineTypes[insight.lineType]?.label || insight.lineType;

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={[styles.insightDot, { backgroundColor: color }]} />
        <Text style={styles.insightTitle}>
          {getPlanetSymbol(insight.planet)} {lineLabel}
        </Text>
        <Text style={styles.insightProximity}>
          {insight.proximityDeg.toFixed(0)}° apart
        </Text>
      </View>
      <Text style={styles.insightDesc}>{insight.shortDesc}</Text>
      {insight.themes.length > 0 && (
        <View style={styles.themesRow}>
          {insight.themes.slice(0, 3).map((theme) => (
            <View key={theme} style={styles.themeChip}>
              <Text style={styles.themeText}>{theme}</Text>
            </View>
          ))}
        </View>
      )}
      {insight.nearbyCities.length > 0 && (
        <View style={styles.citiesRow}>
          <Ionicons
            name="location"
            size={12}
            color={Colors.dark.textMuted}
          />
          <Text style={styles.citiesText}>
            Near{" "}
            {insight.nearbyCities
              .map((c) => c.name)
              .join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  // Hero
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  heroEmoji: { fontSize: 36, marginBottom: 12 },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 26,
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },

  // Stat pills
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statCount: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 1,
  },

  // Insight cards
  insightCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightDot: { width: 10, height: 10, borderRadius: 5 },
  insightTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  insightProximity: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
  insightDesc: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 19,
    marginTop: 8,
  },
  themesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  themeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  themeText: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
  },
  citiesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  citiesText: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },

  // Empty
  emptyCard: {
    alignItems: "center",
    padding: 32,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // CTA
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  ctaBtn: {
    borderRadius: 16,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
    color: "#fff",
  },
});
