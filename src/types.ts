export interface Medal {
  year: number;
  sport: string;
  event: string;
  category: "men" | "women" | "mixed";
  medal: "gold" | "silver" | "bronze";
  country: string;
}

export interface Athlete {
  id: string;
  name: string;
  birthPlace: string | null;
  birthCoords: [number, number] | null;
  medals: Medal[];
}
