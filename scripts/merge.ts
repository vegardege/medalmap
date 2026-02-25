import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Athlete, Medal } from "../src/types.ts";
import type { WikidataEntry } from "./wikidata.ts";
import type { WikipediaEntry } from "./wikipedia.ts";

const OVERRIDES_PATH = "data/overrides.json";

// Partial override for an athlete. Include only the fields you want to change.
// Keys starting with _ (e.g. _note) are for human context and are ignored.
// Add new optional fields here as the pipeline grows (e.g. gender, dateOfBirth).
interface AthleteOverride {
  id: string;
  name?: string;
  birthPlace?: string | null;
  birthCoords?: [number, number] | null;
}

function loadOverrides(): AthleteOverride[] {
  if (!existsSync(OVERRIDES_PATH)) {
    writeFileSync(OVERRIDES_PATH, "[]\n");
    console.log(`merge: created empty ${OVERRIDES_PATH}`);
    return [];
  }
  const content = readFileSync(OVERRIDES_PATH, "utf-8").trim();
  if (!content) {
    writeFileSync(OVERRIDES_PATH, "[]\n");
    return [];
  }
  return JSON.parse(content) as AthleteOverride[];
}

function requireJson<T>(path: string, hint: string): T {
  if (!existsSync(path)) {
    throw new Error(`${path} not found — run ${hint} first`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const wikipedia = requireJson<WikipediaEntry[]>(
    "data/wikipedia.json",
    "npm run pipeline:wikipedia",
  );
  const wikidata = requireJson<WikidataEntry[]>(
    "data/wikidata.json",
    "npm run pipeline:wikidata",
  );
  const overrides = loadOverrides();

  const wikidataById = new Map(wikidata.map((e) => [e.id, e]));
  const overridesById = new Map(overrides.map((o) => [o.id, o]));

  // Group wikipedia entries by athlete id, preserving first-appearance order.
  const entriesById = new Map<string, WikipediaEntry[]>();
  for (const entry of wikipedia) {
    let group = entriesById.get(entry.id);
    if (!group) {
      group = [];
      entriesById.set(entry.id, group);
    }
    group.push(entry);
  }

  // Warn about override ids not present in wikipedia — likely a typo.
  for (const { id } of overrides) {
    if (!entriesById.has(id)) {
      console.warn(`merge: override id "${id}" not found in wikipedia.json`);
    }
  }

  const athletes: Athlete[] = [];

  for (const [id, entries] of entriesById) {
    const wd = wikidataById.get(id);
    const ov = overridesById.get(id);

    const medals: Medal[] = entries.map((e) => ({
      year: e.year,
      sport: e.sport,
      event: e.event,
      category: e.category,
      medal: e.medal,
      country: e.country,
    }));

    // Priority: override > wikipedia > wikidata
    athletes.push({
      id,
      name: ov?.name ?? entries[0]!.name,
      birthPlace: ov?.birthPlace ?? wd?.birthPlace ?? null,
      birthCoords: ov?.birthCoords ?? wd?.birthCoords ?? null,
      medals,
    });
  }

  const withCoords = athletes.filter((a) => a.birthCoords !== null).length;
  console.log(
    `merge: ${athletes.length} athletes, ${withCoords} with coordinates`,
  );

  writeFileSync("data/data.json", JSON.stringify(athletes, null, 2));
  console.log("Written to data/data.json");
}
