import { useState } from "preact/hooks";
import { allAthletes, getSport } from "../data";
import type { Athlete } from "../types";

interface Props {
  onClose: () => void;
}

function groupByCountry(athletes: Athlete[]): [string, Athlete[]][] {
  const map = new Map<string, Athlete[]>();
  for (const athlete of athletes) {
    const country = athlete.medals[0]?.country ?? "Unknown";
    let group = map.get(country);
    if (!group) {
      group = [];
      map.set(country, group);
    }
    group.push(athlete);
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b));
}

function matchesSearch(athlete: Athlete, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const country = athlete.medals[0]?.country ?? "";
  const sports = athlete.medals.map((m) => m.sport).join(" ");
  const text = `${athlete.name} ${country} ${sports}`.toLowerCase();
  return tokens.every((token) => text.includes(token));
}

const missing = allAthletes.filter((a) => a.birthCoords === null);

function AthleteCard({ athlete }: { athlete: Athlete }) {
  const sport = getSport(athlete);
  const wdUrl = athlete.wikidataId
    ? `https://www.wikidata.org/wiki/${athlete.wikidataId}`
    : null;

  if (wdUrl) {
    return (
      <a
        class="missing-card"
        href={wdUrl}
        target="_blank"
        rel="noreferrer"
        title={`Edit ${athlete.name} on Wikidata`}
      >
        <span class="missing-card-name">{athlete.name}</span>
        <span class="missing-card-sport">{sport}</span>
      </a>
    );
  }

  return (
    <div class="missing-card missing-card--no-wd" title="Not found on Wikidata">
      <span class="missing-card-name">{athlete.name}</span>
      <span class="missing-card-sport">{sport}</span>
      <span class="missing-card-no-wd">Not on Wikidata</span>
    </div>
  );
}

export function MissingDataModal({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered =
    tokens.length > 0
      ? missing.filter((a) => matchesSearch(a, tokens))
      : missing;
  const byCountry = groupByCountry(filtered);

  return (
    <div
      class="modal-backdrop"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2 class="modal-title">Missing Data</h2>
          <button
            class="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <section class="modal-section">
            <p>
              {missing.length} athlete{missing.length !== 1 ? "s are" : " is"}{" "}
              missing birth location data and won't appear on the map. Click to
              open Wikidata and add{" "}
              <a
                href="https://www.wikidata.org/wiki/Property:P19"
                target="_blank"
                rel="noreferrer"
              >
                place of birth (P19)
              </a>
              .
            </p>
          </section>

          <section class="modal-section">
            <input
              class="filter-search"
              type="search"
              placeholder="Search by name, country, or sport…"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              aria-label="Search missing athletes"
            />
          </section>

          {byCountry.map(([country, athletes]) => (
            <section class="modal-section" key={country}>
              <h3>
                {country} · {athletes.length}
              </h3>
              <div class="missing-cards">
                {athletes.map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))}
              </div>
            </section>
          ))}

          {tokens.length > 0 && filtered.length === 0 && (
            <section class="modal-section">
              <p class="missing-no-results">No athletes match your search.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
