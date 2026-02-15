import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { BirthData } from "@/lib/types";
import {
    calculatePlanetPositions,
    calculateGST,
    generateAstroLines,
    findNearestLines,
} from "@/lib/astronomy";
import { getInterpretation, getPlanetIcon } from "@/lib/interpretations";
import { filterAstroLines } from "@/lib/settings";

const { width } = Dimensions.get("window");

interface LiveInsightsCardProps {
    location: { latitude: number; longitude: number } | null;
    birthProfile: BirthData | null;
    onClose: () => void;
    includeMinorPlanets?: boolean;
}

export function LiveInsightsCard({ location, birthProfile, onClose, includeMinorPlanets = true }: LiveInsightsCardProps) {
    const [address, setAddress] = useState<string | null>(null);
    const [loadingAddress, setLoadingAddress] = useState(false);

    // 1. Calculate nearby lines when location or profile changes
    const nearbyLines = useMemo(() => {
        if (!location || !birthProfile) return [];

        // Parse user birth data
        const [year, month, day] = birthProfile.date.split("-").map(Number);
        const [hour, minute] = birthProfile.time.split(":").map(Number);

        // Calculate planetary positions & GST
        const positions = calculatePlanetPositions(year, month, day, hour, minute, birthProfile.longitude);
        const gst = calculateGST(year, month, day, hour, minute, birthProfile.longitude);

        // Generate ALL lines worldwide, then filter by minor planets setting
        const raw = generateAstroLines(positions, gst);
        const allLines = filterAstroLines(raw, includeMinorPlanets);

        // Find nearest lines within ~200km (approx 2 degrees)
        // We use a generous radius so the user always sees *something*
        const nearest = findNearestLines(allLines, location.latitude, location.longitude, 2);

        return nearest.slice(0, 3); // Top 3 strongest
    }, [location, birthProfile, includeMinorPlanets]);

    // 2. Reverse Geocode (get city name)
    useEffect(() => {
        if (!location) return;

        let isMounted = true;
        const fetchAddress = async () => {
            setLoadingAddress(true);
            try {
                const [result] = await Location.reverseGeocodeAsync({
                    latitude: location.latitude,
                    longitude: location.longitude,
                });

                if (isMounted && result) {
                    const city = result.city || result.subregion || result.district;
                    const region = result.region || result.country;
                    setAddress([city, region].filter(Boolean).join(", "));
                }
            } catch (e) {
                console.warn("Reverse geocode failed", e);
                if (isMounted) setAddress("Unknown Location");
            } finally {
                if (isMounted) setLoadingAddress(false);
            }
        };

        fetchAddress();
        return () => { isMounted = false; };
    }, [location]);

    if (!location || !birthProfile) return null;

    // Generate a dynamic "vibe" sentence
    const vibe = nearbyLines.length > 0
        ? `You are currently experiencing strong ${nearbyLines[0].planet} energy.`
        : "You are in a neutral zone, perfect for rest and relaxation.";

    return (
        <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOutDown}
            style={styles.container}
        >
            <BlurView intensity={80} tint="dark" style={styles.blur}>
                <LinearGradient
                    colors={[Colors.dark.card, Colors.dark.card + "cc"]}
                    style={styles.gradient}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.locationContainer}>
                            <Ionicons name="navigate" size={16} color={Colors.dark.primary} />
                            {loadingAddress ? (
                                <ActivityIndicator size="small" color={Colors.dark.textMuted} style={{ marginLeft: 8 }} />
                            ) : (
                                <Text style={styles.locationText}>{address || "Analyzing coordinates..."}</Text>
                            )}
                        </View>
                        <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
                            <Ionicons name="close" size={20} color={Colors.dark.textMuted} />
                        </Pressable>
                    </View>

                    <View style={styles.divider} />

                    {/* Vibe */}
                    <Text style={styles.vibeText}>{vibe}</Text>

                    {/* Active Lines List */}
                    <View style={styles.linesList}>
                        {nearbyLines.length === 0 ? (
                            <Text style={styles.emptyText}>No major planetary lines nearby.</Text>
                        ) : (
                            nearbyLines.map((line, index) => {
                                const interp = getInterpretation(line.planet, line.lineType);
                                const iconName = getPlanetIcon(line.planet) as any;
                                return (
                                    <View key={`${line.planet}-${line.lineType}-${index}`} style={styles.lineRow}>
                                        <View style={[styles.planetBadge, { backgroundColor: Colors.dark.primary + "20" }]}>
                                            <Ionicons name={iconName} size={20} color={Colors.dark.primary} />
                                        </View>
                                        <View style={styles.lineInfo}>
                                            <Text style={styles.lineTitle}>
                                                {line.planet.charAt(0).toUpperCase() + line.planet.slice(1)} {line.lineType}
                                            </Text>
                                            <Text style={styles.lineDistance}>
                                                {Math.round(line.distance * 111)} km away ({line.influence})
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </LinearGradient>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 100, // Above tab bar
        left: 16,
        right: 16,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    blur: {
        width: "100%",
    },
    gradient: {
        padding: 20,
        width: "100%",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    locationText: {
        fontSize: 14,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.primary,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    closeButton: {
        padding: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 12,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.1)",
        marginVertical: 12,
    },
    vibeText: {
        fontSize: 16,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.text,
        lineHeight: 24,
        marginBottom: 16,
    },
    linesList: {
        gap: 12,
    },
    lineRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "rgba(0,0,0,0.2)",
        padding: 12,
        borderRadius: 16,
    },
    planetBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    planetIcon: {
        fontSize: 20,
    },
    lineInfo: {
        flex: 1,
    },
    lineTitle: {
        fontSize: 16,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.text,
    },
    lineDistance: {
        fontSize: 13,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
        marginTop: 2,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
        fontStyle: "italic",
        textAlign: "center",
        marginTop: 8,
    },
});
