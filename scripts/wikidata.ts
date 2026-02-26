import { readFileSync, writeFileSync } from "node:fs";
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const wikipedia = JSON.parse(
    readFileSync("data/wikipedia.json", "utf-8"),
  ) as WikipediaEntry[];

  // One SPARQL round-trip per unique athlete, not per medal entry.
  const allIds = [...new Set(wikipedia.map((entry) => entry.id))];
  console.log(`wikidata: ${allIds.length} unique athletes to look up`);

  const batches: string[][] = [];
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    batches.push(allIds.slice(i, i + BATCH_SIZE));
  }

  const results: WikidataEntry[] = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    console.log(
      `  Batch ${i + 1}/${batches.length} (${batch.length} athletes)…`,
    );
    results.push(...(await queryBatch(batch)));
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  const withCoords = results.filter((r) => r.birthCoords !== null).length;
  const withPlace = results.filter((r) => r.birthPlace !== null).length;
  console.log(
    `wikidata: ${withCoords}/${results.length} have coordinates, ${withPlace}/${results.length} have birth place name`,
  );

  writeFileSync("data/wikidata.json", JSON.stringify(results, null, 2));
  console.log("Written to data/wikidata.json");
}
