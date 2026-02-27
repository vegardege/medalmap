import { useCallback, useEffect, useState } from "preact/hooks";
import type { FilterState } from "../types";

const EMPTY: FilterState = {
  query: "",
  medals: [],
  sports: [],
  categories: [],
  countries: [],
  years: [],
};

// Parses a comma-separated URL param into an array, or returns [] if absent.
function parseList(params: URLSearchParams, key: string): string[] {
  const val = params.get(key);
  return val ? val.split(",") : [];
}

function parseFromUrl(): FilterState {
  const p = new URLSearchParams(window.location.search);
  return {
    query: p.get("q") ?? "",
    medals: parseList(p, "medals") as FilterState["medals"],
    sports: parseList(p, "sports"),
    categories: parseList(p, "categories") as FilterState["categories"],
    countries: parseList(p, "countries"),
    years: parseList(p, "years").map(Number).filter(Boolean) as number[],
  };
}

function serializeToUrl(filters: FilterState): void {
  const p = new URLSearchParams();
  if (filters.query) p.set("q", filters.query);
  if (filters.medals.length > 0) p.set("medals", filters.medals.join(","));
  if (filters.sports.length > 0) p.set("sports", filters.sports.join(","));
  if (filters.categories.length > 0)
    p.set("categories", filters.categories.join(","));
  if (filters.countries.length > 0)
    p.set("countries", filters.countries.join(","));
  if (filters.years.length > 0) p.set("years", filters.years.join(","));
  const search = p.toString();
  history.replaceState(
    null,
    "",
    search ? `?${search}` : window.location.pathname,
  );
}

export function useFilters() {
  const [filters, setFiltersRaw] = useState<FilterState>(parseFromUrl);

  // Keep URL in sync whenever filters change
  useEffect(() => {
    serializeToUrl(filters);
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFiltersRaw(EMPTY);
  }, []);

  const activeCount =
    (filters.query ? 1 : 0) +
    [
      filters.medals,
      filters.sports,
      filters.categories,
      filters.countries,
      filters.years,
    ].filter((arr) => arr.length > 0).length;

  return { filters, setFilters: setFiltersRaw, clearFilters, activeCount };
}
