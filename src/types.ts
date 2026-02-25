// A single medal won by an Olympic athlete. Note that one athlete can win
// medals for more than one country and in different categories.
export interface Medal {
  year: number;
  sport: string;
  event: string;
  category: "men" | "women" | "mixed";
  medal: "gold" | "silver" | "bronze";
  country: string;
}

// A medal winner in any Olympic games
export interface Athlete {
  id: string;
  name: string;
  birthPlace: string | null;
  birthCoords: [number, number] | null;
  medals: Medal[];
}

// Grouped view of athletes sharing one birth location
export interface Location {
  coords: [number, number]; // [longitude, latitude]
  athletes: Athlete[];
}

// Active filter state — empty array means "all selected" (no restriction)
export interface FilterState {
  medals: Array<"gold" | "silver" | "bronze">;
  sports: string[];
  categories: Array<"men" | "women" | "mixed">;
  countries: string[];
  years: number[];
}
