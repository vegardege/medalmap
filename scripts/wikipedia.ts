import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { HTMLElement } from "node-html-parser";
import { NodeType, parse } from "node-html-parser";

const MEDAL_TYPES = ["gold", "silver", "bronze"] as const;

const STOP_HEADINGS = new Set([
  "Medal leaders",
  "Multiple medallists",
  "Statistics",
  "See also",
  "References",
  "External links",
  "Notes",
]);

export interface WikipediaEntry {
  id: string; // Wikipedia page title
  name: string;
  year: number;
  sport: string;
  event: string;
  country: string;
  medal: "gold" | "silver" | "bronze";
}

// Country links point to "Country at the Year Olympics" pages
function isCountryLink(link: HTMLElement): boolean {
  const title = link.getAttribute("title") ?? "";
  return title.includes(" at the ") && title.endsWith("Olympics");
}

function athleteId(link: HTMLElement): string {
  const href = link.getAttribute("href") ?? "";
  return decodeURIComponent(href.replace("/wiki/", ""));
}

// Parse one medal cell (gold / silver / bronze), returning one WikipediaEntry
// per athlete. All context needed for the final entry is passed in.
//
// Adds athlete name, Wikipedia page title, and country they competed for.
//
// Two formats exist depending on whether it's a team or individual event:
//   Individual: [athlete] [country] [athlete] [country] ...  (athlete before country)
//   Team:       [country] [athlete] [athlete] [country] ...  (country before athletes)
//
// Both formats can appear in the same cell when multiple countries share a medal.
// We detect the format by checking whether the first link is a country or athlete.
function parseMedalCell(
  cell: HTMLElement,
  year: number,
  sport: string,
  event: string,
  medal: "gold" | "silver" | "bronze",
): WikipediaEntry[] {
  if (cell.classList.contains("table-na")) return [];

  const links = cell.querySelectorAll("a");
  if (links.length === 0) return [];

  type Item =
    | { kind: "country"; name: string }
    | { kind: "athlete"; id: string; name: string };

  const items: Item[] = links.map((link) => {
    if (isCountryLink(link)) {
      return { kind: "country", name: link.text.trim() };
    }
    return { kind: "athlete", id: athleteId(link), name: link.text.trim() };
  });

  const results: WikipediaEntry[] = [];

  if (items[0]?.kind === "country") {
    // Team (country-first): country then its athletes, repeated per country
    let country = "";
    for (const item of items) {
      if (item.kind === "country") {
        country = item.name;
      } else {
        results.push({
          id: item.id,
          name: item.name,
          year,
          sport,
          event,
          country,
          medal,
        });
      }
    }
  } else {
    // Individual (athlete-first): strict [athlete, country] pairs
    for (let i = 0; i < items.length; i += 2) {
      const athlete = items[i];
      const country = items[i + 1];
      if (athlete?.kind !== "athlete" || country?.kind !== "country") {
        throw new Error(`Unexpected format: ${JSON.stringify(items)}`);
      }
      results.push({
        id: athlete.id,
        name: athlete.name,
        year,
        sport,
        event,
        country: country.name,
        medal,
      });
    }
  }
  return results;
}

// Event name precedes the <br> in the event cell. It is either a bare text
// node (most sports) or wrapped in a <span class="nowrap"> (e.g. cross-country).
function parseEventName(cell: HTMLElement): string {
  for (const node of cell.childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.trim();
      if (text) return text;
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.rawTagName === "br") break;
      return el.text.trim();
    }
  }
  throw new Error(`Could not extract event name from cell: ${cell.text}`);
}

// Parse all entries in a medal table.
//
// Adds event name.
//
// Tables have columns for event, gold, silver, bronse, and one row per event.
function parseTable(
  table: HTMLElement,
  sport: string,
  year: number,
): WikipediaEntry[] {
  const results: WikipediaEntry[] = [];
  for (const row of table.querySelectorAll("tbody tr")) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 4) continue; // header rows only have <th>

    const event = parseEventName(cells[0]!);

    for (let i = 0; i < 3; i++) {
      results.push(
        ...parseMedalCell(cells[i + 1]!, year, sport, event, MEDAL_TYPES[i]!),
      );
    }
  }
  return results;
}

// Parse all entries for a single Olympics.
//
// Adds sport name.
export function parseWikipediaPage(
  html: string,
  year: number,
): WikipediaEntry[] {
  const root = parse(html);
  const content =
    root.querySelector("#mw-content-text .mw-parser-output") ??
    root.querySelector(".mw-parser-output");
  if (!content) throw new Error("Could not find article content");

  const results: WikipediaEntry[] = [];
  let currentSport = "";

  for (const node of content.childNodes) {
    if (node.nodeType !== NodeType.ELEMENT_NODE) continue;
    const el = node as HTMLElement;

    if (el.classList.contains("mw-heading2")) {
      const h2 = el.querySelector("h2");
      if (!h2) continue;
      const heading = h2.text.trim();
      if (STOP_HEADINGS.has(heading)) break;
      currentSport = heading;
    } else if (
      el.classList.contains("wikitable") &&
      el.classList.contains("plainrowheaders") &&
      currentSport
    ) {
      results.push(...parseTable(el, currentSport, year));
    }
  }
  return results;
}

// Run as CLI when executed directly; skip when imported (e.g. by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const year = parseInt(process.argv[2] ?? "2026", 10);
  const url = `https://en.wikipedia.org/wiki/List_of_${year}_Winter_Olympics_medal_winners`;

  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const html = await response.text();

  const entries = parseWikipediaPage(html, year);
  console.log(`Found ${entries.length} entries`);

  writeFileSync("data/wikipedia.json", JSON.stringify(entries, null, 2));
  console.log("Written to data/wikipedia.json");
}
