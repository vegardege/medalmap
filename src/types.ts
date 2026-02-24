export interface Medal {
  year: number;
  sport: string;
  event: string;
  country: string;
  medal: "gold" | "silver" | "bronze";
}

export interface Athlete {
  id: string;
  name: string;
  gender: "male" | "female" | null;
  birthPlace: string | null;
  birthCoords: [number, number] | null;
  medals: Medal[];
}
