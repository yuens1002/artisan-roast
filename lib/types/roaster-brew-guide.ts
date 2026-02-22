export type BrewMethodKey =
  | "POUR_OVER_V60"
  | "CHEMEX"
  | "AEROPRESS"
  | "FRENCH_PRESS"
  | "ESPRESSO"
  | "MOKA_POT"
  | "COLD_BREW"
  | "DRIP_MACHINE"
  | "SIPHON"
  | "TURKISH"
  | "OTHER";

export interface BrewStep {
  label: string;
  waterG?: number;
  timeStamp?: string;
  notes?: string;
}

export interface BrewRecipe {
  method: BrewMethodKey;
  coffeeWeightG?: number;
  waterWeightG?: number;
  totalBrewTime?: string;
  ratio?: string;
  grindSize?: string;
  waterTempF?: number;
  notes?: string;
  steps?: BrewStep[];
}

export interface RoasterBrewGuide {
  recommendedMethods: BrewMethodKey[];
  recipes?: BrewRecipe[];
  originNotes?: string;
  accolades?: string[];
  roasterTastingNotes?: string;
}

export const BREW_METHOD_LABELS: Record<BrewMethodKey, string> = {
  POUR_OVER_V60: "Pour-over (V60)",
  CHEMEX: "Chemex",
  AEROPRESS: "AeroPress",
  FRENCH_PRESS: "French Press",
  ESPRESSO: "Espresso",
  MOKA_POT: "Moka Pot",
  COLD_BREW: "Cold Brew",
  DRIP_MACHINE: "Drip",
  SIPHON: "Siphon",
  TURKISH: "Turkish",
  OTHER: "Other",
};
