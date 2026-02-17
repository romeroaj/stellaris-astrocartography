import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import { AstroLine, MapHotspot } from "@/lib/types";
import Colors from "@/constants/colors";
import { classifyLine, SENTIMENT_COLORS, SENTIMENT_LABELS } from "@/lib/lineClassification";
import { OVERLAP_COLORS, OVERLAP_LABELS } from "@/lib/synastryAnalysis";

export interface AstroMapHandle {
  animateToRegion: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }, duration?: number) => void;
}

interface AstroMapProps {
  lines: AstroLine[];
  hotspots?: MapHotspot[];
  birthLat: number;
  birthLon: number;
  onLinePress?: (line: AstroLine) => void;
  colorMode?: "planet" | "sentiment";
  bondMode?: "synastry" | "composite";
  ccgDualTone?: boolean;
  showOverlapHighlights?: boolean;
  onHotspotPress?: (hotspot: MapHotspot) => void;
}

let leafletLoaded = false;
let loadPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (leafletLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      leafletLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

function getDashArray(lineType: string): string | undefined {
  const dashes: Record<string, string> = {
    MC: "",
    IC: "12 6",
    ASC: "4 6",
    DSC: "16 6 4 6",
  };
  return dashes[lineType] || undefined;
}

const AstroMapWeb = forwardRef<AstroMapHandle, AstroMapProps>(function AstroMapWeb(
  {
    lines,
    hotspots = [],
    birthLat,
    birthLon,
    onLinePress,
    colorMode = "planet",
    bondMode,
    ccgDualTone = false,
    showOverlapHighlights,
    onHotspotPress,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const onLinePressRef = useRef(onLinePress);
  onLinePressRef.current = onLinePress;

  const linesRef = useRef(lines);
  linesRef.current = lines;

  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  const bondModeRef = useRef(bondMode);
  bondModeRef.current = bondMode;

  const showOverlapRef = useRef(showOverlapHighlights);
  showOverlapRef.current = showOverlapHighlights;
  const ccgDualToneRef = useRef(ccgDualTone);
  ccgDualToneRef.current = ccgDualTone;

  const hotspotsRef = useRef(hotspots);
  hotspotsRef.current = hotspots;
  const onHotspotPressRef = useRef(onHotspotPress);
  onHotspotPressRef.current = onHotspotPress;

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 800) => {
      if (mapRef.current) {
        mapRef.current.flyTo([region.latitude, region.longitude], 8, { duration: duration / 1000 });
      }
    },
  }));

  const updateLines = useCallback(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    const isSynOverlap = bondModeRef.current === "synastry" && showOverlapRef.current;

    // Draw all lines (always)
    linesRef.current.forEach((line) => {
      let color: string;
      if (!isSynOverlap && bondModeRef.current !== "synastry" && ccgDualToneRef.current) {
        color = line.sourceId === "transit" ? "#7DD3FC" : "#E8E2D6";
      } else if (line.sourceId === "transit") {
        color = Colors.dark.secondary + "CC";
      } else if (isSynOverlap) {
        if (line.isOverlapping && line.overlapClassification) {
          color = OVERLAP_COLORS[line.overlapClassification];
        } else {
          const base = line.sourceId === "user" ? Colors.dark.primary : Colors.dark.secondary;
          color = base + "20";
        }
      } else if (bondModeRef.current === "synastry" && line.sourceId) {
        color = (line.sourceId === "user" ? Colors.dark.primary : Colors.dark.secondary) + "B2";
      } else if (colorModeRef.current === "sentiment") {
        const classification = classifyLine(line.planet, line.lineType);
        color = SENTIMENT_COLORS[classification.sentiment];
      } else {
        color = Colors.planets[line.planet] || "#FFFFFF";
      }
      const dashArray = line.sourceId === "transit"
        ? (ccgDualToneRef.current ? "2 10" : "6 6")
        : getDashArray(line.lineType);
      let weight = line.sourceId === "transit" ? 2 : (line.lineType === "MC" || line.lineType === "IC" ? 3 : 2.5);
      if (isSynOverlap) {
        weight = line.isOverlapping ? weight * 1.6 : weight * 0.5;
      } else if (bondModeRef.current === "synastry") {
        weight *= 0.7;
      } else if (ccgDualToneRef.current) {
        weight = line.sourceId === "transit" ? 2.2 : 1.1;
      }
      let opacity: number;
      if (isSynOverlap) {
        opacity = line.isOverlapping ? 0.9 : 0.15;
      } else if (bondModeRef.current === "synastry") {
        opacity = 0.65;
      } else if (ccgDualToneRef.current) {
        opacity = line.sourceId === "transit" ? 0.72 : 0.55;
      } else {
        opacity = 0.85;
      }

      const coords = line.points.map((pt) => [pt.latitude, pt.longitude] as [number, number]);

      if (line.sourceId === "transit" && ccgDualToneRef.current) {
        const glow = L.polyline(coords, {
          color: "#7DD3FC",
          weight: weight + 4,
          opacity: 0.16,
          interactive: false,
        });
        layerGroupRef.current.addLayer(glow);
      }

      const polyline = L.polyline(coords, {
        color,
        weight,
        opacity,
        dashArray,
        interactive: true,
      });

      polyline.on("click", () => {
        onLinePressRef.current?.(line);
      });

      const lt = Colors.lineTypes[line.lineType];
      const label = lt ? lt.label : line.lineType;
      const planetName = line.planet.charAt(0).toUpperCase() + line.planet.slice(1);
      let tooltipText = `${planetName} ${label}`;
      if (isSynOverlap && line.isOverlapping && line.overlapClassification) {
        tooltipText += ` · ${OVERLAP_LABELS[line.overlapClassification]}`;
      } else if (bondModeRef.current === "synastry" && line.sourceId) {
        tooltipText += ` (${line.sourceId === "user" ? "You" : "Partner"})`;
      }
      if (colorModeRef.current === "sentiment") {
        const cls = classifyLine(line.planet, line.lineType);
        tooltipText += ` · ${SENTIMENT_LABELS[cls.sentiment]}`;
      }
      polyline.bindTooltip(tooltipText, {
        sticky: true,
        className: "astro-tooltip",
        opacity: 0.95,
      });

      layerGroupRef.current.addLayer(polyline);
    });

    // Draw hotspot markers (always)
    hotspotsRef.current.forEach((hotspot) => {
      const color = hotspot.sentiment === "positive"
        ? SENTIMENT_COLORS.positive
        : hotspot.sentiment === "difficult"
          ? SENTIMENT_COLORS.difficult
          : SENTIMENT_COLORS.neutral;
      const size = hotspot.strength >= 0.8 ? 34 : hotspot.strength >= 0.55 ? 30 : 26;
      const marker = L.marker([hotspot.latitude, hotspot.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            border:2px solid ${color};
            background:${Colors.dark.overlay};
            box-shadow:0 0 12px ${color}66;
            font-size:14px;
          ">${hotspot.emoji}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      });
      marker.on("click", () => onHotspotPressRef.current?.(hotspot));
      marker.bindTooltip(`${hotspot.emoji} ${hotspot.city} · ${hotspot.theme}`, {
        sticky: true,
        className: "astro-tooltip",
        opacity: 0.95,
      });
      layerGroupRef.current.addLayer(marker);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    loadLeaflet().then(() => {
      if (!mounted || !containerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = L.map(containerRef.current, {
        center: [birthLat, birthLon],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: false,
        worldCopyJump: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      const tooltipStyle = document.createElement("style");
      tooltipStyle.textContent = `
        .astro-tooltip {
          background: rgba(15, 21, 53, 0.92) !important;
          color: #E8E6F0 !important;
          border: 1px solid rgba(99, 102, 241, 0.4) !important;
          border-radius: 8px !important;
          padding: 6px 12px !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .astro-tooltip::before {
          border-top-color: rgba(15, 21, 53, 0.92) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(15, 21, 53, 0.85) !important;
          color: #E8E6F0 !important;
          border-color: rgba(99, 102, 241, 0.3) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30, 40, 80, 0.95) !important;
        }
      `;
      document.head.appendChild(tooltipStyle);

      const birthIcon = L.divIcon({
        className: "",
        html: `<div style="
          width: 16px; height: 16px; border-radius: 50%;
          background: ${Colors.dark.primary};
          border: 2px solid white;
          box-shadow: 0 0 12px ${Colors.dark.primary}88, 0 0 24px ${Colors.dark.primary}44;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([birthLat, birthLon], { icon: birthIcon }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      updateLines();
    });

    return () => {
      mounted = false;
    };
  }, [birthLat, birthLon]);

  useEffect(() => {
    updateLines();
  }, [lines, hotspots, colorMode, bondMode, ccgDualTone, showOverlapHighlights, updateLines]);

  return (
    <View style={styles.webMap}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </View>
  );
});

export default AstroMapWeb;

const styles = StyleSheet.create({
  webMap: { flex: 1, position: "relative" as any },
});
