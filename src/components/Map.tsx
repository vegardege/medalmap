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
        athleteCount: loc.athletes.length,
        bestMedal: bestMedal(loc.athletes.flatMap((a) => a.medals)),
      },
    })),
  };
}

export function MapView({ locations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // locationsRef: latest locations for the map.on("load") closure
  // locationsMapRef: coord-key → Location lookup for click handlers
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

    map.on("load", () => {
      map.addSource("athletes", {
        type: "geojson",
        data: toGeoJSON(locationsRef.current),
        // Only cluster dots that are literally touching on screen (~1 marker diameter)
        cluster: true,
        clusterRadius: 20,
        clusterMaxZoom: 14,
        // Aggregate best medal across clustered features so we can color the cluster circle
        clusterProperties: {
          hasGold: ["+", ["case", ["==", ["get", "bestMedal"], "gold"], 1, 0]],
          hasSilver: [
            "+",
            ["case", ["==", ["get", "bestMedal"], "silver"], 1, 0],
          ],
        },
      });

      // Cluster circle colored by the best medal among its members
      map.addLayer({
        id: "cluster-circle",
        type: "circle",
        source: "athletes",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 10,
          "circle-color": [
            "case",
            [">", ["get", "hasGold"], 0],
            MEDAL_COLORS.gold,
            [">", ["get", "hasSilver"], 0],
            MEDAL_COLORS.silver,
            MEDAL_COLORS.bronze,
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000",
        },
      });

      // Count label inside the cluster circle
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "athletes",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#000000" },
      });

      // Soft glow behind each individual marker in the same medal color
      map.addLayer({
        id: "marker-glow",
        type: "circle",
        source: "athletes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 16,
          "circle-opacity": 0.25,
          "circle-blur": 0.5,
          "circle-color": [
            "match",
            ["get", "bestMedal"],
            "gold",
            MEDAL_COLORS.gold,
            "silver",
            MEDAL_COLORS.silver,
            MEDAL_COLORS.bronze,
          ],
        },
      });

      // One dot per unique birth location, colored by best medal there
      map.addLayer({
        id: "marker-circle",
        type: "circle",
        source: "athletes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000",
          "circle-color": [
            "match",
            ["get", "bestMedal"],
            "gold",
            MEDAL_COLORS.gold,
            "silver",
            MEDAL_COLORS.silver,
            MEDAL_COLORS.bronze,
          ],
        },
      });

      // Count label on individual markers with more than one athlete
      map.addLayer({
        id: "marker-count",
        type: "symbol",
        source: "athletes",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          [">", ["get", "athleteCount"], 1],
        ],
        layout: {
          "text-field": ["get", "athleteCount"],
          "text-size": 10,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#000000" },
      });

      // Click individual marker → show popup
      map.on("click", "marker-circle", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        const key = feature.properties?.["coordKey"] as string;
        const location = locationsMapRef.current.get(key);
        if (!location) return;

        const node = document.createElement("div");
        render(<AthletePopup location={location} />, node);

        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          maxWidth: "300px",
          anchor: "bottom",
        })
          .setLngLat(coords)
          .setDOMContent(node)
          .addTo(map);
      });

      // Click cluster → zoom in to expand it
      map.on("click", "cluster-circle", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const clusterId = feature.properties["cluster_id"] as number;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        (map.getSource("athletes") as maplibregl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => map.flyTo({ center: coords, zoom: zoom + 1 }))
          .catch(() => {});
      });

      // Pointer cursor on hover
      map.on("mouseenter", "marker-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "marker-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "cluster-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cluster-circle", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div class="map-container" ref={containerRef} />;
}
