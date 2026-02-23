# Medal Map

Interactive map showing where Winter Olympic medalists were born.

## Pipelines

The data pipeline scrapes Wikipedia and queries Wikidata to build a static `data/data.json` file that the web app reads at runtime.

```
Wikipedia + Wikidata → pipeline scripts → data/data.json → static web app
```

Missing or incorrect data can be patched via `data/overrides.json` before merging.

## Tech stack

- [Preact](https://preactjs.com/) + TypeScript — UI
- [Vite](https://vite.dev/) — build tool and dev server
- [MapLibre GL JS](https://maplibre.org/) — map rendering
- [OpenFreeMap](https://openfreemap.org/) — free, open-source map tiles (no account required)
- [Biome](https://biomejs.dev/) — linting and formatting
- [tsx](https://tsx.is/) — runs the TypeScript pipeline scripts directly

## Setup

```bash
npm install
```

## Development

```bash
npm run dev        # start dev server at http://localhost:5173
npm run build      # static build to `dist/`
npm run preview    # preview the built output locally
npm run check      # lint and format check (Biome)
npm run check:fix  # auto-fix lint and formatting
npm test           # run tests
```

## Data pipeline

The pipeline scripts are run manually to regenerate `data/data.json`. The generated file is committed to the repo so the app works without running the pipeline.

```bash
npm run pipeline:wikipedia   # scrape medal tables from Wikipedia
npm run pipeline:wikidata    # query Wikidata for athlete metadata and birth coordinates
npm run pipeline:coverage    # report missing data and conflicts between sources
npm run pipeline:merge       # merge all sources (including manual overrides) into data/data.json
```

Run them in order. After `pipeline:coverage`, review the report and add any manual corrections to `data/overrides.json` before running `pipeline:merge`.

**Merge priority**: `overrides.json` > Wikipedia > Wikidata

## Deployment

The app is a static site. After `npm run build`, serve the `dist/` directory with any static file server.
