import type { Location } from "../types";

const MEDAL_EMOJI = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;
const CATEGORY_LABEL = { men: "Men", women: "Women", mixed: "Mixed" } as const;

export function AthletePopup({ location }: { location: Location }) {
  const placeName = location.athletes[0]?.birthPlace ?? "Unknown location";
  return (
    <div class="athlete-popup">
      <div class="popup-place">{placeName}</div>
      <div class="popup-athletes">
        {location.athletes.map((athlete) => (
          <div class="popup-athlete" key={athlete.id}>
            <div class="popup-name">{athlete.name}</div>
            {athlete.medals.map((medal) => (
              <div class="popup-medal" key={`${medal.year}-${medal.event}`}>
                {MEDAL_EMOJI[medal.medal]} {medal.event} · {medal.sport} ·{" "}
                {CATEGORY_LABEL[medal.category]} · {medal.year}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
