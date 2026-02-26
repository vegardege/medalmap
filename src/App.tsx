import { FilterPanel } from "./components/FilterPanel";
import { MapView } from "./components/Map";
import {
  allAthletes,
  deriveFilterOptions,
  filterAthletes,
  groupByCoords,
} from "./data";
import { useFilters } from "./hooks/useFilters";

const options = deriveFilterOptions(allAthletes);

export function App() {
  const { filters, setFilters, clearFilters, activeCount } = useFilters();
  const filtered = filterAthletes(allAthletes, filters);
  const locations = groupByCoords(filtered);

  return (
    <div class="app">
      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        activeCount={activeCount}
        athleteCount={filtered.length}
        options={options}
      />
      <MapView locations={locations} />
    </div>
  );
}
