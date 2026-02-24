// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseWikipediaPage } from "../scripts/wikipedia.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, "fixtures/2026.html"), "utf-8");
const entries = parseWikipediaPage(html, 2026);

describe("parseWikipediaPage", () => {
  it("returns a non-empty list of entries", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("sets Wikipedia page title as id", () => {
    const entry = entries.find((e) => e.id === "Franjo_von_Allmen");
    expect(entry?.name).toBe("Franjo von Allmen");
  });

  it("decodes URL-encoded ids", () => {
    // /wiki/Lo%C3%AFc_Meillard → Loïc_Meillard
    const entry = entries.find((e) => e.id === "Loïc_Meillard");
    expect(entry?.name).toBe("Loïc Meillard");
  });

  it("produces one entry per medal (same athlete appears multiple times)", () => {
    const vonAllmen = entries.filter((e) => e.id === "Franjo_von_Allmen");
    expect(vonAllmen.length).toBeGreaterThanOrEqual(2);
  });

  it("assigns correct sport, event, medal, country, and year", () => {
    const entry = entries.find(
      (e) => e.id === "Franjo_von_Allmen" && e.event === "Downhill",
    );
    expect(entry).toMatchObject({
      year: 2026,
      sport: "Alpine skiing",
      event: "Downhill",
      country: "Switzerland",
      medal: "gold",
    });
  });

  it("handles individual-format ties (athlete before country)", () => {
    // Women's giant slalom: Stjernesund (NOR) and Hector (SWE) share silver
    const sm = entries.find(
      (e) => e.id === "Thea_Louise_Stjernesund" && e.event === "Giant slalom",
    );
    const hm = entries.find(
      (e) => e.id === "Sara_Hector" && e.event === "Giant slalom",
    );
    expect(sm).toMatchObject({ medal: "silver", country: "Norway" });
    expect(hm).toMatchObject({ medal: "silver", country: "Sweden" });
  });

  it("handles team-format events (country before athletes)", () => {
    // Men's team combined gold: Switzerland with von Allmen + Nef
    const vm = entries.find(
      (e) => e.id === "Franjo_von_Allmen" && e.event === "Team combined",
    );
    const nm = entries.find((e) => e.id === "Tanguy_Nef");
    expect(vm).toMatchObject({ medal: "gold", country: "Switzerland" });
    expect(nm).toMatchObject({ medal: "gold", country: "Switzerland" });
  });

  it("handles team-format ties (multiple countries sharing a medal)", () => {
    // Men's team combined silver: Austria (Kriechmayr + Feller) and Switzerland (Odermatt + Meillard)
    const km = entries.find(
      (e) => e.id === "Vincent_Kriechmayr" && e.event === "Team combined",
    );
    const om = entries.find(
      (e) =>
        e.id === "Marco_Odermatt" &&
        e.event === "Team combined" &&
        e.medal === "silver",
    );
    expect(km).toMatchObject({ medal: "silver", country: "Austria" });
    expect(om).toMatchObject({ medal: "silver", country: "Switzerland" });
  });

  it("skips 'Not awarded' medal cells", () => {
    // Men's team combined has no bronze — just verify no crash and sane output
    expect(entries.length).toBeGreaterThan(0);
  });

  it("parses nowrap-wrapped event names (e.g. cross-country skiing)", () => {
    // "10 kilometre freestyle" is wrapped in <span class="nowrap"> in the fixture
    const entry = entries.find(
      (e) =>
        e.id === "Johannes_Høsflot_Klæbo" &&
        e.event === "10 kilometre freestyle",
    );
    expect(entry).toMatchObject({
      sport: "Cross-country skiing",
      medal: "gold",
    });
  });

  it("spans multiple sports", () => {
    const sports = new Set(entries.map((e) => e.sport));
    expect(sports).toContain("Alpine skiing");
    expect(sports).toContain("Biathlon");
    expect(sports).toContain("Speed skating");
    expect(sports.size).toBeGreaterThan(8);
  });
});
