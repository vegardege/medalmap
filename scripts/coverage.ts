import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Athlete } from "../src/types.ts";

// Per-sport stats. Medal counts are per Medal record (not per athlete) so that
// shared medals (2 silvers, 0 bronze) show up as unequal numbers.
// Coord counts are per unique athlete within that sport.
interface SportStats {
  gold: number;
  silver: number;
  bronze: number;
  athleteIds: Set<string>;
  withCoords: number;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yearArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;

  if (!existsSync("data/data.json")) {
    throw new Error(
      "data/data.json not found — run npm run pipeline:merge first",
    );
  }

  const all = JSON.parse(readFileSync("data/data.json", "utf-8")) as Athlete[];

  // Filter to the requested year. Keep only medals for that year; drop athletes
  // with no remaining medals. Birth data is athlete-level so it's kept as-is.
  const athletes = yearArg
    ? all
        .map((a) => ({
          ...a,
          medals: a.medals.filter((m) => m.year === yearArg),
        }))
        .filter((a) => a.medals.length > 0)
    : all;

  const bySport = new Map<string, SportStats>();
  for (const athlete of athletes) {
    for (const medal of athlete.medals) {
      let s = bySport.get(medal.sport);
      if (!s) {
        s = {
          gold: 0,
          silver: 0,
          bronze: 0,
          athleteIds: new Set(),
          withCoords: 0,
        };
        bySport.set(medal.sport, s);
      }
      s[medal.medal]++;
      if (!s.athleteIds.has(athlete.id)) {
        s.athleteIds.add(athlete.id);
        if (athlete.birthCoords !== null) s.withCoords++;
      }
    }
  }

  const totalAthletes = athletes.length;
  const withCoords = athletes.filter((a) => a.birthCoords !== null).length;
  const pct =
    totalAthletes > 0 ? Math.round((withCoords / totalAthletes) * 100) : 0;
  const yearLabel = yearArg ? String(yearArg) : "all years";

  console.log(`Coverage for ${yearLabel} — ${bySport.size} sports`);
  console.log();

  const sports = [...bySport.keys()].sort();
  const nameWidth = Math.max(...sports.map((s) => s.length), "Sport".length);

  console.log(`${"Sport".padEnd(nameWidth)}  Gold  Silver  Bronze    Coords`);
  for (const sport of sports) {
    const s = bySport.get(sport)!;
    const total = s.athleteIds.size;
    const coords = `${s.withCoords}/${total}`;
    const flag = s.withCoords === 0 ? "  ← all missing" : "";
    console.log(
      `${sport.padEnd(nameWidth)}  ${String(s.gold).padStart(4)}  ${String(s.silver).padStart(6)}  ${String(s.bronze).padStart(6)}  ${coords.padStart(8)}${flag}`,
    );
  }

  console.log();
  console.log(`${withCoords}/${totalAthletes} athletes with coordinates (${pct}%)`);

  // Unique place names that exist but lack coordinates — a Wikidata entity problem,
  // not athlete-specific. Listed simply; expected to be rare.
  const missingCoordPlaces = [
    ...new Set(
      athletes
        .filter((a) => a.birthPlace !== null && a.birthCoords === null)
        .map((a) => a.birthPlace as string),
    ),
  ].sort();

  if (missingCoordPlaces.length > 0) {
    console.log();
    console.log(
      `Locations without coordinates (${missingCoordPlaces.length}):`,
    );
    for (const place of missingCoordPlaces) {
      console.log(`  ${place}`);
    }
  }
}
