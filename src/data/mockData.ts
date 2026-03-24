// PlastiCatch Mock Data

export const plasticTypes = [
  { id: "PET_BOTTLES", label: "PET Bottles", rate: 0.40, description: "PET plastic bottles" },
  { id: "HDPE_RIGID", label: "HDPE Rigid", rate: 0.35, description: "HDPE rigid containers" },
  { id: "FISHING_GEAR", label: "Fishing Gear", rate: 0.55, description: "Nets, lines, ropes, traps" },
  { id: "FILM_PLASTIC", label: "Film Plastic", rate: 0.20, description: "Bags, packaging film" },
  { id: "FOAM_EPS", label: "Foam/EPS", rate: 0.15, description: "Expanded polystyrene" },
  { id: "MIXED_HARD", label: "Mixed Hard", rate: 0.25, description: "Mixed rigid plastic" },
  { id: "MIXED_SOFT", label: "Mixed Soft", rate: 0.15, description: "Mixed flexible plastic" },
  { id: "MICROPLASTIC_BAG", label: "Microplastic Bag", rate: 0.60, description: "Pre-sorted microplastics" },
] as const;

export const reputationTiers = [
  { tier: 0, name: "Newcomer", min: 0, max: 50, multiplier: 1.0, color: "muted" },
  { tier: 1, name: "Active", min: 51, max: 200, multiplier: 1.1, color: "primary" },
  { tier: 2, name: "Established", min: 201, max: 500, multiplier: 1.2, color: "ocean-light" },
  { tier: 3, name: "Dedicated", min: 501, max: 800, multiplier: 1.35, color: "seagrass" },
  { tier: 4, name: "Champion", min: 801, max: 1000, multiplier: 1.5, color: "accent" },
] as const;

export const mockCollector = {
  id: "0.0.45678",
  name: "Ahmed K.",
  zone: "Mediterranean North",
  reputationScore: 342,
  tier: 2,
  totalKgRecovered: 1247,
  totalHbarEarned: 523.8,
  todayEarnings: 12.4,
  monthEarnings: 156.2,
  leaderboardPosition: 14,
  leaderboardDelta: 3,
  daysActive: 127,
  uniqueStations: 4,
};

export const mockRecoveryHistory = [
  { id: "att-001", date: "2026-03-09", station: "Alexandria Port Main", types: ["FISHING_GEAR", "PET_BOTTLES"], weightKg: 11.3, payout: 6.6, status: "confirmed" },
  { id: "att-002", date: "2026-03-08", station: "Alexandria Port Main", types: ["PET_BOTTLES"], weightKg: 8.2, payout: 3.28, status: "confirmed" },
  { id: "att-003", date: "2026-03-07", station: "Port Said NGO Point", types: ["FILM_PLASTIC", "MIXED_HARD"], weightKg: 15.1, payout: 4.78, status: "confirmed" },
  { id: "att-004", date: "2026-03-06", station: "Alexandria Port Main", types: ["FISHING_GEAR"], weightKg: 6.5, payout: 4.29, status: "confirmed" },
  { id: "att-005", date: "2026-03-05", station: "Damietta Recycling Depot", types: ["HDPE_RIGID", "PET_BOTTLES"], weightKg: 12.0, payout: 4.5, status: "confirmed" },
];

export const mockNearbyStations = [
  { id: "st-001", name: "Alexandria Port Main", distance: "1.2 km", types: ["PET_BOTTLES", "FISHING_GEAR", "HDPE_RIGID"], demandBonus: true },
  { id: "st-002", name: "Port Said NGO Point", distance: "8.5 km", types: ["FILM_PLASTIC", "MIXED_HARD", "MIXED_SOFT"], demandBonus: false },
  { id: "st-003", name: "Damietta Recycling Depot", distance: "23 km", types: ["PET_BOTTLES", "HDPE_RIGID", "FOAM_EPS"], demandBonus: false },
];

export const mockActiveEvents = [
  { id: "evt-001", name: "Mediterranean Spring Cleanup", multiplier: 1.5, daysRemaining: 5, sponsor: "OceanCorp Ltd", zone: "Mediterranean North" },
];

export const mockStationData = {
  id: "st-001",
  name: "Alexandria Port Main",
  zone: "Mediterranean North",
  dailyVolume: { total: 145.2, trend: 12, types: { PET_BOTTLES: 52.3, FISHING_GEAR: 38.1, HDPE_RIGID: 28.4, FILM_PLASTIC: 15.2, MIXED_HARD: 11.2 } },
  activeCollectors: 23,
  monthlyPayout: 2847.5,
  stakeAmount: 500,
  stakeStatus: "active" as const,
  calibrationExpiry: "2026-06-15",
  anomalyFlags: 1,
  revenueShare: 142.3,
};

