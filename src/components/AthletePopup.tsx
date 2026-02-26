import { useRef, useState } from "preact/hooks";
import { getSport } from "../data";
import type { Athlete, Location } from "../types";

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;
const MEDAL_ORDER = { gold: 0, silver: 1, bronze: 2 } as const;
const CATEGORY_LABEL = { men: "Men", women: "Women", mixed: "Mixed" } as const;

function sortedMedals(medals: Athlete["medals"]) {
  return [...medals].sort(
    (a, b) => MEDAL_ORDER[a.medal] - MEDAL_ORDER[b.medal],
  );
}

function countMedal(athlete: Athlete, type: "gold" | "silver" | "bronze") {
  return athlete.medals.filter((m) => m.medal === type).length;
}

function sortAthletes(athletes: Athlete[]) {
  return [...athletes].sort(
    (a, b) =>
      countMedal(b, "gold") - countMedal(a, "gold") ||
      countMedal(b, "silver") - countMedal(a, "silver") ||
      countMedal(b, "bronze") - countMedal(a, "bronze"),
  );
}

function WikipediaIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" />
      <ellipse cx="10" cy="10" rx="4" ry="8.5" />
      <line x1="1.5" y1="10" x2="18.5" y2="10" />
      <line x1="3" y1="5.5" x2="17" y2="5.5" />
      <line x1="3" y1="14.5" x2="17" y2="14.5" />
    </svg>
  );
}

function WikidataIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="1.5" y="4" width="2.5" height="12" />
      <rect x="5.5" y="4" width="1.5" height="12" />
      <rect x="8.5" y="4" width="2.5" height="12" />
      <rect x="12.5" y="4" width="1.5" height="12" />
      <rect x="15.5" y="4" width="3" height="12" />
    </svg>
  );
}

function AthleteRow({
  athlete,
  onSelect,
}: {
  athlete: Athlete;
  onSelect: () => void;
}) {
  const medals = sortedMedals(athlete.medals);
  return (
    <div class="popup-athlete" onClick={onSelect}>
      <div class="popup-name">{athlete.name}</div>
      <div class="popup-sport">{getSport(athlete)}</div>
      <div class="popup-medal-strip">
        {medals.map((medal) => (
          <span key={`${medal.year}-${medal.event}`}>
            {MEDAL_EMOJI[medal.medal]}
          </span>
        ))}
      </div>
    </div>
  );
}

function AthleteDetail({
  athlete,
  placeName,
  onBack,
}: {
  athlete: Athlete;
  placeName: string;
  onBack: () => void;
}) {
  const medals = sortedMedals(athlete.medals);
  const wikiUrl = `https://en.wikipedia.org/wiki/${athlete.id}`;
  const wikidataUrl = athlete.wikidataId
    ? `https://www.wikidata.org/wiki/${athlete.wikidataId}`
    : null;

  return (
    <div class="athlete-popup">
      <button type="button" class="popup-place popup-back" onClick={onBack}>
        <span class="popup-back-arrow">‹</span> {placeName}
      </button>
      <div class="popup-detail-body">
        <div class="popup-name">{athlete.name}</div>
        <div class="popup-sport">{getSport(athlete)}</div>
        <div class="popup-medals">
          {medals.map((medal) => (
            <div class="popup-medal" key={`${medal.year}-${medal.event}`}>
              {MEDAL_EMOJI[medal.medal]} {medal.event} ·{" "}
              {CATEGORY_LABEL[medal.category]}
            </div>
          ))}
        </div>
        <div class="popup-links">
          <a
            class="popup-wiki"
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WikipediaIcon /> Wikipedia
          </a>
          {wikidataUrl && (
            <a
              class="popup-wiki"
              href={wikidataUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WikidataIcon /> Wikidata
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 3;

export function AthletePopup({
  location,
  placeName: placeNameProp,
}: {
  location: Location;
  placeName?: string;
}) {
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const placeName =
    placeNameProp ?? location.athletes[0]?.birthPlace ?? "Unknown location";
  const athletes = sortAthletes(location.athletes);
  const pageCount = Math.ceil(athletes.length / PAGE_SIZE);
  const pageAthletes = athletes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -40) setPage((p) => Math.min(p + 1, pageCount - 1));
    if (delta > 40) setPage((p) => Math.max(p - 1, 0));
  }

  if (selected) {
    return (
      <AthleteDetail
        athlete={selected}
        placeName={placeName}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div class="athlete-popup">
      <div class="popup-place">{placeName}</div>
      <div
        class="popup-athletes"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {pageAthletes.map((athlete) => (
          <AthleteRow
            key={athlete.id}
            athlete={athlete}
            onSelect={() => setSelected(athlete)}
          />
        ))}
      </div>
      {pageCount > 1 && (
        <div class="popup-pagination">
          <button
            type="button"
            class="popup-pagination-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            ‹
          </button>
          <span class="popup-pagination-label">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            class="popup-pagination-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === pageCount - 1}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
