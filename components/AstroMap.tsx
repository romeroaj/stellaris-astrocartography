import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { AstroLine, PlanetName } from "@/lib/types";
import Colors from "@/constants/colors";

interface AstroMapProps {
  lines: AstroLine[];
  birthLat: number;
  birthLon: number;
  onLinePress?: (line: AstroLine) => void;
}

export default function AstroMap({ lines, birthLat, birthLon, onLinePress }: AstroMapProps) {
  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: 30,
        longitude: 0,
        latitudeDelta: 120,
        longitudeDelta: 180,
      }}
      mapType="standard"
      userInterfaceStyle="dark"
    >
      {lines.map((line, idx) => {
        const color = Colors.planets[line.planet] || "#FFFFFF";
        const lt = Colors.lineTypes[line.lineType];
        const dash = lt ? lt.dash : [];
        return (
          <Polyline
            key={`${line.planet}-${line.lineType}-${idx}`}
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
