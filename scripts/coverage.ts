import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WINTER_OLYMPICS_BY_YEAR } from "../src/olympics.ts";
import type { Athlete } from "../src/types.ts";

// Medal and coord counts for a single row (sport or year).
// Medal counts are per Medal record (not per athlete) so that shared medals
// (2 silvers, 0 bronze) show up as unequal numbers.
// Coord counts are per unique athlete.
interface RowStats {
  gold: number;
  silver: number;
  bronze: number;
  athleteIds: Set<string>;
  withCoords: number;
}

function newRow(): RowStats {
  return {
    gold: 0,
    silver: 0,
    bronze: 0,
    athleteIds: new Set(),
    withCoords: 0,
  };
}

function addMedal(
  row: RowStats,
  athlete: Athlete,
  medal: Athlete["medals"][number],
): void {
  row[medal.medal]++;
  if (!row.athleteIds.has(athlete.id)) {
    row.athleteIds.add(athlete.id);
    if (athlete.birthCoords !== null) row.withCoords++;
  }
}

function printTable(header: string, rows: [string, RowStats][]): void {
  const nameWidth = Math.max(
    ...rows.map(([name]) => name.length),
    header.length,
  );
  console.log(`${header.padEnd(nameWidth)}  Gold  Silver  Bronze    Coords`);
  for (const [name, s] of rows) {
    const total = s.athleteIds.size;
    const coords = `${s.withCoords}/${total}`;
    const flag = s.withCoords === 0 ? "  ← all missing" : "";
    console.log(
      `${name.padEnd(nameWidth)}  ${String(s.gold).padStart(4)}  ${String(s.silver).padStart(6)}  ${String(s.bronze).padStart(6)}  ${coords.padStart(8)}${flag}`,
    );
  }
}

function printMissingPlaces(athletes: Athlete[]): void {
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yearArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;

  if (!existsSync("data/data.json")) {
    throw new Error(
      "data/data.json not found — run npm run pipeline:merge first",
    );
  }

  const all = JSON.parse(readFileSync("data/data.json", "utf-8")) as Athlete[];

  if (yearArg) {
    // Per-sport detail for one year (existing behaviour).
    const athletes = all
      .map((a) => ({
        ...a,
        medals: a.medals.filter((m) => m.year === yearArg),
      }))
      .filter((a) => a.medals.length > 0);

    const bySport = new Map<string, RowStats>();
    for (const athlete of athletes) {
      for (const medal of athlete.medals) {
        let s = bySport.get(medal.sport);
        if (!s) {
          s = newRow();
          bySport.set(medal.sport, s);
        }
        addMedal(s, athlete, medal);
      }
    }

    const totalAthletes = athletes.length;
    const withCoords = athletes.filter((a) => a.birthCoords !== null).length;
    const pct =
      totalAthletes > 0 ? Math.round((withCoords / totalAthletes) * 100) : 0;
    const edition = WINTER_OLYMPICS_BY_YEAR.get(yearArg);
    const title = edition ? `${yearArg} ${edition.city}` : String(yearArg);

    console.log(`Coverage for ${title} — ${bySport.size} sports`);
    console.log();

    const rows: [string, RowStats][] = [...bySport.keys()]
      .sort()
      .map((s) => [s, bySport.get(s)!]);
    printTable("Sport", rows);
    console.log();
    console.log(
      `${withCoords}/${totalAthletes} athletes with coordinates (${pct}%)`,
    );
    printMissingPlaces(athletes);
  } else {
    // Per-year summary across all games.
    const byYear = new Map<number, RowStats>();
    for (const athlete of all) {
      for (const medal of athlete.medals) {
        let y = byYear.get(medal.year);
        if (!y) {
          y = newRow();
          byYear.set(medal.year, y);
        }
        addMedal(y, athlete, medal);
      }
    }

    const years = [...byYear.keys()].sort((a, b) => a - b);
    const rows: [string, RowStats][] = years.map((year) => {
      const edition = WINTER_OLYMPICS_BY_YEAR.get(year);
      const label = edition ? `${year} ${edition.city}` : String(year);
      return [label, byYear.get(year)!];
    });

    const totalAthletes = all.length;
    const withCoords = all.filter((a) => a.birthCoords !== null).length;
    const pct =
      totalAthletes > 0 ? Math.round((withCoords / totalAthletes) * 100) : 0;

    console.log(`Coverage for all years — ${years.length} editions`);
    console.log();
    printTable("Year", rows);
    console.log();
    console.log(
      `${withCoords}/${totalAthletes} athletes with coordinates (${pct}%)`,
    );
    printMissingPlaces(all);
  }
}
