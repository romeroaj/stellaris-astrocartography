import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { AstroLine } from "@/lib/types";
import Colors from "@/constants/colors";

interface AstroMapProps {
  lines: AstroLine[];
  birthLat: number;
  birthLon: number;
  onLinePress?: (line: AstroLine) => void;
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

export default function AstroMap({ lines, birthLat, birthLon, onLinePress }: AstroMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const onLinePressRef = useRef(onLinePress);
  onLinePressRef.current = onLinePress;

  const linesRef = useRef(lines);
  linesRef.current = lines;

  const updateLines = useCallback(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    linesRef.current.forEach((line) => {
      const color = Colors.planets[line.planet] || "#FFFFFF";
      const dashArray = getDashArray(line.lineType);
      const weight = line.lineType === "MC" || line.lineType === "IC" ? 3 : 2.5;

      const coords = line.points.map((pt) => [pt.latitude, pt.longitude] as [number, number]);

      const polyline = L.polyline(coords, {
        color,
        weight,
        opacity: 0.85,
        dashArray,
        interactive: true,
      });

      polyline.on("click", () => {
        onLinePressRef.current?.(line);
      });

      const lt = Colors.lineTypes[line.lineType];
      const label = lt ? lt.label : line.lineType;
      const planetName = line.planet.charAt(0).toUpperCase() + line.planet.slice(1);
      polyline.bindTooltip(`${planetName} ${label}`, {
        sticky: true,
        className: "astro-tooltip",
        opacity: 0.95,
      });

      layerGroupRef.current.addLayer(polyline);
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
  }, [lines, updateLines]);

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
}

const styles = StyleSheet.create({
  webMap: { flex: 1, position: "relative" as any },
});
