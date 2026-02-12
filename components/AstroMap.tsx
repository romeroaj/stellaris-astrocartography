import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { AstroLine, PlanetName } from "@/lib/types";
import Colors from "@/constants/colors";
import { classifyLine, SENTIMENT_COLORS } from "@/lib/lineClassification";

interface AstroMapProps {
  lines: AstroLine[];
  birthLat: number;
  birthLon: number;
  onLinePress?: (line: AstroLine) => void;
  colorMode?: "planet" | "simplified";
}

// Persist region across remounts so navigating away and back doesn't reset the view
let savedRegion: Region | null = null;

const DEFAULT_REGION: Region = {
  latitude: 30,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 180,
};

export default function AstroMap({ lines, birthLat, birthLon, onLinePress, colorMode = "planet" }: AstroMapProps) {
  const getColor = (line: AstroLine): string => {
    if (colorMode === "simplified") {
      const classification = classifyLine(line.planet, line.lineType);
      return SENTIMENT_COLORS[classification.sentiment];
    }
    return Colors.planets[line.planet] || "#FFFFFF";
  };

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={savedRegion || DEFAULT_REGION}
      onRegionChangeComplete={(region) => {
        savedRegion = region;
      }}
      mapType="standard"
      userInterfaceStyle="dark"
    >
      {lines.map((line, idx) => {
        const color = getColor(line);
        const lt = Colors.lineTypes[line.lineType];
        const dash = lt ? lt.dash : [];
        return (
          <Polyline
            key={`${line.planet}-${line.lineType}-${idx}-${lines.length}`}
            coordinates={line.points}
            strokeColor={color}
            strokeWidth={line.lineType === "MC" || line.lineType === "IC" ? 2.5 : 2}
            lineDashPattern={dash}
            tappable={!!onLinePress}
            onPress={() => onLinePress?.(line)}
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
