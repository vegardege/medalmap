export interface OlympicsEdition {
  year: number;
  city: string;
  country: string;
}

// All completed Winter Olympic Games.
// Add a new entry here when a new edition finishes.
// Shared by the data pipeline and the web app.
export const WINTER_OLYMPICS: OlympicsEdition[] = [
  { year: 1924, city: "Chamonix", country: "France" },
  { year: 1928, city: "St. Moritz", country: "Switzerland" },
  { year: 1932, city: "Lake Placid", country: "United States" },
  { year: 1936, city: "Garmisch-Partenkirchen", country: "Germany" },
  { year: 1948, city: "St. Moritz", country: "Switzerland" },
  { year: 1952, city: "Oslo", country: "Norway" },
  { year: 1956, city: "Cortina d'Ampezzo", country: "Italy" },
  { year: 1960, city: "Squaw Valley", country: "United States" },
  { year: 1964, city: "Innsbruck", country: "Austria" },
  { year: 1968, city: "Grenoble", country: "France" },
  { year: 1972, city: "Sapporo", country: "Japan" },
  { year: 1976, city: "Innsbruck", country: "Austria" },
  { year: 1980, city: "Lake Placid", country: "United States" },
  { year: 1984, city: "Sarajevo", country: "Yugoslavia" },
  { year: 1988, city: "Calgary", country: "Canada" },
  { year: 1992, city: "Albertville", country: "France" },
  { year: 1994, city: "Lillehammer", country: "Norway" },
  { year: 1998, city: "Nagano", country: "Japan" },
  { year: 2002, city: "Salt Lake City", country: "United States" },
  { year: 2006, city: "Turin", country: "Italy" },
  { year: 2010, city: "Vancouver", country: "Canada" },
  { year: 2014, city: "Sochi", country: "Russia" },
  { year: 2018, city: "Pyeongchang", country: "South Korea" },
  { year: 2022, city: "Beijing", country: "China" },
  { year: 2026, city: "Milan", country: "Italy" },
];

export const WINTER_OLYMPIC_YEARS = WINTER_OLYMPICS.map((e) => e.year);

export const WINTER_OLYMPICS_BY_YEAR = new Map(
  WINTER_OLYMPICS.map((e) => [e.year, e]),
);