export const mockStationSubmissions = [
  { id: "sub-001", collector: "Ahmed K. (0.0.45678)", types: ["FISHING_GEAR", "PET_BOTTLES"], weightKg: 11.3, payout: 6.6, status: "verified", time: "09:42" },
  { id: "sub-002", collector: "Fatima R. (0.0.45901)", types: ["PET_BOTTLES"], weightKg: 5.1, payout: 2.04, status: "verified", time: "10:15" },
  { id: "sub-003", collector: "Omar S. (0.0.46102)", types: ["HDPE_RIGID", "FILM_PLASTIC"], weightKg: 8.7, payout: 2.79, status: "pending", time: "11:30" },
  { id: "sub-004", collector: "Youssef M. (0.0.46205)", types: ["MIXED_HARD"], weightKg: 22.4, payout: 5.6, status: "flagged", time: "12:05" },
];

export const mockCorporateData = {
  companyName: "OceanCorp Ltd",
  totalPrcOwned: 4521,
  totalPrcRetired: 12380,
  totalKgImpact: 16901,
  totalHbarSpent: 28453,
  collectorsSupported: 312,
  zonesImpacted: 4,
};

export const mockPrcMarketplace = [
  { id: "prc-batch-001", zone: "Mediterranean North", type: "FISHING_GEAR", available: 1200, pricePerPrc: 1.10, vintage: "2026", minTier: 2 },
  { id: "prc-batch-002", zone: "Mediterranean North", type: "PET_BOTTLES", available: 2621, pricePerPrc: 0.80, vintage: "2026", minTier: 0 },
  { id: "prc-batch-003", zone: "Arabian Gulf", type: "HDPE_RIGID", available: 890, pricePerPrc: 0.70, vintage: "2026", minTier: 1 },
  { id: "prc-batch-004", zone: "Pacific Philippines", type: "FISHING_GEAR", available: 3100, pricePerPrc: 1.10, vintage: "2025", minTier: 0 },
  { id: "prc-batch-005", zone: "West Africa Coast", type: "FILM_PLASTIC", available: 1560, pricePerPrc: 0.40, vintage: "2026", minTier: 0 },
];

export const mockRetirements = [
  { id: "ret-001", date: "2026-02-28", amount: 5000, companyName: "OceanCorp Ltd", reportRef: "ESG-2026-Q1", certTokenId: "0.0.99001" },
  { id: "ret-002", date: "2026-01-15", amount: 3800, companyName: "OceanCorp Ltd", reportRef: "ESG-2025-Q4", certTokenId: "0.0.98542" },
  { id: "ret-003", date: "2025-10-01", amount: 3580, companyName: "OceanCorp Ltd", reportRef: "ESG-2025-Q3", certTokenId: "0.0.97891" },
];

export const mockLeaderboard = [
  { rank: 1, name: "Maria C.", zone: "Mediterranean North", totalKg: 8421, hbarEarned: 4210.5, tier: 4 },
  { rank: 2, name: "Carlos V.", zone: "Pacific Philippines", totalKg: 7893, hbarEarned: 3946.5, tier: 4 },
  { rank: 3, name: "Amina B.", zone: "West Africa Coast", totalKg: 6234, hbarEarned: 3117.0, tier: 3 },
  { rank: 14, name: "Ahmed K.", zone: "Mediterranean North", totalKg: 1247, hbarEarned: 523.8, tier: 2 },
];

export const globalStats = {
  totalKgRecovered: 248_210,
  totalCollectors: 1_843,
  totalStations: 127,
  totalPrcRetired: 189_400,
  corporateBuyers: 34,
  countriesActive: 18,
};

export const weeklyVolumeData = [
  { day: "Mon", kg: 18.2 },
  { day: "Tue", kg: 22.1 },
  { day: "Wed", kg: 15.8 },
  { day: "Thu", kg: 28.4 },
  { day: "Fri", kg: 31.2 },
  { day: "Sat", kg: 12.5 },
  { day: "Sun", kg: 8.6 },
];

export const stationVolumeData = [
  { day: "Mon", kg: 125 },
  { day: "Tue", kg: 148 },
  { day: "Wed", kg: 132 },
  { day: "Thu", kg: 167 },
  { day: "Fri", kg: 189 },
  { day: "Sat", kg: 98 },
  { day: "Sun", kg: 72 },
];
