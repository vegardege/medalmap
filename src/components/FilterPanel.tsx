import { useState } from "preact/hooks";
import type { FilterState } from "../types";
import { FilterSection } from "./FilterSection";
import { InfoModal } from "./InfoModal";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
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
        {/* Desktop collapse button */}
        <button
          class="filter-sidebar-toggle"
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Collapse filters"
        >
          ‹
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
        <FilterSection title="Medals">
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

        <FilterSection title="Category">
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
          <div class="filter-list">
            {options.sports.map((s) => (
              <button
                key={s}
                type="button"
                class={`filter-row${filters.sports.includes(s) ? " active" : ""}`}
                onClick={() =>
                  setFilters({
                    ...filters,
                    sports: toggleItem(filters.sports, s),
                  })
                }
              >
                {s}
              </button>
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
          <div class="filter-list">
            {visibleCountries.map((c) => (
              <button
                key={c}
                type="button"
                class={`filter-row${filters.countries.includes(c) ? " active" : ""}`}
                onClick={() =>
                  setFilters({
                    ...filters,
                    countries: toggleItem(filters.countries, c),
                  })
                }
              >
                {c}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Year">
          <div class="filter-list">
            {options.years.map((y) => (
              <button
                key={y}
                type="button"
                class={`filter-row${filters.years.includes(y) ? " active" : ""}`}
                onClick={() =>
                  setFilters({
                    ...filters,
                    years: toggleItem(filters.years, y),
                  })
                }
              >
                {y}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
      <div class="filter-panel-footer">
        <button
          class="filter-info-btn"
          type="button"
          onClick={() => setInfoOpen(true)}
        >
          About
        </button>
      </div>
    </div>
  );

  return (
    <>
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
      {/* Desktop: always-visible sidebar (rendered via CSS) */}
      <div
        class={`filter-sidebar${sidebarOpen ? "" : " filter-sidebar--collapsed"}`}
      >
        {panel}
      </div>
      <button
        class="filter-sidebar-reopen"
        type="button"
        style={sidebarOpen ? "visibility: hidden" : ""}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open filters"
      >
        ›
      </button>

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
