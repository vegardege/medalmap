import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "preact/hooks";

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [10, 20],
      zoom: 2,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => map.remove();
  }, []);

  return <div class="map-container" ref={containerRef} />;
}
