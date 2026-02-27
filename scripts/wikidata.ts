import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { WikipediaEntry } from "./wikipedia.ts";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const USER_AGENT = "medalmap/1.0 (https://github.com/vegardege/medalmap)";

// One entry per unique athlete ID from wikipedia.json.
// Fields are null when Wikidata has no data for that athlete.
// Add more optional fields here as the pipeline grows.
export interface WikidataEntry {
  id: string; // Wikipedia page title — matches `id` in wikipedia.json
  wikidataId: string | null; // Wikidata Q code, e.g. "Q12345"
  birthPlace: string | null; // Human-readable name of birth place
  birthCoords: [number, number] | null; // [longitude, latitude]
}

interface SparqlBinding {
  article: { value: string };
  item?: { value: string };
  birthPlaceLabel?: { value: string };
  lat?: { value: string };
  lon?: { value: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert a Wikipedia page title to a canonical article URL for use in SPARQL.
// Wikidata's encoding is inconsistent and must be matched exactly:
//   - Non-ASCII characters (ü, ø, é …) → percent-encoded UTF-8 (%C3%BC etc.)
//   - Apostrophe (')                    → %27  (encodeURIComponent leaves it literal)
//   - Parentheses () and comma (,)      → literal  (encodeURIComponent encodes comma)
// Strategy: encodeURIComponent handles non-ASCII, then fix up the exceptions.
function toArticleUrl(id: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(id)
    .replace(/'/g, "%27")
    .replace(/%2C/g, ",")}`;
}

async function queryBatch(ids: string[]): Promise<WikidataEntry[]> {
  const values = ids.map((id) => `<${toArticleUrl(id)}>`).join(" ");

  // schema:about links each Wikipedia article to its Wikidata item.
  // wdt:P19 = place of birth; wdt:P625 = coordinate location.
  // The label service fills ?birthPlaceLabel from ?birthPlace automatically.
  // geof:latitude / geof:longitude extract from the WKT GeoPoint literal.
  const sparql = `
  SELECT ?article ?item ?birthPlaceLabel ?lat ?lon WHERE {
    VALUES ?article { ${values} }
    ?article schema:about ?item .
    OPTIONAL {
      ?item wdt:P19 ?birthPlace .
      OPTIONAL {
        ?birthPlace wdt:P625 ?coords .
        BIND(geof:latitude(?coords) AS ?lat)
        BIND(geof:longitude(?coords) AS ?lon)
      }
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
  }
  `.trim();

  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", sparql);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
    },
  });

  if (!response.ok) {
    throw new Error(`SPARQL HTTP ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as {
    results: { bindings: SparqlBinding[] };
  };

  // Build id → entry map. Keep the first result when multiple rows are returned
  // for the same article (can happen if Wikidata has multiple P19 statements).
  const byId = new Map<string, WikidataEntry>();

  for (const binding of json.results.bindings) {
    const articleVal = binding.article.value;
    const id = decodeURIComponent(
      articleVal.replace("https://en.wikipedia.org/wiki/", ""),
    );

    if (byId.has(id)) continue;

    const lat = binding.lat?.value;
    const lon = binding.lon?.value;
    const itemIri = binding.item?.value ?? null;
    const wikidataId = itemIri
      ? (itemIri.match(/\/([QP]\d+)$/)?.[1] ?? null)
      : null;
    byId.set(id, {
      id,
      wikidataId,
      birthPlace: binding.birthPlaceLabel?.value ?? null,
      birthCoords:
        lat !== undefined && lon !== undefined
          ? [parseFloat(lon), parseFloat(lat)]
          : null,
    });
  }

  // Always emit an entry for every requested ID so callers can detect gaps.
  return ids.map(
    (id) =>
      byId.get(id) ?? {
        id,
        wikidataId: null,
        birthPlace: null,
        birthCoords: null,
      },
  );
}

// An athlete has full data when all three fields are populated.
// Only these are skipped in incremental mode; everything else is re-fetched.
function hasFullData(entry: WikidataEntry): boolean {
  return (
    entry.wikidataId !== null &&
    entry.birthPlace !== null &&
    entry.birthCoords !== null
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const yearArg = args.find((a) => /^\d{4}$/.test(a));

  // Determine which wikipedia file(s) to read for athlete IDs.
  const wikipediaPaths = yearArg
    ? [`data/wikipedia/${yearArg}.json`]
    : readdirSync("data/wikipedia")
        .filter((f) => f.endsWith(".json"))
        .map((f) => `data/wikipedia/${f}`);

  if (wikipediaPaths.length === 0) {
    throw new Error(
      "No data/wikipedia/*.json files found — run pipeline:wikipedia first",
    );
  }

  // Collect unique athlete IDs from the selected year(s).
  const scopeIds = new Set<string>();
  for (const path of wikipediaPaths) {
    const entries = JSON.parse(readFileSync(path, "utf-8")) as WikipediaEntry[];
    for (const e of entries) scopeIds.add(e.id);
  }

  // Load all existing wikidata entries (all years) to preserve them on write.
  const existing = new Map<string, WikidataEntry>();
  if (!force && existsSync("data/wikidata.json")) {
    const prev = JSON.parse(
      readFileSync("data/wikidata.json", "utf-8"),
    ) as WikidataEntry[];
    for (const e of prev) existing.set(e.id, e);
  }

  // Only fetch IDs in scope that lack full data.
  const toFetch = [...scopeIds].filter((id) => {
    const e = existing.get(id);
    return !e || !hasFullData(e);
  });

  const scope = yearArg ? `year ${yearArg}` : "all years";
  console.log(
    `wikidata: ${scopeIds.size} athletes in scope (${scope}), ${toFetch.length} to fetch`,
  );

  const batches: string[][] = [];
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    batches.push(toFetch.slice(i, i + BATCH_SIZE));
  }

  const fetched: WikidataEntry[] = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    console.log(
      `  Batch ${i + 1}/${batches.length} (${batch.length} athletes)…`,
    );
    fetched.push(...(await queryBatch(batch)));
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  // Merge fetched results into the existing map (other years untouched).
  for (const e of fetched) existing.set(e.id, e);

  const all = [...existing.values()];
  const withCoords = all.filter((r) => r.birthCoords !== null).length;
  const withPlace = all.filter((r) => r.birthPlace !== null).length;
  console.log(
    `wikidata: ${withCoords}/${all.length} have coordinates, ${withPlace}/${all.length} have birth place name`,
  );

  writeFileSync("data/wikidata.json", JSON.stringify(all, null, 2));
  console.log("Written to data/wikidata.json");
}
