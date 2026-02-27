import { useState } from "preact/hooks";
import { toggleItem } from "../data";
import type { FilterState } from "../types";
import { FilterSection } from "./FilterSection";
import { InfoModal } from "./InfoModal";
import { MissingDataModal } from "./MissingDataModal";

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
  const [missingOpen, setMissingOpen] = useState(false);

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
          onClick={() => clearFilters()}
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

      <div class="filter-global-search-wrap">
        <input
          class="filter-global-search"
          type="text"
          placeholder="Sport, event, host, year, name…"
          value={filters.query}
          onInput={(e) =>
            setFilters({
              ...filters,
              query: (e.target as HTMLInputElement).value,
            })
          }
        />
        {filters.query && (
          <button
            class="filter-global-search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => setFilters({ ...filters, query: "" })}
          >
            ✕
          </button>
        )}
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
          <div class="filter-chips">
            {options.sports.map((s) => (
              <button
                key={s}
                type="button"
                class={`filter-chip${filters.sports.includes(s) ? " active" : ""}`}
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
          <div class="filter-list">
            {options.countries.map((c) => (
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
          <div class="filter-year-range">
            <select
              class="filter-year-select"
              value={filters.yearFrom ?? ""}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                setFilters({ ...filters, yearFrom: val ? Number(val) : null });
              }}
            >
              <option value="">From</option>
              {options.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span class="filter-year-dash">–</span>
            <select
              class="filter-year-select"
              value={filters.yearTo ?? ""}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                setFilters({ ...filters, yearTo: val ? Number(val) : null });
              }}
            >
              <option value="">To</option>
              {options.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </FilterSection>
      </div>
      <div class="filter-panel-footer">
        <button
          class="filter-info-btn"
          type="button"
          onClick={() => setMissingOpen(true)}
        >
          Missing Data
        </button>
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
      {missingOpen && (
        <MissingDataModal onClose={() => setMissingOpen(false)} />
      )}
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
