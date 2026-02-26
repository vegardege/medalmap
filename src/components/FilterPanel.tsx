import { useState } from "preact/hooks";
import type { FilterState } from "../types";
import { FilterSection } from "./FilterSection";

interface Options {
  sports: string[];
  countries: string[];
  years: number[];
}

interface Props {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  clearFilters: () => void;
  activeCount: number;
  athleteCount: number;
  options: Options;
}

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function FilterPanel({
  filters,
  setFilters,
  clearFilters,
  activeCount,
  athleteCount,
  options,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const visibleCountries = countrySearch
    ? options.countries.filter((c) =>
        c.toLowerCase().includes(countrySearch.toLowerCase()),
      )
    : options.countries;

  const panel = (
    <div class="filter-panel">
      <div class="filter-panel-header">
        <span class="filter-panel-count">
          {athleteCount} athlete{athleteCount !== 1 ? "s" : ""}
        </span>
        <button
          class="filter-clear"
          type="button"
          style={activeCount === 0 ? "visibility: hidden" : ""}
          onClick={() => {
            clearFilters();
            setCountrySearch("");
          }}
        >
          Clear
        </button>
        {/* Mobile close button */}
        <button
          class="filter-panel-close"
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close filters"
        >
          ✕
        </button>
      </div>

      <div class="filter-sections">
        <FilterSection title="Medals" defaultOpen>
          <div class="filter-toggles">
            {(["gold", "silver", "bronze"] as const).map((m) => (
              <button
                key={m}
                type="button"
                class={`filter-toggle filter-toggle--${m}${filters.medals.includes(m) ? " active" : ""}`}
                onClick={() =>
                  setFilters({
                    ...filters,
                    medals: toggleItem(filters.medals, m),
                  })
                }
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Category" defaultOpen>
          <div class="filter-toggles">
            {(["men", "women", "mixed"] as const).map((c) => (
              <button
                key={c}
                type="button"
                class={`filter-toggle${filters.categories.includes(c) ? " active" : ""}`}
                onClick={() =>
                  setFilters({
                    ...filters,
                    categories: toggleItem(filters.categories, c),
                  })
                }
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Sport">
          <div class="filter-checklist">
            {options.sports.map((s) => (
              <label key={s} class="filter-check-label">
                <input
                  type="checkbox"
                  checked={filters.sports.includes(s)}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      sports: toggleItem(filters.sports, s),
                    })
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Country">
          <input
            class="filter-search"
            type="search"
            placeholder="Search countries…"
            value={countrySearch}
            onInput={(e) =>
              setCountrySearch((e.target as HTMLInputElement).value)
            }
          />
          <div class="filter-checklist">
            {visibleCountries.map((c) => (
              <label key={c} class="filter-check-label">
                <input
                  type="checkbox"
                  checked={filters.countries.includes(c)}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      countries: toggleItem(filters.countries, c),
                    })
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Year">
          <div class="filter-checklist">
            {options.years.map((y) => (
              <label key={y} class="filter-check-label">
                <input
                  type="checkbox"
                  checked={filters.years.includes(y)}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      years: toggleItem(filters.years, y),
                    })
                  }
                />
                {y}
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: always-visible sidebar (rendered via CSS) */}
      <div class="filter-sidebar">{panel}</div>

      {/* Mobile: FAB + bottom drawer */}
      <button
        class={`filter-fab${activeCount > 0 ? " filter-fab--active" : ""}`}
        type="button"
        aria-label="Open filters"
        onClick={() => setDrawerOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
        {activeCount > 0 && <span class="filter-fab-badge">{activeCount}</span>}
      </button>

      {drawerOpen && (
        <div
          class="filter-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div class={`filter-drawer${drawerOpen ? " filter-drawer--open" : ""}`}>
        {panel}
      </div>
    </>
  );
}
