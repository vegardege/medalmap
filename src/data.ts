import rawData from "../data/data.json";
import { WINTER_OLYMPICS_BY_YEAR } from "./olympics";
import type { Athlete, FilterState, Location } from "./types";

export const allAthletes = rawData as Athlete[];

// Groups athletes by birth coordinates into map locations.
// Athletes with no coords are excluded (can't be placed on map).
export function groupByCoords(athletes: Athlete[]): Location[] {
  const map = new Map<string, Location>();
  for (const athlete of athletes) {
    if (!athlete.birthCoords) continue;
    const key = athlete.birthCoords.join(",");
    const existing = map.get(key);
    if (existing) {
      existing.athletes.push(athlete);
    } else {
      map.set(key, { coords: athlete.birthCoords, athletes: [athlete] });
    }
  }
  return Array.from(map.values());
}

// Returns sorted unique values for each filter dimension, derived from the
// full dataset (not the filtered one) so options don't disappear as you filter.
export function deriveFilterOptions(athletes: Athlete[]) {
  const sports = new Set<string>();
  const countries = new Set<string>();
  const years = new Set<number>();
  for (const athlete of athletes) {
    for (const medal of athlete.medals) {
      sports.add(medal.sport);
      countries.add(medal.country);
      years.add(medal.year);
    }
  }
  return {
    sports: [...sports].sort(),
    countries: [...countries].sort(),
    years: [...years].sort((a, b) => a - b),
  };
}

// Returns athletes whose medals match all active filters.
// An athlete passes if at least one of their medals satisfies every active dimension.
export function filterAthletes(
  athletes: Athlete[],
  filters: FilterState,
): Athlete[] {
  const tokens = filters.query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  return athletes
    .map((athlete) => {
      const nameLower = athlete.name.toLowerCase();
      const birthLower = (athlete.birthPlace ?? "").toLowerCase();

      const matchingMedals = athlete.medals.filter((medal) => {
        if (filters.medals.length > 0 && !filters.medals.includes(medal.medal))
          return false;
        if (filters.sports.length > 0 && !filters.sports.includes(medal.sport))
          return false;
        if (
          filters.categories.length > 0 &&
          !filters.categories.includes(medal.category)
        )
          return false;
        if (
          filters.countries.length > 0 &&
          !filters.countries.includes(medal.country)
        )
          return false;
        if (filters.yearFrom !== null && medal.year < filters.yearFrom)
          return false;
        if (filters.yearTo !== null && medal.year > filters.yearTo)
          return false;

        if (tokens.length > 0) {
          const hostCity = (
            WINTER_OLYMPICS_BY_YEAR.get(medal.year)?.city ?? ""
          ).toLowerCase();
          const sportLower = medal.sport.toLowerCase();
          const eventLower = medal.event.toLowerCase();
          const countryLower = medal.country.toLowerCase();
          const yearStr = String(medal.year);
          const tokenMatches = tokens.every(
            (t) =>
              nameLower.includes(t) ||
              birthLower.includes(t) ||
              sportLower.includes(t) ||
              eventLower.includes(t) ||
              countryLower.includes(t) ||
              yearStr.includes(t) ||
              hostCity.includes(t),
          );
          if (!tokenMatches) return false;
        }

        return true;
      });
      if (matchingMedals.length === 0) return null;
      return { ...athlete, medals: matchingMedals };
    })
    .filter((a): a is Athlete => a !== null);
}

// Returns a deduplicated, joined list of sports for an athlete.
export function getSport(athlete: Athlete): string {
  return [...new Set(athlete.medals.map((m) => m.sport))].join(" · ");
}

// Toggles an item in an array: adds it if absent, removes it if present.
export function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// Gold outranks silver outranks bronze — used to color markers.
export function bestMedal(
  medals: Athlete["medals"],
): "gold" | "silver" | "bronze" {
  if (medals.some((m) => m.medal === "gold")) return "gold";
  if (medals.some((m) => m.medal === "silver")) return "silver";
  return "bronze";
}
