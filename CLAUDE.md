# medalmap

Interactive static web app showing where Winter Olympic medalists were born, visualized on a world map.

## Project Overview

- **Data sources**: Wikipedia (HTML scraping) + Wikidata (SPARQL)
- **Initial scope**: 2026 Milano Winter Olympics (schema is year-agnostic from day one)
- **Expandable to**: All Winter Olympics, eventually Summer Olympics
- **Deployment**: Static export, served behind an existing Caddy reverse proxy

## Tech Stack

- **Package manager**: npm
- **Frontend**: Preact 10 + TypeScript + Vite (`@preact/preset-vite`) — mirrors `diatonic` / `howmuchenergy`
- **Map**: MapLibre GL JS
- **Tiles**: OpenFreeMap (free, no account required, MapLibre-compatible)
- **Linting / formatting**: Biome 2.x
- **Testing**: Vitest 4.x
- **Pipeline scripts**: TypeScript via `tsx` (same pattern as `bookbear`)

## Directory Structure

```
medalmap/
├── scripts/                    # Data pipeline — run manually, not part of build
│   ├── wikipedia.ts            # Fetch medal tables from Wikipedia
│   ├── wikidata.ts             # SPARQL queries for athlete metadata + coordinates
│   ├── coverage.ts             # Print missing data / conflicts (no side effects)
│   ├── merge.ts                # Combine all sources → data/data.json
│   └── overrides.json          # Manual corrections and gap-filling
├── data/
│   └── data.json               # Generated merged output — committed to repo
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts                # Shared TypeScript interfaces (Athlete, Medal, Data)
│   ├── data.ts                 # Import + access helpers for data.json
│   ├── components/
│   │   ├── Map.tsx             # MapLibre map + marker layer
│   │   ├── Filters.tsx         # Sport / country / year / medal type filters
│   │   └── AthletePopup.tsx    # Popup on marker click
│   └── styles/
│       └── main.css
├── public/
├── biome.json
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Data Schema

`data/data.json` contains two normalized collections to avoid repeating athlete info across multiple medals:

```ts
interface Athlete {
  id: string;                           // stable slug, e.g. "sofia-goggia"
  name: string;
  birthPlace: string | null;            // human-readable city/country
  birthCoords: [number, number] | null; // [longitude, latitude]
}

interface Medal {
  id: string;                           // e.g. "sofia-goggia-2026-downhill-gold"
  athleteId: string;                    // ref to Athlete.id
  country: string;                      // IOC 3-letter code at time of competition
  sport: string;                        // e.g. "Alpine Skiing"
  discipline: string;                   // e.g. "Downhill"
  event: string;                        // e.g. "Women's Downhill"
  medal: "gold" | "silver" | "bronze";
  year: number;
  olympics: string;                     // e.g. "2026-winter"
}

interface Data {
  athletes: Athlete[];
  medals: Medal[];
}
```

`country` is on `Medal`, not `Athlete` — athletes can represent different nations over their career, and relay/team events are attributed to a team country regardless of individual birthplace.

## Data Pipeline

Scripts are run manually to regenerate `data/data.json`. They are **not** part of `npm run build`.

```bash
npm run pipeline:wikipedia  # → scripts/wikipedia.ts
npm run pipeline:wikidata   # → scripts/wikidata.ts
npm run pipeline:coverage   # → scripts/coverage.ts  (stdout only, no writes)
npm run pipeline:merge      # → scripts/merge.ts  → writes data/data.json
```

**Merge priority** (highest to lowest): `overrides.json` > Wikipedia > Wikidata

### overrides.json

Manually maintained. Each entry is a partial `Athlete` or `Medal` by `id` — only specified fields are overwritten. Use `_note` for human context:

```json
[
  {
    "type": "athlete",
    "id": "sofia-goggia",
    "birthCoords": [9.6773, 45.6983],
    "_note": "Bergamo — verified manually"
  }
]
```

### diff-report output

Should clearly list:
- Athletes with no `birthCoords` after merging all sources
- Athletes present in Wikipedia but missing from Wikidata (and vice versa)
- Conflicting values (e.g. different birth cities between sources)

## Map & Tiles

**Default**: [OpenFreeMap](https://openfreemap.org/) — no account, no API key, no rate limits stated, MapLibre-compatible vector tiles.
- Suggested style: `https://tiles.openfreemap.org/styles/liberty`

**Self-hosted fallback (future, if needed)**: Protomaps PMTiles
- Download a regional `.pmtiles` extract, serve as a static file
- Use the MapLibre PMTiles plugin (`pmtiles` npm package)
- Advantage: zero external runtime dependency
- Disadvantage: large file (Europe extract ~2-3 GB)

**Future: snow / climate overlay**
- Possible via a MapLibre raster source layer on top of the basemap
- Pre-rendered PNG tiles from ERA5/Copernicus or NOAA data
- No server required — can be served as static files or from a CDN
- Defer until core features are complete

## Filtering

Filters operate client-side on the in-memory `data.json` content. State is serialized to URL search params (`?sport=alpine-skiing&year=2026`) so links are shareable.

Initial filter dimensions:
- Sport (multi-select)
- Medal type (gold / silver / bronze, multi-select)
- Country (IOC code)
- Year / Olympics edition (once multi-year data exists)

## Conventions

Consistent with other projects in this workspace:

- **Indentation**: 2 spaces (Biome formatter)
- **Quotes**: Double quotes in JSX/TSX, single quotes in TS (follow `diatonic` biome.json)
- **Semicolons**: Not required (as in `diatonic`)
- **TypeScript**: 5.9.x, `strict: true`, `noEmit: true` for app code
- **Module resolution**: `bundler` (Vite projects)
- **Imports**: Organized automatically by Biome; prefer named exports
- **Pipeline scripts**: Run with `tsx` (not compiled, not bundled)
- No CSS frameworks — plain CSS with custom properties
- `data.json` is committed to the repo so the app works without running the pipeline
- Pipeline scripts may use any Node.js API freely; `src/` code must not

## Key Commands

```bash
npm install

npm run dev               # Vite dev server (http://localhost:5173)
npm run build             # Static build → dist/
npm run preview           # Preview dist/ locally
npm run check             # Biome lint + format check
npm run check:fix         # Biome autofix

npm run pipeline:wikipedia
npm run pipeline:wikidata
npm run pipeline:coverage
npm run pipeline:merge
```

## Gotchas

- Wikipedia medal tables differ in HTML structure between Olympics editions — the scraper likely needs per-year handling or resilient selectors
- Wikidata SPARQL often lacks birth coordinates for less prominent athletes; Wikipedia infoboxes (via the MediaWiki API) tend to be more complete
- One `Medal` record per medal, not per athlete — an athlete winning 3 medals generates 3 records all pointing to the same `Athlete`
- IOC country codes differ from ISO 3166 in some cases (e.g. Great Britain = GBR in IOC)
- Athletes who competed under a neutral flag (ROC, AIN, EOR) need explicit handling — they have a `country` code but often a specific birth country
- Relay / team events: every team member gets a medal record; birth coordinates fan out naturally from there
