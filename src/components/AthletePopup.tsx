import type { Athlete, Location } from "../types";

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;
const MEDAL_ORDER = { gold: 0, silver: 1, bronze: 2 } as const;
const CATEGORY_LABEL = { men: "Men", women: "Women", mixed: "Mixed" } as const;

function sortedMedals(medals: Athlete["medals"]) {
  return [...medals].sort((a, b) => MEDAL_ORDER[a.medal] - MEDAL_ORDER[b.medal]);
}

function AthleteEntry({ athlete }: { athlete: Athlete }) {
  const medals = sortedMedals(athlete.medals);
  const sports = new Set(medals.map((m) => m.sport));
  const singleSport = sports.size === 1;
  const sport = singleSport ? [...sports][0] : null;

  return (
    <div class="popup-athlete">
      <div class="popup-name">{athlete.name}</div>
      {sport && <div class="popup-sport">{sport}</div>}
      {medals.map((medal) => (
        <div class="popup-medal" key={`${medal.year}-${medal.event}`}>
          {MEDAL_EMOJI[medal.medal]} {medal.event}
          {!singleSport && <> · {medal.sport}</>} · {CATEGORY_LABEL[medal.category]}
        </div>
      ))}
    </div>
  );
}

export function AthletePopup({ location }: { location: Location }) {
  const placeName = location.athletes[0]?.birthPlace ?? "Unknown location";
  return (
    <div class="athlete-popup">
      <div class="popup-place">{placeName}</div>
      <div class="popup-athletes">
        {location.athletes.map((athlete) => (
          <AthleteEntry key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  );
}
