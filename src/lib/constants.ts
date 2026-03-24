// src/lib/constants.ts
// PlastiCatch System Constants

export const PLASTIC_TYPES = {
  PET_BOTTLES: {
    id: "PET_BOTTLES",
    name: "PET Plastic Bottles",
    description: "Water, beverage, consumer goods bottles",
    basePayoutRate: 0.40,
    color: "bg-blue-500",
  },
  HDPE_RIGID: {
    id: "HDPE_RIGID",
    name: "HDPE Rigid Plastic",
    description: "Containers, crates, drums",
    basePayoutRate: 0.35,
    color: "bg-purple-500",
  },
  FISHING_GEAR: {
    id: "FISHING_GEAR",
    name: "Fishing Gear",
    description: "Nets, lines, ropes, traps (ghost gear)",
    basePayoutRate: 0.55,
    color: "bg-red-500",
  },
  FILM_PLASTIC: {
    id: "FILM_PLASTIC",
    name: "Film Plastic",
    description: "Bags, packaging film, wrapping",
    basePayoutRate: 0.20,
    color: "bg-gray-500",
  },
  FOAM_EPS: {
    id: "FOAM_EPS",
    name: "Foam/EPS",
    description: "Expanded polystyrene (foam cups, packaging)",
    basePayoutRate: 0.15,
    color: "bg-orange-500",
  },
  MIXED_HARD: {
    id: "MIXED_HARD",
    name: "Mixed Hard Plastic",
    description: "Mixed rigid plastic, unidentifiable type",
    basePayoutRate: 0.25,
    color: "bg-teal-500",
  },
  MIXED_SOFT: {
    id: "MIXED_SOFT",
    name: "Mixed Soft Plastic",
    description: "Mixed flexible/soft plastic, multilayer",
    basePayoutRate: 0.15,
    color: "bg-slate-500",
  },
  MICROPLASTIC_BAG: {
    id: "MICROPLASTIC_BAG",
    name: "Microplastics (Certified)",
    description: "Pre-sorted microplastics in certified bags",
    basePayoutRate: 0.60,
    color: "bg-pink-500",
  },
} as const;

export const plasticTypes = Object.values(PLASTIC_TYPES);

// Geographic Zones
export const GEOGRAPHIC_ZONES = [
  "Mediterranean North",
  "Mediterranean South",
  "Arabian Gulf",
  "Red Sea",
  "Bay of Bengal",
  "Pacific Philippines",
  "Pacific Indonesia",
  "Caribbean East",
  "Caribbean West",
  "West Africa",
  "East Africa",
  "North Atlantic",
  "South Atlantic",
] as const;

// Minimum Stake Requirements
export const STATION_MINIMUM_STAKE = 500; // HBAR
export const COLLECTOR_ONBOARDING_CREDIT = 0.3; // HBAR

// Simple payout calculation (base rate only)
export function calculatePayout(
  plasticType: keyof typeof PLASTIC_TYPES,
  weightGrams: number,
): { payoutHbar: number; payoutTinybar: number } {
  const baseRate = PLASTIC_TYPES[plasticType].basePayoutRate;
  const payoutHbar = (weightGrams / 1000) * baseRate;
  const payoutTinybar = Math.floor(payoutHbar * 100_000_000);
  return { payoutHbar, payoutTinybar };
}
