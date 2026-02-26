import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { bestMedal } from "../data";
import type { Location } from "../types";
import { AthletePopup } from "./AthletePopup";

interface Props {
  locations: Location[];
}

const MEDAL_COLORS = {
  gold: "#d4af37",
  silver: "#a8a9ad",
  bronze: "#cd7f32",
};

function toGeoJSON(locations: Location[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: loc.coords },
      properties: {
        coordKey: loc.coords.join(","),
        bestMedal: bestMedal(loc.athletes.flatMap((a) => a.medals)),
      },
    })),
  };
}

// ── Cluster SVG ─────────────────────────────────────────────────
// Plain filled circle — the count text sits where the inner dot would be

function makeClusterSVG(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30">
    <circle cx="15" cy="15" r="13" fill="${color}" stroke="rgba(255,255,255,0.85)" stroke-width="2"/>
  </svg>`;
}

function loadImage(
  map: maplibregl.Map,
  name: string,
  svg: string,
  width: number,
  height: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image(width, height);
    img.onload = () => {
      map.addImage(name, img);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Component ───────────────────────────────────────────────────

export function MapView({ locations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const locationsRef = useRef(locations);
  const locationsMapRef = useRef(new Map<string, Location>());

  useEffect(() => {
    locationsRef.current = locations;
    const lut = new Map<string, Location>();
    for (const loc of locations) lut.set(loc.coords.join(","), loc);
    locationsMapRef.current = lut;

    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("athletes") as maplibregl.GeoJSONSource)?.setData(
      toGeoJSON(locations),
    );
  }, [locations]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [10, 20],
      zoom: 2,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      await Promise.all([
        loadImage(
          map,
          "gold-cluster",
          makeClusterSVG(MEDAL_COLORS.gold),
          30,
          30,
        ),
        loadImage(
          map,
          "silver-cluster",
          makeClusterSVG(MEDAL_COLORS.silver),
          30,
          30,
        ),
        loadImage(
          map,
          "bronze-cluster",
          makeClusterSVG(MEDAL_COLORS.bronze),
          30,
          30,
        ),
      ]);

      map.addSource("athletes", {
        type: "geojson",
        data: toGeoJSON(locationsRef.current),
        cluster: true,
        clusterRadius: 20,
        clusterMaxZoom: 14,
        clusterProperties: {
          hasGold: ["+", ["case", ["==", ["get", "bestMedal"], "gold"], 1, 0]],
          hasSilver: [
            "+",
            ["case", ["==", ["get", "bestMedal"], "silver"], 1, 0],
          ],
        },
      });

      // ── Individual markers: bullseye (circle + inner dot) ───────

      map.addLayer({
        id: "marker-bullseye",
        type: "circle",
        source: "athletes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-color": [
            "match",
            ["get", "bestMedal"],
            "gold",
            MEDAL_COLORS.gold,
            "silver",
            MEDAL_COLORS.silver,
            MEDAL_COLORS.bronze,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
        },
      });

      map.addLayer({
        id: "marker-bullseye-dot",
        type: "circle",
        source: "athletes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 3,
          "circle-color": "rgba(255,255,255,0.7)",
        },
      });

      // ── Clusters: single symbol layer so circle + count stay in sync ──

      map.addLayer({
        id: "cluster-bullseye",
        type: "symbol",
        source: "athletes",
        filter: ["has", "point_count"],
        layout: {
          "icon-image": [
            "case",
            [">", ["get", "hasGold"], 0],
            "gold-cluster",
            [">", ["get", "hasSilver"], 0],
            "silver-cluster",
            "bronze-cluster",
          ],
          "icon-allow-overlap": true,
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["Noto Sans Bold"],
          "text-anchor": "center",
        },
        paint: { "text-color": "#000000" },
      });

      // ── Interaction ─────────────────────────────────────────────

      function openPopup(
        location: Location,
        coords: [number, number],
        placeName?: string,
      ) {
        const node = document.createElement("div");
        render(
          <AthletePopup location={location} placeName={placeName} />,
          node,
        );
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          maxWidth: "300px",
          anchor: "bottom",
        })
          .setLngLat(coords)
          .setDOMContent(node)
          .addTo(map);
      }

      map.on("click", "marker-bullseye", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        const key = feature.properties?.["coordKey"] as string;
        const location = locationsMapRef.current.get(key);
        if (!location) return;
        openPopup(location, coords);
      });

      map.on("click", "cluster-bullseye", async (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const clusterId = feature.properties["cluster_id"] as number;
        const pointCount = feature.properties["point_count"] as number;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];

        const source = map.getSource("athletes") as maplibregl.GeoJSONSource;
        const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);

        const seen = new Set<string>();
        const athletes = leaves.flatMap((leaf) => {
          const key = leaf.properties?.["coordKey"] as string;
          if (seen.has(key)) return [];
          seen.add(key);
          return locationsMapRef.current.get(key)?.athletes ?? [];
        });

        openPopup({ coords, athletes }, coords, `${pointCount} athletes`);
      });

      for (const layer of ["marker-bullseye", "cluster-bullseye"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div class="map-container" ref={containerRef} />;
}
