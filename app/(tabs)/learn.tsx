import React, { useState, useMemo, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Platform,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { BirthData, PlanetName, LineType } from "@/lib/types";
import { getActiveProfile } from "@/lib/storage";
import { calculatePlanetPositions, calculateGST, generateAstroLines } from "@/lib/astronomy";
import {
    getInterpretation,
    getPlanetSymbol,
    getPlanetIcon,
} from "@/lib/interpretations";
import { classifyLine, SENTIMENT_COLORS, LineSentiment } from "@/lib/lineClassification";

const ALL_PLANETS: PlanetName[] = [
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
];

export default function LearnScreen() {
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<BirthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"about" | "lines">("about");

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

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.dark.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: topInset + 12 }]}>
                <Text style={styles.screenTitle}>Learn</Text>
                <View style={styles.tabRow}>
                    <Pressable
                        style={[styles.tab, activeTab === "about" && styles.tabActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab("about");
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === "about" && styles.tabTextActive]}>
                            About
                        </Text>
                    </Pressable>
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
                </View>
            </View>

            {activeTab === "about" ? (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentInner}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero */}
                    <View style={styles.heroCard}>
                        <Text style={styles.heroTitle}>What is Astrocartography?</Text>
                        <Text style={styles.heroText}>
                            Astrocartography maps your birth chart onto the globe, showing where different
                            planetary energies are strongest for you. Living near these lines amplifies that
                            planet's influence on your life.
                        </Text>
                    </View>

                    {/* Line Types */}
                    <Text style={styles.sectionTitle}>The Four Line Types</Text>
                    {[
                        {
                            title: "Midheaven (MC)",
                            desc: "Where the planet culminates — affects your career and public image. Living here puts you in the spotlight.",
                            color: Colors.dark.primary,
                            dash: "solid",
                        },
                        {
                            title: "Imum Coeli (IC)",
                            desc: "Where the planet is at its lowest — affects home and private life. This is about roots, family, and inner world.",
                            color: Colors.dark.secondary,
                            dash: "dashed",
                        },
                        {
                            title: "Ascendant (ASC)",
                            desc: "Where the planet rises — affects your personality and how others see you. First impressions and identity shift here.",
                            color: "#43D9AD",
                            dash: "dotted",
                        },
                        {
                            title: "Descendant (DSC)",
                            desc: "Where the planet sets — affects partnerships and relationships. You attract different types of people here.",
                            color: "#F472B6",
                            dash: "long-dash",
                        },
                    ].map((item) => (
                        <View key={item.title} style={styles.lineTypeCard}>
                            <View style={[styles.lineTypeDot, { backgroundColor: item.color }]} />
                            <View style={styles.lineTypeContent}>
                                <Text style={styles.lineTypeTitle}>{item.title}</Text>
                                <Text style={styles.lineTypeDesc}>{item.desc}</Text>
                            </View>
                        </View>
                    ))}

                    {/* Planet Overview */}
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Planet Energies</Text>
                    {[
                        { planet: "sun" as PlanetName, energy: "Identity, vitality, ego", vibe: "positive" },
                        { planet: "moon" as PlanetName, energy: "Emotions, intuition, comfort", vibe: "positive" },
                        { planet: "mercury" as PlanetName, energy: "Communication, intellect, travel", vibe: "neutral" },
                        { planet: "venus" as PlanetName, energy: "Love, beauty, art, pleasure", vibe: "positive" },
                        { planet: "mars" as PlanetName, energy: "Drive, conflict, passion", vibe: "difficult" },
                        { planet: "jupiter" as PlanetName, energy: "Luck, expansion, abundance", vibe: "positive" },
                        { planet: "saturn" as PlanetName, energy: "Discipline, challenges, lessons", vibe: "difficult" },
                        { planet: "uranus" as PlanetName, energy: "Rebellion, innovation, surprise", vibe: "neutral" },
                        { planet: "neptune" as PlanetName, energy: "Dreams, spirituality, illusion", vibe: "neutral" },
                        { planet: "pluto" as PlanetName, energy: "Transformation, power, rebirth", vibe: "difficult" },
                    ].map(({ planet, energy, vibe }) => (
                        <View key={planet} style={styles.planetEnergy}>
                            <View style={[styles.planetDot, { backgroundColor: Colors.planets[planet] }]} />
                            <Text style={[styles.planetLabel, { color: Colors.planets[planet] }]}>
                                {getPlanetSymbol(planet)}
                            </Text>
                            <Text style={styles.planetEnergyText}>{energy}</Text>
                            <View style={[styles.vibeBadge, { backgroundColor: SENTIMENT_COLORS[vibe as LineSentiment] + "20" }]}>
                                <Text style={[styles.vibeBadgeText, { color: SENTIMENT_COLORS[vibe as LineSentiment] }]}>
                                    {vibe}
                                </Text>
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
                    {!profile ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="person-outline" size={40} color={Colors.dark.textMuted} />
                            <Text style={styles.emptyText}>Set up your birth data first</Text>
                        </View>
                    ) : (
                        ALL_PLANETS.map((planet) => (
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
                        ))
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
    header: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: Colors.dark.background,
    },
    screenTitle: {
        fontSize: 32,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.text,
        marginBottom: 14,
    },
    tabRow: {
        flexDirection: "row",
        backgroundColor: Colors.dark.surface,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: Colors.dark.card,
    },
    tabText: {
        fontSize: 14,
        fontFamily: "Outfit_500Medium",
        color: Colors.dark.textMuted,
    },
    tabTextActive: {
        color: Colors.dark.text,
        fontFamily: "Outfit_600SemiBold",
    },
    content: { flex: 1 },
    contentInner: { paddingHorizontal: 20, gap: 12 },

    // ── About Tab ──
    heroCard: {
        backgroundColor: Colors.dark.card,
        borderRadius: 18,
        padding: 22,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 22,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.text,
        marginBottom: 10,
    },
    heroText: {
        fontSize: 15,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        lineHeight: 23,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.text,
        marginBottom: 4,
    },
    lineTypeCard: {
        flexDirection: "row",
        gap: 14,
        backgroundColor: Colors.dark.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    lineTypeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    lineTypeContent: { flex: 1 },
    lineTypeTitle: {
        fontSize: 15,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.text,
        marginBottom: 4,
    },
    lineTypeDesc: {
        fontSize: 13,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        lineHeight: 19,
    },
    planetEnergy: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: Colors.dark.card,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    planetDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    planetLabel: {
        fontSize: 14,
        fontFamily: "Outfit_600SemiBold",
        width: 80,
    },
    planetEnergyText: {
        flex: 1,
        fontSize: 13,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
    },
    vibeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    vibeBadgeText: {
        fontSize: 10,
        fontFamily: "Outfit_600SemiBold",
        textTransform: "capitalize" as const,
    },

    // ── Lines Tab ──
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        paddingTop: 80,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
    },
    planetSection: {
        gap: 10,
        marginBottom: 8,
    },
    planetHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    planetIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    planetName: {
        fontSize: 16,
        fontFamily: "Outfit_700Bold",
    },
    linesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    lineCard: {
        width: "48%" as any,
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
        fontSize: 12,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.primary,
    },
    lineCardDesc: {
        fontSize: 12,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        lineHeight: 17,
    },
});
