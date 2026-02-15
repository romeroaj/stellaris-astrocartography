import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { AstroLine, PlanetName } from "@/lib/types";
import Colors from "@/constants/colors";
import { classifyLine, SENTIMENT_COLORS } from "@/lib/lineClassification";
import { OVERLAP_COLORS } from "@/lib/synastryAnalysis";

interface AstroMapProps {
  lines: AstroLine[];
  birthLat: number;
  birthLon: number;
  userLat?: number | null;
  userLon?: number | null;
  /** When true, shows the native blue pulsing dot for current GPS location */
  showUserLocation?: boolean;
  onLinePress?: (line: AstroLine) => void;
  colorMode?: "planet" | "simplified";
  /** When in Synastry bond mode: color lines by user vs partner */
  bondMode?: "synastry" | "composite";
  /** When true, highlight overlapping synastry lines and fade the rest */
  showOverlapHighlights?: boolean;
}

// Persist region across remounts so navigating away and back doesn't reset the view
let savedRegion: Region | null = null;

const DEFAULT_REGION: Region = {
  latitude: 30,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 180,
};

export default function AstroMap({ lines, birthLat, birthLon, userLat, userLon, showUserLocation, onLinePress, colorMode = "planet", bondMode, showOverlapHighlights }: AstroMapProps) {
  // Priority: 1) saved region (user already panned), 2) GPS, 3) birth location, 4) default
  const initialRegion = React.useMemo(() => {
    if (savedRegion) return savedRegion;
    if (userLat != null && userLon != null) {
      return { latitude: userLat, longitude: userLon, latitudeDelta: 40, longitudeDelta: 60 };
    }
    if (birthLat && birthLon) {
      return { latitude: birthLat, longitude: birthLon, latitudeDelta: 40, longitudeDelta: 60 };
    }
    return DEFAULT_REGION;
  }, []); // Only compute once on mount
  const isSynastryOverlap = bondMode === "synastry" && showOverlapHighlights;

  const getColor = (line: AstroLine): string => {
    // Synastry overlap highlight mode
    if (isSynastryOverlap) {
      if (line.isOverlapping && line.overlapClassification) {
        return OVERLAP_COLORS[line.overlapClassification];
      }
      // Non-overlapping lines: deeply faded
      const base = line.sourceId === "user" ? Colors.dark.primary : Colors.dark.secondary;
      return base + "20"; // ~12% opacity
    }
    // Standard synastry coloring (overlap highlights off)
    if (bondMode === "synastry" && line.sourceId) {
      const hex = line.sourceId === "user" ? Colors.dark.primary : Colors.dark.secondary;
      return hex + "B2"; // ~70% opacity
    }
    if (colorMode === "simplified") {
      const classification = classifyLine(line.planet, line.lineType);
      return SENTIMENT_COLORS[classification.sentiment];
    }
    return Colors.planets[line.planet] || "#FFFFFF";
  };

  const getStrokeWidth = (line: AstroLine): number => {
    const base = line.lineType === "MC" || line.lineType === "IC" ? 2.5 : 2;
    if (isSynastryOverlap) {
      return line.isOverlapping ? base * 1.4 : base * 0.5;
    }
    if (bondMode === "synastry") return base * 0.7;
    return base;
  };

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      onRegionChangeComplete={(region) => {
        savedRegion = region;
      }}
      mapType="standard"
      userInterfaceStyle="dark"
      showsUserLocation={!!showUserLocation}
    >
      {lines.map((line, idx) => {
        const color = getColor(line);
        const lt = Colors.lineTypes[line.lineType];
        const dash = lt ? lt.dash : [];
        const strokeWidth = getStrokeWidth(line);
        return (
          <Polyline
            key={`${line.planet}-${line.lineType}-${line.sourceId ?? ""}-${idx}-${lines.length}`}
            coordinates={line.points}
            strokeColor={color}
            strokeWidth={strokeWidth}
            lineDashPattern={dash}
            tappable={!!onLinePress}
            onPress={() => onLinePress?.(line)}
            zIndex={isSynastryOverlap && line.isOverlapping ? 10 : bondMode === "synastry" ? 1 : 0}
          />
        );
      })}
      <Marker
        coordinate={{ latitude: birthLat, longitude: birthLon }}
        title="Birth Location"
        pinColor={Colors.dark.primary}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
