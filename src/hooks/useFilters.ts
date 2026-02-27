import { useCallback, useEffect, useState } from "preact/hooks";
import type { FilterState } from "../types";

const EMPTY: FilterState = {
  query: "",
  medals: [],
  sports: [],
  categories: [],
  yearFrom: null,
  yearTo: null,
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
    yearFrom: p.get("yearFrom") ? Number(p.get("yearFrom")) : null,
    yearTo: p.get("yearTo") ? Number(p.get("yearTo")) : null,
  };
}

function serializeToUrl(filters: FilterState): void {
  const p = new URLSearchParams();
  if (filters.query) p.set("q", filters.query);
  if (filters.medals.length > 0) p.set("medals", filters.medals.join(","));
  if (filters.sports.length > 0) p.set("sports", filters.sports.join(","));
  if (filters.categories.length > 0)
    p.set("categories", filters.categories.join(","));
  if (filters.yearFrom !== null) p.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo !== null) p.set("yearTo", String(filters.yearTo));
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
    [filters.medals, filters.sports, filters.categories].filter(
      (arr) => arr.length > 0,
    ).length +
    (filters.yearFrom !== null || filters.yearTo !== null ? 1 : 0);

  return { filters, setFilters: setFiltersRaw, clearFilters, activeCount };
}
