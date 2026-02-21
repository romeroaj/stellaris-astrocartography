import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Polyline, Marker, Circle, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { AstroLine, MapHotspot } from "@/lib/types";
import Colors from "@/constants/colors";
import { classifyLine, SENTIMENT_COLORS } from "@/lib/lineClassification";
import { OVERLAP_COLORS } from "@/lib/synastryAnalysis";

export interface AstroMapHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

/** Hotspot with transit glow info */
export interface TransitGlow {
  id: string;
  latitude: number;
  longitude: number;
  intensity: number;
  color: string;
  label: string;
}

interface AstroMapProps {
  lines: AstroLine[];
  hotspots?: MapHotspot[];
  transitGlows?: TransitGlow[];
  birthLat: number;
  birthLon: number;
  userLat?: number | null;
  userLon?: number | null;
  showUserLocation?: boolean;
  onLinePress?: (line: AstroLine) => void;
  colorMode?: "planet" | "sentiment";
  bondMode?: "synastry" | "composite";
  ccgDualTone?: boolean;
  showOverlapHighlights?: boolean;
  onHotspotPress?: (hotspot: MapHotspot) => void;
}

let savedRegion: Region | null = null;

const DEFAULT_REGION: Region = {
  latitude: 30,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 180,
};

const AstroMap = forwardRef<AstroMapHandle, AstroMapProps>(function AstroMap(
  {
    lines,
    hotspots = [],
    transitGlows = [],
    birthLat,
    birthLon,
    userLat,
    userLon,
    showUserLocation,
    onLinePress,
    colorMode = "planet",
    bondMode,
    ccgDualTone = false,
    showOverlapHighlights,
    onHotspotPress,
  },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, duration = 800) => {
      mapRef.current?.animateToRegion(region, duration);
    },
  }));

  const initialRegion = React.useMemo(() => {
    if (savedRegion) return savedRegion;
    if (userLat != null && userLon != null) {
      return { latitude: userLat, longitude: userLon, latitudeDelta: 40, longitudeDelta: 60 };
    }
    if (birthLat && birthLon) {
      return { latitude: birthLat, longitude: birthLon, latitudeDelta: 40, longitudeDelta: 60 };
    }
    return DEFAULT_REGION;
  }, []);

  const isSynastryOverlap = bondMode === "synastry" && showOverlapHighlights;

  const getColor = (line: AstroLine): string => {
    if (!isSynastryOverlap && bondMode !== "synastry" && ccgDualTone) {
      return line.sourceId === "transit" ? "#7DD3FCB8" : "#E8E2D699";
    }
    if (line.sourceId === "transit") {
      return Colors.dark.secondary + "CC";
    }
    if (isSynastryOverlap) {
      if (line.isOverlapping && line.overlapClassification) {
        return OVERLAP_COLORS[line.overlapClassification];
      }
      const base = line.sourceId === "user" ? Colors.dark.primary : Colors.dark.secondary;
      return base + "20";
    }
    if (bondMode === "synastry" && line.sourceId) {
      const hex = line.sourceId === "user" ? Colors.dark.primary : Colors.dark.secondary;
      return hex + "B2";
    }
    if (colorMode === "sentiment") {
      const classification = classifyLine(line.planet, line.lineType);
      return SENTIMENT_COLORS[classification.sentiment];
    }
    return Colors.planets[line.planet] || "#FFFFFF";
  };

  const getStrokeWidth = (line: AstroLine): number => {
    if (!isSynastryOverlap && bondMode !== "synastry" && ccgDualTone) {
      return line.sourceId === "transit" ? 2.3 : 1.1;
    }
    if (line.sourceId === "transit") return 1.5;
    const base = line.lineType === "MC" || line.lineType === "IC" ? 2.5 : 2;
    if (isSynastryOverlap) {
      return line.isOverlapping ? base * 1.4 : base * 0.5;
    }
    if (bondMode === "synastry") return base * 0.7;
    return base;
  };

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      onRegionChangeComplete={(region) => { savedRegion = region; }}
      mapType="standard"
      userInterfaceStyle="dark"
      showsUserLocation={!!showUserLocation}
    >
      {lines.map((line) => {
        // Hidden lines stay mounted as invisible native overlays to work
        // around a react-native-maps iOS bug where unmounting a <Polyline>
        // does not remove the underlying MKOverlay from the map.
        if ((line as any).hidden) {
          return (
            <Polyline
              key={line.id}
              coordinates={line.points}
              strokeColor="transparent"
              strokeWidth={0}
              tappable={false}
            />
          );
        }

        const color = getColor(line);
        const lt = Colors.lineTypes[line.lineType];
        const dash = line.sourceId === "transit"
          ? (ccgDualTone ? [2, 10] : [6, 6])
          : (lt ? lt.dash : []);
        const strokeWidth = getStrokeWidth(line);

        if (line.sourceId === "transit") {
          return (
            <React.Fragment key={line.id}>
              {ccgDualTone && (
                <Polyline
                  coordinates={line.points}
                  strokeColor={"#7DD3FC30"}
                  strokeWidth={strokeWidth + 3.8}
                  tappable={false}
                  zIndex={3}
                />
              )}
              <Polyline
                coordinates={line.points}
                strokeColor={color}
                strokeWidth={strokeWidth}
                lineDashPattern={dash}
                tappable={!!onLinePress}
                onPress={() => onLinePress?.(line)}
                zIndex={ccgDualTone ? 4 : 2}
              />
            </React.Fragment>
          );
        }

        return (
          <Polyline
            key={line.id}
            coordinates={line.points}
            strokeColor={color}
            strokeWidth={strokeWidth}
            lineDashPattern={dash}
            tappable={!!onLinePress}
            onPress={() => onLinePress?.(line)}
            zIndex={(line.sourceId as string) === "transit" ? 2 : (isSynastryOverlap && line.isOverlapping ? 10 : bondMode === "synastry" ? 1 : 0)}
          />
        );
      })}
      {hotspots.map((hotspot) => {
        const markerColor = hotspot.sentiment === "positive"
          ? SENTIMENT_COLORS.positive
          : hotspot.sentiment === "difficult"
            ? SENTIMENT_COLORS.difficult
            : SENTIMENT_COLORS.neutral;
        const size = hotspot.strength >= 0.8 ? 34 : hotspot.strength >= 0.55 ? 30 : 26;
        return (
          <Marker
            key={hotspot.id}
            coordinate={{ latitude: hotspot.latitude, longitude: hotspot.longitude }}
            title={`${hotspot.emoji} ${hotspot.city}`}
            description={hotspot.details}
            onPress={() => onHotspotPress?.(hotspot)}
            tracksViewChanges={false}
          >
            <View style={[
              styles.hotspotMarker,
              { width: size, height: size, borderRadius: size / 2, borderColor: markerColor },
            ]}>
              <Text style={styles.hotspotEmoji}>{hotspot.emoji}</Text>
            </View>
          </Marker>
        );
      })}
      {transitGlows.map((glow) => {
        const radius = 60000 + glow.intensity * 120000;
        const alpha = Math.round(0.12 + glow.intensity * 0.22 * 255).toString(16).padStart(2, "0");
        const strokeAlpha = Math.round((0.25 + glow.intensity * 0.35) * 255).toString(16).padStart(2, "0");
        return (
          <React.Fragment key={`glow-${glow.id}`}>
            <Circle
              center={{ latitude: glow.latitude, longitude: glow.longitude }}
              radius={radius}
              fillColor={glow.color + alpha}
              strokeColor={glow.color + strokeAlpha}
              strokeWidth={1.5}
              zIndex={3}
            />
            <Circle
              center={{ latitude: glow.latitude, longitude: glow.longitude }}
              radius={radius * 0.5}
              fillColor={glow.color + strokeAlpha}
              strokeColor={"transparent"}
              strokeWidth={0}
              zIndex={4}
            />
          </React.Fragment>
        );
      })}
      <Marker
        coordinate={{ latitude: birthLat, longitude: birthLon }}
        title="Birth Location"
        pinColor={Colors.dark.primary}
        tracksViewChanges={false}
      />
    </MapView>
  );
});

export default AstroMap;

const styles = StyleSheet.create({
  map: { flex: 1 },
  hotspotMarker: {
    backgroundColor: Colors.dark.overlay,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  hotspotEmoji: {
    fontSize: 14,
  },
});
