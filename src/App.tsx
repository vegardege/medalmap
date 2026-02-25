import { MapView } from "./components/Map";
import { allAthletes, groupByCoords } from "./data";

const locations = groupByCoords(allAthletes);

export function App() {
  return (
    <div class="app">
      <MapView locations={locations} />
    </div>
  );
}
