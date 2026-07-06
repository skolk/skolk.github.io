import React, { useState, useMemo, useEffect } from "react";

// Community Economic Simulator v4
// Three starting biomes, urban/rural dynamics, expanded shock system.

// ============ BIOMES ============
const BIOMES = {
  island: {
    name: "Coastal Island",
    blurb: "A small island. Sea on all sides, no large mineral deposits, limited arable land but warm sea and a natural harbor.",
    character: "Tourism comes naturally. Trade and connection are cheap. But you depend on the outside world, and shocks travel by ship.",
    color: "#3f7a8a",
    icon: "🏝",
    sectorMult: { crops: 0.7, tourism: 1.5, mining: 0, services: 1.0, manufacturing: 0.9, agritech: 0.8, cooperatives: 1.0, specialized: 0.85, finance: 1.1, ecotourism: 1.4, research: 0.9, regenerative: 1.1 },
    vowelCostMult: { roads: 0.9, port: 0.6, schools: 1.0, health: 1.0, rd: 1.0, ruleOfLaw: 1.0 },
    sectorAvailable: { mining: false },
    shockBias: { tourist_crisis: 2.5, trade_disruption: 1.5, drought: 0.8, commodity_crash: 0, financial_panic: 1.0, storm: 2.0 },
    startTreasury: 32,
    startWorkforce: [68, 22, 8, 2],
    startAllocation: { tourism: 0.30, crops: 0.30, services: 0.35, mining: 0 },
    foodNeed: 18, // food units required per turn
    importCostPerUnit: 1.0, // cheap to import via port
  },
  inland: {
    name: "Inland Plains",
    blurb: "Wide arable land, river valleys, no coastline. The granary if you build it right, the dust bowl if you don't.",
    character: "Crops are your dowry. Distance from the sea taxes everything that has to move. Capability built here radiates inward to neighbors.",
    color: "#7e8b3a",
    icon: "🌾",
    sectorMult: { crops: 1.5, tourism: 0.8, mining: 0.7, services: 1.0, manufacturing: 0.95, agritech: 1.4, cooperatives: 1.1, specialized: 0.9, finance: 0.9, ecotourism: 0.8, research: 0.95, regenerative: 1.2 },
    vowelCostMult: { roads: 0.75, port: 2.5, schools: 1.0, health: 1.0, rd: 1.0, ruleOfLaw: 1.0 },
    sectorAvailable: {},
    shockBias: { drought: 2.5, commodity_crash: 0.7, tourist_crisis: 0.5, trade_disruption: 1.2, financial_panic: 1.0, storm: 1.0 },
    startTreasury: 30,
    startWorkforce: [72, 20, 6, 2],
    startAllocation: { crops: 0.55, services: 0.25, mining: 0.05, tourism: 0.10 },
    foodNeed: 20,
    importCostPerUnit: 2.5, // expensive overland imports
  },
  mountain: {
    name: "Mountainous Highlands",
    blurb: "Rugged terrain, mineral wealth in the rocks, terraced agriculture only. Roads cost more, but what you dig up is valuable.",
    character: "The veins run deep. Your bet is whether to spend the mining revenue on capability or let it leak to outside owners.",
    color: "#5a5660",
    icon: "⛰",
    sectorMult: { crops: 0.6, tourism: 1.0, mining: 1.5, services: 1.0, manufacturing: 0.95, agritech: 0.7, cooperatives: 1.0, specialized: 1.0, finance: 0.95, ecotourism: 1.2, research: 1.0, regenerative: 0.95 },
    vowelCostMult: { roads: 1.7, port: 1.4, schools: 1.1, health: 1.1, rd: 1.0, ruleOfLaw: 1.0 },
    sectorAvailable: {},
    shockBias: { commodity_crash: 2.5, drought: 0.6, tourist_crisis: 0.8, trade_disruption: 1.3, financial_panic: 1.0, storm: 1.5 },
    startTreasury: 50,
    startWorkforce: [70, 22, 7, 1],
    startAllocation: { mining: 0.30, crops: 0.30, services: 0.25, tourism: 0.15 },
    foodNeed: 20,
    importCostPerUnit: 2.0,
  },
};

// ============ SECTORS ============
const SECTORS = {
  crops: {
    name: "Crops", tier: 0, urbanPull: -0.8,
    blurb: "Smallholder farming. Place-bound. Produces food.",
    baseValue: 8, complexity: 1, trainingRate: 0.04, hiresFrom: 0,
    requires: { roads: 1, health: 1 },
    wageFloor: 0.55, wageCeiling: 0.78,
    ownerType: "local", color: "#7e8b3a",
    shockVulnerable: ["drought", "storm"],
    foodYield: 1.2, // food units per labor unit
  },
  tourism: {
    name: "Tourism", tier: 0, urbanPull: 0.1,
    blurb: "Hospitality. Externally exposed.",
    baseValue: 14, complexity: 2, trainingRate: 0.06, hiresFrom: 0,
    requires: { roads: 2, port: 1, health: 1, ruleOfLaw: 1 },
    wageFloor: 0.40, wageCeiling: 0.70,
    ownerType: "outside", color: "#c98a3a",
    shockVulnerable: ["tourist_crisis", "storm"],
  },
  mining: {
    name: "Mining", tier: 0, urbanPull: -0.6,
    blurb: "Extractive. Narrow spillover.",
    baseValue: 26, complexity: 2, trainingRate: 0.02, hiresFrom: 1,
    requires: { roads: 2, port: 2, ruleOfLaw: 2 },
    wageFloor: 0.20, wageCeiling: 0.55,
    ownerType: "outside", color: "#5a5660",
    shockVulnerable: ["commodity_crash"],
  },
  services: {
    name: "Local Services", tier: 0, urbanPull: 0.3,
    blurb: "Repair, trades, clinics. Capability seedbed.",
    baseValue: 11, complexity: 2, trainingRate: 0.11, hiresFrom: 1,
    requires: { roads: 1, schools: 1, health: 1 },
    wageFloor: 0.65, wageCeiling: 0.85,
    ownerType: "local", color: "#3f7a8a",
    shockVulnerable: [],
  },
  // TIER 1
  manufacturing: {
    name: "Light Manufacturing", tier: 1, urbanPull: 0.6,
    blurb: "Assembly. Classic adjacent possible.",
    baseValue: 32, complexity: 4, trainingRate: 0.14, hiresFrom: 2,
    requires: { roads: 2, port: 2, schools: 2, rd: 1, ruleOfLaw: 2 },
    wageFloor: 0.50, wageCeiling: 0.78,
    ownerType: "mixed", color: "#8a3f5a",
    locked: true,
    unlockReqs: { skilledShare: 0.13, vowels: { roads: 2, port: 2, schools: 2, rd: 1, ruleOfLaw: 2 } },
    shockVulnerable: ["trade_disruption"],
  },
  agritech: {
    name: "Agri-tech", tier: 1, urbanPull: -0.3,
    blurb: "Value-added farming via R&D. Produces high-yield food.",
    baseValue: 28, complexity: 3, trainingRate: 0.12, hiresFrom: 1,
    requires: { roads: 2, schools: 2, rd: 2, health: 1 },
    wageFloor: 0.55, wageCeiling: 0.82,
    ownerType: "mixed", color: "#5a8a3f",
    locked: true,
    unlockReqs: { sectorActive: "crops", skilledShare: 0.10, vowels: { schools: 2, rd: 2, roads: 2 } },
    shockVulnerable: ["drought"],
    foodYield: 2.5, // higher yield than crops
  },
  cooperatives: {
    name: "Worker Cooperatives", tier: 1, urbanPull: 0.2,
    blurb: "Locally owned shared production.",
    baseValue: 18, complexity: 3, trainingRate: 0.15, hiresFrom: 1,
    requires: { schools: 2, health: 2, ruleOfLaw: 2 },
    wageFloor: 0.78, wageCeiling: 0.92,
    ownerType: "worker", color: "#3f8a7a",
    locked: true,
    unlockReqs: { sectorActive: "services", wageBargain: 0.55, vowels: { schools: 2, health: 2 } },
    shockVulnerable: [],
  },
  // TIER 2
  specialized: {
    name: "Specialized Manufacturing", tier: 2, urbanPull: 0.8,
    blurb: "Precision goods. Deep capability stack.",
    baseValue: 56, complexity: 6, trainingRate: 0.17, hiresFrom: 3,
    requires: { roads: 3, port: 3, schools: 3, rd: 3, ruleOfLaw: 3 },
    wageFloor: 0.55, wageCeiling: 0.80,
    ownerType: "mixed", color: "#5a3f8a",
    locked: true,
    unlockReqs: { specialistShare: 0.08, sectorActive: "manufacturing", vowels: { rd: 3, schools: 3, port: 3 } },
    shockVulnerable: ["trade_disruption"],
  },
  finance: {
    name: "Finance & Capital", tier: 2, urbanPull: 0.9,
    blurb: "Banking, insurance, brokerage.",
    baseValue: 48, complexity: 5, trainingRate: 0.10, hiresFrom: 2,
    requires: { schools: 3, rd: 2, ruleOfLaw: 4, port: 2 },
    wageFloor: 0.30, wageCeiling: 0.62,
    ownerType: "outside", color: "#8a5a3f",
    locked: true,
    unlockReqs: { sectorActive: "services", vowels: { ruleOfLaw: 4, schools: 3 }, treasury: 60 },
    shockVulnerable: ["financial_panic"],
  },
  ecotourism: {
    name: "Ecotourism & Heritage", tier: 2, urbanPull: -0.4,
    blurb: "Community tourism. Identity over volume.",
    baseValue: 24, complexity: 3, trainingRate: 0.13, hiresFrom: 1,
    requires: { schools: 2, health: 2, roads: 2, ruleOfLaw: 2 },
    wageFloor: 0.70, wageCeiling: 0.88,
    ownerType: "local", color: "#3f8a5a",
    locked: true,
    unlockReqs: { sectorActive: "tourism", wageBargain: 0.50, vowels: { schools: 2, health: 2 } },
    shockVulnerable: ["tourist_crisis"],
  },
  // TIER 3
  research: {
    name: "Research & Design", tier: 3, urbanPull: 0.95,
    blurb: "Frontier knowledge. Highest complexity.",
    baseValue: 72, complexity: 8, trainingRate: 0.20, hiresFrom: 3,
    requires: { schools: 4, rd: 5, ruleOfLaw: 3, health: 3 },
    wageFloor: 0.60, wageCeiling: 0.85,
    ownerType: "mixed", color: "#3f5a8a",
    locked: true,
    unlockReqs: { specialistShare: 0.12, sectorActive: "specialized", vowels: { rd: 5, schools: 4 } },
    shockVulnerable: [],
  },
  regenerative: {
    name: "Regenerative Systems", tier: 3, urbanPull: -0.5,
    blurb: "Ecological restoration as economy. Yields food and resilience.",
    baseValue: 38, complexity: 5, trainingRate: 0.16, hiresFrom: 2,
    requires: { schools: 3, rd: 3, health: 3, ruleOfLaw: 3 },
    wageFloor: 0.72, wageCeiling: 0.90,
    ownerType: "worker", color: "#5a8a8a",
    locked: true,
    unlockReqs: { sectorActive: "cooperatives", skilledShare: 0.20, vowels: { rd: 3, schools: 3, health: 3 } },
    shockVulnerable: [],
    foodYield: 1.5,
  },
};

const VOWELS = {
  roads: { name: "Roads", baseCost: 6, why: "Moves people and goods. Nothing else compounds without it." },
  port: { name: "Port", baseCost: 9, why: "Connects to outside markets. Required for export sectors." },
  schools: { name: "Schools", baseCost: 7, why: "Moves workers up the knowhow ladder." },
  health: { name: "Health", baseCost: 6, why: "Workers can't accumulate knowhow if they're sick." },
  rd: { name: "R&D / Standards", baseCost: 10, why: "Required for complex sectors." },
  ruleOfLaw: { name: "Rule of Law", baseCost: 8, why: "Investors won't commit without enforcement." },
};

function vowelCost(key, level, biome) {
  const mult = (biome && BIOMES[biome] && BIOMES[biome].vowelCostMult[key]) || 1;
  // Health gets a cost discount on early levels (1→2 and 2→3) to make food security defenses affordable
  if (key === "health" && level <= 2) {
    return Math.round(VOWELS[key].baseCost * Math.pow(1 + level * 0.35, 2) * mult);
  }
  // Past level 2, costs ramp steeply: building to high levels is a major commitment, not a casual upgrade.
  // Pre-v19: (1 + L*0.5)^2. Now: (1 + L*0.55)^2 with 1.4x multiplier above level 2.
  const base = VOWELS[key].baseCost * Math.pow(1 + level * 0.55, 2) * mult;
  return Math.round(level >= 2 ? base * 1.4 : base);
}

// Maintenance cost for a single vowel at its current level.
// Roughly 12% of the cumulative build cost. High levels are expensive to keep running.
function vowelMaintenance(key, level, biome) {
  if (level <= 1) return 0; // Level 1 is "baseline existence" — no maintenance
  let totalBuildCost = 0;
  for (let l = 1; l < level; l++) {
    totalBuildCost += vowelCost(key, l, biome);
  }
  return Math.round(totalBuildCost * 0.12);
}

// Total maintenance owed this turn
function totalMaintenance(vowels, biome) {
  let total = 0;
  for (const k in vowels) {
    total += vowelMaintenance(k, vowels[k], biome);
  }
  return total;
}
function vowelEffective(level) {
  if (level <= 3) return level;
  return 3 + (level - 3) * 0.6;
}

const RUNG_LABELS = ["Unskilled", "Semi-skilled", "Skilled", "Specialist"];
const MAX_TURNS = 20;

const PATHS = {
  capability: {
    name: "Capability-led", color: "#5a3f8a",
    blurb: "Hausmann/Chang. Build vowels, climb complexity.",
    triggerLabel: "R&D ≥ 3 · Schools ≥ 3 · Tax ≥ 20%",
    isTriggered: (s) => s.vowels.rd >= 3 && s.vowels.schools >= 3 && s.taxRate >= 0.20,
    metric: "Economic Complexity",
    metricExplainer: "Sum of (sector complexity × workers). Reaching 220 means real industrial capacity. Vietnam ~80, Thailand ~150, South Korea ~250.",
    target: 220,
    milestone: "Unlock a Tier 2 sector and reach complexity 220",
  },
  commons: {
    name: "Commons-led", color: "#3f8a7a",
    blurb: "Ostrom/Graeber. Worker bargaining, local ownership.",
    triggerLabel: "Wages ≥ 55% · Local sectors ≥ 30% · Health ≥ 2",
    isTriggered: (s) => {
      const localShare = (s.allocation.services || 0) + (s.allocation.cooperatives || 0) + (s.allocation.ecotourism || 0);
      return s.wageBargain >= 0.55 && localShare >= 0.30 && s.vowels.health >= 2;
    },
    metric: "Welfare × Equity",
    metricExplainer: "Median worker pay × (1 − Gini). Rewards both: lifting the median AND keeping spread tight. Target 50 = ~Nordic equity. Gini 0.35 ≈ EU average, 0.41 ≈ US, 0.52 ≈ Brazil.",
    target: 50,
    milestone: "Welfare-equity score ≥ 50 (median welfare high AND Gini low)",
  },
  market: {
    name: "Market-led", color: "#8a5a3f",
    blurb: "Hayek/Buffett. Low taxes, outside capital, accept inequality for growth.",
    triggerLabel: "Tax ≤ 12% · Extractive sectors ≥ 35% · Wages ≤ 40%",
    isTriggered: (s) => {
      const extractiveShare = (s.allocation.mining || 0) + (s.allocation.tourism || 0) + (s.allocation.finance || 0);
      return s.taxRate <= 0.12 && extractiveShare >= 0.35 && s.wageBargain <= 0.40;
    },
    metric: "Accumulated Capital",
    metricExplainer: "Treasury + cumulative owner take. Rewards letting owners keep value and pile it up. Bonus: capital compounds faster when market triggers are active.",
    target: 1500,
    milestone: "Accumulated capital ≥ 1500",
  },
};

const SHOCKS = {
  drought: { name: "Drought", blurb: "Climate shock. Crops yields collapse.", targets: ["crops", "agritech"], severity: 0.6 },
  commodity_crash: { name: "Commodity Crash", blurb: "Global prices collapse. Mining revenue cut.", targets: ["mining"], severity: 0.7 },
  tourist_crisis: { name: "Tourist Crisis", blurb: "Visitors vanish.", targets: ["tourism", "ecotourism"], severity: 0.65 },
  trade_disruption: { name: "Trade Disruption", blurb: "Supply chains break. Export sectors squeezed.", targets: ["manufacturing", "specialized"], severity: 0.55 },
  financial_panic: { name: "Financial Panic", blurb: "Capital markets seize.", targets: ["finance"], severity: 0.8 },
  storm: { name: "Major Storm", blurb: "Infrastructure damage. Outdoor sectors hit.", targets: ["tourism", "crops", "ecotourism"], severity: 0.5 },
  urban_unrest: { name: "Urban Unrest", blurb: "Cities boil over. Capital-intensive sectors hit.", targets: ["manufacturing", "specialized", "finance"], severity: 0.5 },
};

// Macroeconomic cycle: 6-turn rhythm
const CYCLE_PHASES = {
  0: { name: "Recovery", short: "rec", color: "#5a8a8a", capacityMod: 1.03, inflowMod: 0.80, idealTax: 0.10, idealRebal: 0.40, narrative: "Coming out of downturn. Stimulus helps." },
  1: { name: "Recovery", short: "rec", color: "#5a8a8a", capacityMod: 1.03, inflowMod: 0.80, idealTax: 0.10, idealRebal: 0.40, narrative: "Confidence returning. Investment scarce." },
  2: { name: "Expansion", short: "exp", color: "#5a8a3f", capacityMod: 1.05, inflowMod: 1.00, idealTax: 0.18, idealRebal: 0.20, narrative: "Growth phase. Normal policy works." },
  3: { name: "Expansion", short: "exp", color: "#5a8a3f", capacityMod: 1.05, inflowMod: 1.00, idealTax: 0.18, idealRebal: 0.20, narrative: "Strong growth. Wages rising healthily." },
  4: { name: "Peak", short: "pk", color: "#c98a3a", capacityMod: 1.00, inflowMod: 1.10, idealTax: 0.25, idealRebal: 0.10, narrative: "Boom plateau. Save for downturn. Cool the economy." },
  5: { name: "Recession", short: "rec", color: "#a83a1a", capacityMod: 0.92, inflowMod: 0.60, idealTax: 0.22, idealRebal: 0.30, narrative: "Downturn. Counter-cyclical spending matters now." },
};

// Sector lifecycle chains: which sector "matures into" what
const MODERNIZATION_CHAIN = {
  crops: "agritech",
  agritech: "regenerative",
  tourism: "ecotourism",
  mining: "specialized",
  services: "cooperatives",
  cooperatives: "research",
  manufacturing: "specialized",
  specialized: "research",
};

// Build prerequisites: certain vowel levels require complementary infrastructure
// If you build past the requirement without prereqs, the level is "phantom" (paid but not effective)
const VOWEL_PREREQS = {
  schools: { 4: { health: 2 }, 5: { health: 3 } },
  rd: { 4: { schools: 3 }, 5: { schools: 4 }, 6: { schools: 4, health: 3 } },
  ruleOfLaw: { 4: { schools: 2 }, 5: { schools: 3 } },
  health: { 4: { rd: 2 }, 5: { rd: 3 } },
  port: { 4: { roads: 3 }, 5: { roads: 3 } },
};

// Returns the *effective* vowel level given build prereqs
function effectiveVowelLevel(key, vowels) {
  const raw = vowels[key];
  const prereqs = VOWEL_PREREQS[key];
  if (!prereqs) return raw;
  for (let level = raw; level >= 1; level--) {
    const req = prereqs[level];
    if (!req) continue;
    // Check all prerequisites
    let satisfied = true;
    for (const reqKey in req) {
      if (vowels[reqKey] < req[reqKey]) {
        satisfied = false;
        break;
      }
    }
    if (!satisfied) {
      // This level is phantom; effective is one below
      return level - 1 < 0 ? 0 : level - 1;
    }
    return raw; // All prereqs met
  }
  return raw;
}

// ============ ACHIEVEMENTS ============
// Side quests that name what you've built and why it matters. Each achievement requires
// sustained conditions, not single-turn flukes. They are educational: the realWorld field
// connects your play to historical analogs.
const ACHIEVEMENTS = {
  mondragon_threshold: {
    name: "Mondragón Threshold",
    description: "50%+ of labor in local or worker-owned sectors for 5 turns",
    realWorld: "Like the Basque cooperative network — 81,000 worker-owners, survived 2008 with no layoffs by cutting wages instead.",
    tone: "positive",
    category: "commons",
    check: (s, t, h) => (h.turnsAtCoopShare || 0) >= 5,
  },
  developmental_state: {
    name: "Developmental State",
    description: "Capability score 200+ with tax 20%+ sustained for 5 turns",
    realWorld: "Like South Korea or Taiwan in the 70s-80s — strong state directs investment, high taxes fund infrastructure, complexity grows.",
    tone: "positive",
    category: "capability",
    check: (s, t, h) => (h.turnsAtDevelopmentalState || 0) >= 5,
  },
  resource_curse_avoided: {
    name: "Resource Curse Avoided",
    description: "Extractive share 40%+ but local sectors not crowded out for 5 turns",
    realWorld: "Like Norway's sovereign wealth approach — extracted oil revenue without letting Dutch disease destroy local industries.",
    tone: "positive",
    category: "resilience",
    check: (s, t, h) => (h.turnsAtNorway || 0) >= 5,
  },
  counter_cyclical: {
    name: "Counter-cyclical Sovereign",
    description: "Maintained full infrastructure funding through a complete recession phase",
    realWorld: "Like German economic policy — saved during peak, spent through downturn. Most economies cut public spending in recessions and decay.",
    tone: "positive",
    category: "resilience",
    check: (s, t, h) => !!h.survivedRecessionFullyFunded,
  },
  industrial_upgrade: {
    name: "Industrial Upgrading",
    description: "A sector hit maturity 60+ and you successfully transitioned labor to its modernized form",
    realWorld: "Like South Korea moving from textiles to electronics to semiconductors — climbing the complexity ladder rather than getting stuck.",
    tone: "positive",
    category: "capability",
    check: (s, t, h) => !!h.completedModernization,
  },
  polycrisis_resilience: {
    name: "Polycrisis Resilience",
    description: "Survived 2 shocks within 5 turns without health penalty or food crisis",
    realWorld: "Like Vietnam through 2020-2022: weathered COVID and supply chain shocks without collapse because public health was already strong.",
    tone: "positive",
    category: "resilience",
    check: (s, t, h) => !!h.polycrisisResilience,
  },
  premature_scaling: {
    name: "Premature Scaling",
    description: "Built infrastructure past your fiscal capacity. Maintenance shortfall triggered decay.",
    realWorld: "Like 1990s post-Soviet states — Brezhnev-era infrastructure couldn't be maintained on a smaller economy. Schools, hospitals, roads decayed.",
    tone: "cautionary",
    category: "pathology",
    check: (s, t, h) => !!h.prematureScalingDecay,
  },
  austerity_trap: {
    name: "Austerity Trap",
    description: "Cut taxes; lost an infrastructure level within 4 turns.",
    realWorld: "Like UK austerity 2010-2019 — tax cuts caused gradual hollowing of NHS, schools, councils. Decay invisible until things broke.",
    tone: "cautionary",
    category: "pathology",
    check: (s, t, h) => !!h.austerityTrap,
  },
  brain_drain: {
    name: "Brain Drain",
    description: "Rural share below 30% caused skilled workforce decline for 5 turns",
    realWorld: "Like rural America 2000-2020 or Eastern Europe post-EU accession — countryside depopulated, training infrastructure withered.",
    tone: "cautionary",
    category: "pathology",
    check: (s, t, h) => (h.turnsRuralDrained || 0) >= 5,
  },
  housing_crisis: {
    name: "Housing Crisis",
    description: "Urban share above 70% for 5 turns; service-sector productivity penalty active",
    realWorld: "Like San Francisco, London, Tokyo — productivity gains eaten by rent. Service workers can't afford to live where the jobs are.",
    tone: "cautionary",
    category: "pathology",
    check: (s, t, h) => (h.turnsHousingCrisis || 0) >= 5,
  },
  capital_flight: {
    name: "Capital Flight",
    description: "Foreign investment cut by 30%+ for 3 turns due to social contract divergence",
    realWorld: "Like Chavez-era Venezuela or Allende's Chile — investors fled when policy lurched left. The political risk premium became infinite.",
    tone: "cautionary",
    category: "pathology",
    check: (s, t, h) => (h.turnsCapitalFlight || 0) >= 3,
  },
};

const FAILURE_MODES = {
  capability_trap: {
    name: "Capability Trap",
    description: "You built skilled workers but never gave them R&D infrastructure. They emigrate to places that will use their skills.",
    check: (s, d) => {
      // Only fires if capability path is revealed (player is trying to follow it)
      // AND has lots of skilled workers AND has very low R&D
      if (!s.revealedPaths.includes("capability")) return false;
      const sk = (s.workforce[2] + s.workforce[3]) / s.population;
      return sk > 0.30 && s.vowels.rd < 2 && s.turn > 14;
    },
  },
  capital_flight: {
    name: "Capital Flight Cascade",
    description: "Outside owners pulled out. Extractive sectors collapsed.",
    check: (s, d) => {
      const extCap = (s.capacity.mining || 1) + (s.capacity.tourism || 1);
      return s.wageBargain > 0.80 && extCap < 1.3 && s.turn > 10 &&
        ((s.allocation.mining || 0) + (s.allocation.tourism || 0) > 0.20);
    },
  },
  rural_collapse: {
    name: "Rural Collapse",
    description: "Workers fled to the city faster than food production could be replaced. Hunger followed.",
    check: (s, d) => s.urbanShare > 0.78 && s.turn > 10 && d.totalValue < 35,
  },
  urban_overcrowding: {
    name: "Urban Overcrowding",
    description: "Too many people, too little infrastructure. The city consumed itself.",
    check: (s, d) => s.urbanShare > 0.85 && s.vowels.health < 3 && s.turn > 12,
  },
  brittleness: {
    name: "Systemic Brittleness",
    description: "Three shocks in a row found you with no buffer.",
    check: (s, d) => s.shockCount >= 3 && d.totalValue < 25,
  },
  famine: {
    name: "Famine",
    description: "Food shortfalls went uncovered for too many turns. The workforce became too sick to function.",
    check: (s, d) => s.healthPenalty >= 0.8 && s.foodShortfallStreak >= 3,
  },
};

// ============ URBAN/RURAL ============
function computeUrbanShare(allocation, activeSectors) {
  // Each sector contributes its urbanPull * its allocation
  let total = 0, weight = 0;
  for (const s of activeSectors) {
    const a = allocation[s] || 0;
    total += (SECTORS[s].urbanPull || 0) * a;
    weight += a;
  }
  if (weight === 0) return 0.5;
  // Map from [-1, 1] urbanPull to [0, 1] urbanShare, starting at 0.4 (mostly rural)
  const avgPull = total / weight;
  return Math.max(0.1, Math.min(0.95, 0.5 + avgPull * 0.45));
}

const initialState = (biomeKey) => {
  const biome = BIOMES[biomeKey];
  const alloc = { crops: 0, tourism: 0, mining: 0, services: 0, manufacturing: 0, agritech: 0, cooperatives: 0, specialized: 0, finance: 0, ecotourism: 0, research: 0, regenerative: 0 };
  for (const k in biome.startAllocation) alloc[k] = biome.startAllocation[k];

  return {
    biome: biomeKey,
    turn: 0,
    treasury: biome.startTreasury,
    population: 100,
    workforce: [...biome.startWorkforce],
    vowels: { roads: 1, port: biomeKey === "island" ? 1 : 0, schools: 1, health: 1, rd: 0, ruleOfLaw: 1 },
    allocation: alloc,
    prevAllocation: { ...alloc },
    transitionState: {}, // sectorKey -> { turnsRemaining, severity (0-1 fraction of labor that's still transitioning) }
    foodShortfallStreak: 0,
    socialContract: 0, // -1 (commons) to +1 (market). Drifts with policy. Diverge from your play at your peril.
    cyclePhase: 0, // 0-5: Recovery(0,1), Expansion(2,3), Peak(4), Recession(5)
    sectorMaturity: {}, // sectorKey -> 0-100 maturity. 60+ slows growth, 80+ decays unless modernized.
    maintenanceArrears: {}, // vowelKey -> turns of underfunded maintenance. 3+ causes level drop.
    achievements: [], // earned achievement ids
    achievementHistory: {}, // accumulator: turnsAtCoopShare, turnsAtDevelopmentalState, etc.
    firstMilestone: null, // "capability" | "commons" | "market" — first milestone reached. Triggers configuration lock.
    lastTaxRate: 0.15, // for detecting tax cuts
    recentDecay: 0, // turns since last decay event (for austerity_trap detection)
    healthPenalty: 0, // 0-1, accumulating from food shortfalls
    wageBargain: 0.5,
    taxRate: 0.15,
    rebalancingInvest: 0, // 0-1, dampens urban/rural drift
    urbanShare: 0.4, // starts mostly rural
    unlocked: {},
    capacity: { crops: 1.0, tourism: 1.0, mining: 1.0, services: 1.0 },
    revealedPaths: [],
    cumOwnerTake: 0,
    milestones: { capability: false, commons: false, market: false },
    activeShock: null,
    shockTurnsLeft: 0,
    shockCount: 0,
    nextShockTurn: 8 + Math.floor(Math.random() * 4),
    gameOver: null,
    log: [`Turn 0. ${biome.name}. ${biome.character}`],
    debugLog: [`=== GAME START ===`, `Biome: ${biome.name} (${biomeKey})`, `Initial treasury: ${biome.startTreasury}`, `Initial workforce: ${biome.startWorkforce.join(", ")}`, `Initial allocation: ${JSON.stringify(biome.startAllocation)}`, ``],
  };
};

function vowelsSatisfied(sector, vowels) {
  const req = SECTORS[sector].requires;
  let ratio = 1;
  for (const k in req) {
    const effLevel = effectiveVowelLevel(k, vowels);
    const eff = vowelEffective(effLevel);
    if (eff < req[k]) ratio = Math.min(ratio, eff / req[k]);
  }
  return ratio;
}
function bindingVowel(sector, vowels) {
  const req = SECTORS[sector].requires;
  let worst = null, worstRatio = 1;
  for (const k in req) {
    const effLevel = effectiveVowelLevel(k, vowels);
    const eff = vowelEffective(effLevel);
    const r = eff / req[k];
    if (r < worstRatio) { worstRatio = r; worst = k; }
  }
  return worst;
}

function laborShareDynamics(sector, wageBargain, marketActive, commonsActive) {
  const sect = SECTORS[sector];
  const targetShare = sect.wageFloor + (sect.wageCeiling - sect.wageFloor) * wageBargain;
  let inv;
  if (wageBargain < 0.2) inv = 0.98;
  else if (wageBargain < 0.45) inv = 1.04;
  else if (wageBargain < 0.65) inv = 1.06;
  else if (wageBargain < 0.85) inv = 1.01;
  else inv = 0.94;
  if (sect.ownerType === "outside" && wageBargain > 0.75) inv -= 0.06;
  if (sect.ownerType === "worker") inv = Math.max(inv, 1.03);
  // Market path bonus
  if (marketActive && sect.ownerType === "outside" && wageBargain < 0.40) {
    inv += 0.04;
  }
  // Commons path bonus: worker-owned and local sectors compound when wages are healthy
  if (commonsActive && (sect.ownerType === "worker" || sect.ownerType === "local") && wageBargain >= 0.55) {
    inv += 0.04;
  }
  const informal = Math.max(0, (wageBargain - 0.82) * 2);
  return { targetShare, investmentMultiplier: inv, informalRisk: informal };
}

function computeTurn(state, _isNested) {
  const { workforce, vowels, allocation, prevAllocation, transitionState, wageBargain, taxRate: rawTaxRate, unlocked, capacity, activeShock, biome, healthPenalty } = state;

  // === CONFIGURATION LOCKS ===
  // After your first milestone, the institutional commitments are real. You can't unwind them
  // without massive cost. Reflects real political economy: once Sweden became a welfare state
  // it couldn't become Singapore. Once Saudi Arabia became an oil rentier it couldn't pivot.
  const firstMilestone = state.firstMilestone;
  // Capability lock: tax floor (you committed to a developmental state's tax base)
  const taxFloor = firstMilestone === "capability" ? 0.18 : 0;
  const taxRate = Math.max(rawTaxRate, taxFloor);
  const taxLocked = taxRate > rawTaxRate;
  // Commons lock: wage floor (workers have organized; you can't push their share down)
  const wageFloor = firstMilestone === "commons" ? 0.45 : 0;
  // Market lock: commons cap and worker-sector penalty applied later
  const biomeData = BIOMES[biome];
  const marketActive = state.revealedPaths && state.revealedPaths.includes("market");
  const commonsActive = state.revealedPaths && state.revealedPaths.includes("commons");
  const totalLabor = workforce.reduce((a, b) => a + b, 0);
  const sectorResults = {};
  let totalValue = 0, totalWages = 0, totalOwnerTake = 0;

  const activeSectors = Object.keys(SECTORS).filter(s => (!SECTORS[s].locked || unlocked[s]) && biomeData.sectorAvailable[s] !== false);

  const laborBySector = {};
  let allocSum = 0;
  for (const s of activeSectors) allocSum += allocation[s] || 0;
  if (allocSum <= 0) allocSum = 1;
  for (const s of activeSectors) {
    laborBySector[s] = ((allocation[s] || 0) / allocSum) * totalLabor;
  }

  // Compute transition penalties: sectors that gained or lost labor in last turn
  // run at reduced productivity for 2-3 turns
  const transitionPenalties = {};
  for (const s of activeSectors) {
    const cur = allocation[s] || 0;
    const prev = (prevAllocation && prevAllocation[s]) || 0;
    const delta = Math.abs(cur - prev);
    // Active transition from prior turns
    const existing = transitionState && transitionState[s];
    let penalty = 0;
    if (existing && existing.turnsRemaining > 0) {
      // existing penalty still in effect — stays full strength while transition runs
      penalty = Math.max(penalty, existing.severity * 0.7);
    }
    // New transition this turn: triggers at smaller threshold (3%) and stronger severity
    if (delta > 0.03) {
      // severity scales with delta: 5% shift → 0.10, 15% → 0.40, 25% → 0.70 (max)
      const newSev = Math.min(0.70, (delta - 0.03) * 3.5);
      penalty = Math.max(penalty, newSev);
    }
    transitionPenalties[s] = penalty;
  }

  const newCapacity = { ...capacity };

  // === SECONDARY EFFECTS ===
  // Pre-compute extractive share for Dutch disease / resource curse
  const extractiveShare = (allocation.mining || 0) + (allocation.tourism || 0) + (allocation.finance || 0);
  // Dutch disease penalty for local-owned sectors when extractives dominate
  // 40% extractive = 0 penalty, 60% = 15% penalty, 80% = 30% penalty
  const dutchDiseasePenalty = Math.max(0, Math.min(0.30, (extractiveShare - 0.40) * 0.75));

  // Pre-compute local economy share for shock resilience
  // Each sector's allocation × whether it's local/worker owned
  let localAllocShare = 0;
  for (const s of activeSectors) {
    if (SECTORS[s].ownerType === "worker" || SECTORS[s].ownerType === "local") {
      localAllocShare += allocation[s] || 0;
    }
  }
  // Community absorption: high local share reduces shock severity for ALL sectors
  // 50% local share = 25% shock reduction; 80% = 40% reduction
  const communityAbsorption = Math.min(0.4, localAllocShare * 0.5);

  // === URBAN/RURAL IMBALANCE PENALTIES ===
  // Urban > 70%: housing crisis. Services & cooperatives lose margin (rent eats wages).
  // Rural < 30%: brain drain. Training rate reduced.
  const urbanPct = state.urbanShare;
  const housingCrisis = urbanPct > 0.70 ? Math.min(0.30, (urbanPct - 0.70) * 1.5) : 0;
  const ruralDrain = urbanPct < 0.30 ? Math.min(0.25, (0.30 - urbanPct) * 1.5) : 0;

  // === MACROECONOMIC CYCLE ===
  // Phase advances each turn. 6-turn cycle. Current phase determines capacity growth and inflow modifiers.
  const cyclePhase = (state.cyclePhase || 0);
  const currentPhase = CYCLE_PHASES[cyclePhase];
  const nextCyclePhase = (cyclePhase + 1) % 6;

  // Policy alignment with cycle: how well does current policy match the phase's needs?
  const taxAlignment = 1 - Math.min(1, Math.abs(state.taxRate - currentPhase.idealTax) * 4);
  const rebalAlignment = 1 - Math.min(1, Math.abs(state.rebalancingInvest - currentPhase.idealRebal) * 2);
  const cycleAlignment = (taxAlignment + rebalAlignment) / 2; // 0-1

  // === SECTOR LIFECYCLE ===
  // Track maturity per sector. Increases with cumulative production.
  // Maturity 0-60: emerging, no effect. 60-80: slowing growth. 80+: capacity decays unless modernized.
  const sectorMaturity = { ...(state.sectorMaturity || {}) };

  // === SOCIAL CONTRACT (computed pre-loop so worker exit penalty can apply) ===
  let policyStance = 0;
  if (state.taxRate <= 0.10) policyStance += 0.35;
  else if (state.taxRate >= 0.22) policyStance -= 0.35;
  if (state.wageBargain <= 0.40) policyStance += 0.30;
  else if (state.wageBargain >= 0.55) policyStance -= 0.30;
  if (extractiveShare >= 0.40) policyStance += 0.25;
  else if (localAllocShare >= 0.50) policyStance -= 0.20;
  policyStance = Math.max(-1, Math.min(1, policyStance));
  const currentContract = state.socialContract || 0;
  const contractDrift = (policyStance - currentContract) * 0.15;
  const newSocialContract = Math.max(-1, Math.min(1, currentContract + contractDrift));
  const divergence = policyStance - currentContract;

  let contractPenaltyDescription = null;
  let capitalFlight = 0;
  let workerExit = 0;
  // Commons-lock thresholds: easier to trigger capital flight, easier to trigger worker exit
  const commonsLocked = firstMilestone === "commons";
  if (currentContract <= -0.4 && policyStance >= (commonsLocked ? 0.2 : 0.3)) {
    workerExit = Math.min(0.30, Math.abs(divergence) * (commonsLocked ? 0.30 : 0.20));
    contractPenaltyDescription = commonsLocked 
      ? "Worker resistance (locked-in commons): solidaristic settlement actively resists market pivot"
      : "Worker resistance: established commons resists market pivot";
  } else if (currentContract >= 0.4 && policyStance <= -0.3) {
    capitalFlight = Math.min(0.6, Math.abs(divergence) * 0.4);
    contractPenaltyDescription = "Capital flight: investors withdrawing from solidaristic pivot";
  }

  // Food production (computed alongside value)
  let totalFoodProduced = 0;

  for (const s of activeSectors) {
    const sect = SECTORS[s];
    const labor = laborBySector[s];
    const vowelRatio = vowelsSatisfied(s, vowels);
    const avail = workforce[sect.hiresFrom] || 0;
    const prop = totalLabor > 0 ? avail / totalLabor : 0;
    const match = Math.min(1, prop / 0.15);
    const cap = capacity[s] !== undefined ? capacity[s] : 1.0;
    const biomeMult = biomeData.sectorMult[s] || 1;
    const isLocal = sect.ownerType === "worker" || sect.ownerType === "local";

    let shockMult = 1;
    if (activeShock && SHOCKS[activeShock].targets.includes(s)) {
      let severity = SHOCKS[activeShock].severity;
      // Community absorption applies to all sectors
      severity = severity * (1 - communityAbsorption);
      // Worker/local sectors get extra 30% shock resistance
      if (isLocal) severity = severity * 0.7;
      shockMult = 1 - severity;
    }

    // Transition penalty: productivity loss during rapid labor shifts
    const transitionPenalty = transitionPenalties[s] || 0;
    const transitionMult = 1 - transitionPenalty;

    // Health penalty from food insecurity (system-wide)
    const healthMult = 1 - (healthPenalty || 0) * 0.3;

    // Dutch disease: local sectors suffer when extractives dominate
    const dutchMult = isLocal ? (1 - dutchDiseasePenalty) : 1;

    // Housing crisis: urban-pull sectors lose margin
    const isUrbanPull = sect.urbanPull > 0.1;
    const housingMult = isUrbanPull ? (1 - housingCrisis) : 1;

    // Worker exit: when contract is solidaristic but you flip market, local workers walk out
    const workerExitMult = isLocal ? (1 - workerExit) : 1;

    // Sector lifecycle: maturity penalty
    const maturity = sectorMaturity[s] || 0;
    let maturityMult = 1;
    if (maturity >= 80) {
      // Past peak: capacity decays each turn (5%) unless reallocated
      maturityMult = Math.max(0.6, 1 - (maturity - 80) * 0.02);
    } else if (maturity >= 60) {
      // Slowing
      maturityMult = 1 - (maturity - 60) * 0.005;
    }

    // Macroeconomic cycle: capacity grows or contracts based on phase
    // Phase capacity modifier applies to value through cap growth
    const cycleMult = currentPhase.capacityMod;

    const effValue = sect.baseValue * vowelRatio * (0.4 + 0.6 * match) * cap * shockMult * biomeMult * transitionMult * healthMult * dutchMult * housingMult * workerExitMult * maturityMult * cycleMult;
    const value = (labor / 10) * effValue;

    // Food production (also affected by shock and transition)
    const foodFromSector = (sect.foodYield || 0) * labor * shockMult * transitionMult * biomeMult * (capacity[s] || 1);
    totalFoodProduced += foodFromSector;

    const { targetShare: rawTargetShare, investmentMultiplier, informalRisk } = laborShareDynamics(s, wageBargain, marketActive, commonsActive);
    // Apply wage floor from commons lock
    const targetShare = Math.max(rawTargetShare, wageFloor);
    const formal = value * (1 - informalRisk);
    let wages = formal * targetShare;
    let owners = formal * (1 - targetShare);

    // Market lock: worker-owned sectors take a productivity penalty (capital concentration crowds them out)
    const isWorkerSector = sect.local && (s === "cooperatives" || s === "regenerative");
    if (firstMilestone === "market" && isWorkerSector) {
      wages = wages * 0.7;
      owners = owners * 0.7;
    }

    // Capacity update incorporates cycle alignment bonus/penalty
    const cycleAlignmentBonus = (cycleAlignment - 0.5) * 0.04; // up to +2% or -2%
    newCapacity[s] = Math.max(0.4, Math.min(2.5, cap * investmentMultiplier * (1 + cycleAlignmentBonus)));

    // Increment maturity proportional to labor (well-staffed sectors mature faster)
    const maturityGain = labor > 0 ? Math.min(5, labor / 8) : 0;
    sectorMaturity[s] = Math.min(100, (sectorMaturity[s] || 0) + maturityGain);

    sectorResults[s] = {
      labor, value: formal, wages, owners, vowelRatio,
      binding: vowelRatio < 1 ? bindingVowel(s, vowels) : null,
      wageShare: targetShare, capacity: cap, informalRisk,
      shocked: shockMult < 1, biomeMult,
      transitionPenalty,
      foodProduced: foodFromSector,
      maturity: sectorMaturity[s],
      maturityPenalty: 1 - maturityMult,
    };
    totalValue += formal;
    totalWages += wages;
    totalOwnerTake += owners;
  }

  // Food security: compute shortfall and import costs
  const foodNeed = biomeData.foodNeed;
  const foodShortfall = Math.max(0, foodNeed - totalFoodProduced);
  const foodSurplus = Math.max(0, totalFoodProduced - foodNeed);
  // Cost to import to cover shortfall
  const foodImportCost = foodShortfall * biomeData.importCostPerUnit;
  // If treasury can cover, do so. Else workforce health degrades.
  const treasuryCanCoverFood = state.treasury >= foodImportCost;

  const taxes = totalValue * taxRate;
  const netWages = totalWages * (1 - taxRate * 0.3);
  const netOwners = totalOwnerTake * (1 - taxRate * 0.7);

  // Training
  let newWorkforce = [...workforce];
  for (const s of activeSectors) {
    const sect = SECTORS[s];
    const labor = laborBySector[s];
    const tMult = (vowelEffective(vowels.schools) / 2) * (vowels.health > 0 ? 1 : 0.5) * (1 - ruralDrain);
    const trained = labor * sect.trainingRate * tMult;
    const from = sect.hiresFrom;
    const to = Math.min(3, from + 1);
    const actual = Math.min(trained, newWorkforce[from]);
    newWorkforce[from] -= actual;
    newWorkforce[to] += actual;
  }

  // Demographic refresh: each turn, some workers retire/leave (proportional to each rung)
  // and new unskilled workers enter. Keeps workforce from clumping at the top.
  const retirementRate = 0.04 + ruralDrain * 0.10; // base 4% turnover, doubles with rural drain
  const totalRetiring = newWorkforce.reduce((acc, w, i) => {
    // Higher rungs retire faster (longer careers ending, plus brain drain pressure)
    const rate = retirementRate * (1 + i * 0.3);
    return acc + w * rate;
  }, 0);
  newWorkforce = newWorkforce.map((w, i) => {
    const rate = retirementRate * (1 + i * 0.3);
    return w * (1 - rate);
  });
  // New entrants arrive as unskilled
  newWorkforce[0] += totalRetiring;
  newWorkforce = newWorkforce.map(x => Math.max(0, x));

  // Urban/rural pull
  const targetUrban = computeUrbanShare(allocation, activeSectors);
  // Drift toward target, dampened by rebalancing investment
  const drift = (targetUrban - state.urbanShare) * (0.25 * (1 - state.rebalancingInvest * 0.7));
  const newUrbanShare = Math.max(0.1, Math.min(0.95, state.urbanShare + drift));

  // Rebalancing cost (drained from treasury during advance)
  const rebalancingCost = state.rebalancingInvest * 8; // up to 8 treasury/turn

  // Path metrics
  const complexityScore = Object.entries(sectorResults).reduce(
    (acc, [s, r]) => acc + SECTORS[s].complexity * r.labor, 0
  );
  const wageObs = [];
  for (const s in sectorResults) {
    const r = sectorResults[s];
    if (r.labor > 0) {
      const perW = r.wages / Math.max(r.labor, 1);
      for (let i = 0; i < Math.round(r.labor); i++) wageObs.push(perW);
    }
  }
  let gini = 0;
  if (wageObs.length > 1) {
    wageObs.sort((a, b) => a - b);
    const n = wageObs.length;
    const mean = wageObs.reduce((a, b) => a + b, 0) / n;
    if (mean > 0) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += (2 * (i + 1) - n - 1) * wageObs[i];
      gini = sum / (n * n * mean);
    }
  }
  const medianWelfare = wageObs.length > 0 ? wageObs[Math.floor(wageObs.length / 2)] * 10 : 0;
  // Floor welfare: average wage of bottom 50% of workers (Rawlsian "how are the worst off?")
  // This rewards lifting everyone, not just creating a few high-wage jobs
  const floorWelfare = wageObs.length > 0
    ? (wageObs.slice(0, Math.ceil(wageObs.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(wageObs.length / 2)) * 10
    : 0;
  // Calculate share of value from worker/local-owned sectors
  let localValue = 0, totalSectorValue = 0;
  for (const s in sectorResults) {
    const r = sectorResults[s];
    totalSectorValue += r.value;
    if (SECTORS[s].ownerType === "worker" || SECTORS[s].ownerType === "local") {
      localValue += r.value;
    }
  }
  const localOwnershipShare = totalSectorValue > 0 ? localValue / totalSectorValue : 0;

  // Commons composite: floor welfare × ownership × calibration
  // Sharper ownership curve: requires high local share for full credit
  const ownershipFactor = Math.pow(localOwnershipShare, 1.3); // less linear, sharper
  let welfareEquity = floorWelfare * (0.10 + 0.90 * ownershipFactor) * 6.0;
  // Market lock: commons is structurally capped — capital concentration too far advanced
  // to allow worker share to grow much further. Cap at current value + 5 over baseline 25.
  if (firstMilestone === "market") {
    welfareEquity = Math.min(welfareEquity, 30);
  }
  const accumulatedCapital = state.treasury + state.cumOwnerTake + netOwners;

  // Unlock checks
  const sk = (newWorkforce[2] + newWorkforce[3]) / state.population;
  const sp = newWorkforce[3] / state.population;
  const unlockChecks = {};
  for (const s in SECTORS) {
    if (!SECTORS[s].locked) continue;
    if (biomeData.sectorAvailable[s] === false) continue;
    if (state.unlocked[s]) { unlockChecks[s] = { alreadyUnlocked: true }; continue; }
    const reqs = SECTORS[s].unlockReqs;
    const checks = [];
    if (reqs.skilledShare) checks.push({ label: `Skilled ≥ ${(reqs.skilledShare * 100).toFixed(0)}%`, current: `${(sk * 100).toFixed(0)}%`, ok: sk >= reqs.skilledShare });
    if (reqs.specialistShare) checks.push({ label: `Specialists ≥ ${(reqs.specialistShare * 100).toFixed(0)}%`, current: `${(sp * 100).toFixed(0)}%`, ok: sp >= reqs.specialistShare });
    if (reqs.wageBargain) checks.push({ label: `Wage bargain ≥ ${(reqs.wageBargain * 100).toFixed(0)}%`, current: `${(state.wageBargain * 100).toFixed(0)}%`, ok: state.wageBargain >= reqs.wageBargain });
    if (reqs.sectorActive) {
      const isAvail = biomeData.sectorAvailable[reqs.sectorActive] !== false;
      const active = isAvail && (state.allocation[reqs.sectorActive] || 0) > 0.05 && (state.unlocked[reqs.sectorActive] || !SECTORS[reqs.sectorActive].locked);
      checks.push({ label: `${SECTORS[reqs.sectorActive].name} active`, current: active ? "yes" : "no", ok: active });
    }
    if (reqs.treasury) checks.push({ label: `Treasury ≥ ${reqs.treasury}`, current: `${state.treasury.toFixed(0)}`, ok: state.treasury >= reqs.treasury });
    if (reqs.vowels) for (const v in reqs.vowels) checks.push({ label: `${VOWELS[v].name} ≥ ${reqs.vowels[v]}`, current: `${state.vowels[v]}`, ok: state.vowels[v] >= reqs.vowels[v] });
    const ready = checks.every(c => c.ok);
    unlockChecks[s] = { ready, checks, tier: SECTORS[s].tier };
  }

  // Compute health penalty change based on food security AND health infrastructure
  let newHealthPenalty = healthPenalty || 0;
  let newFoodShortfallStreak = state.foodShortfallStreak || 0;
  // Health infrastructure determines recovery capacity
  // Health 1: no recovery from imports alone, need surplus
  // Health 2: 0.05 recovery per turn if imports cover
  // Health 3+: 0.10 recovery per turn if imports cover, plus extra protection against new penalty
  const healthRecoveryRate = state.vowels.health >= 3 ? 0.10 : state.vowels.health >= 2 ? 0.05 : 0;
  const healthProtection = state.vowels.health >= 3 ? 0.5 : state.vowels.health >= 2 ? 0.25 : 0;

  if (foodShortfall > 0 && !treasuryCanCoverFood) {
    // Uncovered shortfall: penalty rises (mitigated by health)
    newHealthPenalty = Math.min(0.9, newHealthPenalty + 0.15 * (1 - healthProtection));
    newFoodShortfallStreak += 1;
  } else if (foodShortfall > 0 && treasuryCanCoverFood) {
    // Imports cover food. With health 2+, partial recovery. With health 1, holds steady.
    newHealthPenalty = Math.max(0, newHealthPenalty - healthRecoveryRate);
    newFoodShortfallStreak = 0;
  } else {
    // Surplus or exact match: health recovers at base rate plus health bonus
    newHealthPenalty = Math.max(0, newHealthPenalty - (0.10 + healthRecoveryRate));
    newFoodShortfallStreak = 0;
  }

  // Treasury impact from food imports
  const actualFoodCost = treasuryCanCoverFood ? foodImportCost : Math.min(state.treasury, foodImportCost);

  // Investor interest: continuous 0-1 meter (not gated by market path)
  // Drivers: rule of law, port infrastructure, low taxes, low wages
  // This shows from turn 1 so players can see WHY they might lower taxes
  const ruleOfLawComponent = Math.min(1, state.vowels.ruleOfLaw / 4) * 0.35;
  const portComponent = Math.min(1, state.vowels.port / 3) * 0.15;
  const lowTaxBonus = Math.max(0, (0.15 - state.taxRate) / 0.15) * 0.30;
  const lowWageBonus = Math.max(0, (0.45 - state.wageBargain) / 0.45) * 0.20;
  const rawInvestorInterest = Math.min(1, ruleOfLawComponent + portComponent + lowTaxBonus + lowWageBonus);
  // Capability lock: foreign capital sees you as expensive. Interest capped at 0.6.
  const investorInterest = firstMilestone === "capability" ? Math.min(0.6, rawInvestorInterest) : rawInvestorInterest;

  // Actual capital inflow scales with interest AND extractive opportunities
  // Even pre-market-path, some interest creates small flows (teaser)
  const interestScalar = marketActive ? 1.0 : 0.4; // market path activates full flow
  const marketInflow = investorInterest * extractiveShare * 18 * interestScalar * currentPhase.inflowMod;

  // Commons path: smaller development-aid-style inflow tied to health + schools
  let commonsInflow = 0;
  if (commonsActive) {
    const localValueShare = totalSectorValue > 0 ? localValue / totalSectorValue : 0;
    commonsInflow = ((state.vowels.health + state.vowels.schools) * 0.5) * localValueShare * 2;
  }
  const totalInflow = marketInflow + commonsInflow;

  // Apply capital flight to inflows
  const adjustedMarketInflow = marketInflow * (1 - capitalFlight);
  const adjustedTotalInflow = adjustedMarketInflow + commonsInflow;

  // === MAINTENANCE ===
  // Each turn, infrastructure requires upkeep. Treasury pays first available funds.
  // Underfunded vowels accumulate arrears. 3+ turns of arrears triggers level drop.
  const maintenanceCosts = {};
  let totalMaintenanceCost = 0;
  for (const k in state.vowels) {
    const cost = vowelMaintenance(k, state.vowels[k], state.biome);
    maintenanceCosts[k] = cost;
    totalMaintenanceCost += cost;
  }

  // Available treasury for maintenance (after other costs but before maintenance)
  const treasuryAfterCosts = state.treasury + taxes - rebalancingCost - actualFoodCost + adjustedTotalInflow;
  const maintenancePaid = Math.min(totalMaintenanceCost, Math.max(0, treasuryAfterCosts));
  const maintenanceShortfall = totalMaintenanceCost - maintenancePaid;

  // Track which vowels are underfunded. Prioritize maintenance from cheapest to expensive
  // (you fund what you can; high-level infrastructure suffers first under austerity)
  const sortedKeys = Object.keys(maintenanceCosts).sort((a, b) => maintenanceCosts[a] - maintenanceCosts[b]);
  let remaining = maintenancePaid;
  const fundedVowels = {};
  for (const k of sortedKeys) {
    if (remaining >= maintenanceCosts[k]) {
      fundedVowels[k] = true;
      remaining -= maintenanceCosts[k];
    } else {
      fundedVowels[k] = false;
    }
  }

  // Update arrears and apply level drops
  const newMaintenanceArrears = { ...(state.maintenanceArrears || {}) };
  const newVowels = { ...state.vowels };
  const decayedVowels = [];
  for (const k in state.vowels) {
    if (maintenanceCosts[k] === 0) {
      newMaintenanceArrears[k] = 0;
      continue;
    }
    if (fundedVowels[k]) {
      // Funded — clear arrears
      newMaintenanceArrears[k] = Math.max(0, (newMaintenanceArrears[k] || 0) - 1);
    } else {
      // Underfunded — add an arrears tick
      newMaintenanceArrears[k] = (newMaintenanceArrears[k] || 0) + 1;
      if (newMaintenanceArrears[k] >= 3 && newVowels[k] > 1) {
        newVowels[k] = newVowels[k] - 1;
        newMaintenanceArrears[k] = 0;
        decayedVowels.push(k);
      }
    }
  }

  // === MARGINAL CONTRIBUTIONS ===
  // For each major lever, compute what it's actually contributing vs a counterfactual baseline.
  // This makes the game readable: every lever shows its current effect in tangible numbers.
  let marginalContributions = null;
  if (!_isNested) {
    marginalContributions = {};

    // Tax rate: contribution to treasury
    const taxAt0 = computeTurn({ ...state, taxRate: 0 }, true);
    marginalContributions.taxRate = {
      label: `+${taxes.toFixed(0)} treasury/turn from ${(state.taxRate * 100).toFixed(0)}% tax`,
      delta: { treasury: taxes, value: totalValue - taxAt0.totalValue },
    };

    // Wage bargain: contribution to wages, owner take, and total value via investment
    const wageAt50 = computeTurn({ ...state, wageBargain: 0.5 }, true);
    const wageValueDelta = totalValue - wageAt50.totalValue;
    const wageWageDelta = netWages - wageAt50.netWages;
    const wageMedianDelta = medianWelfare - wageAt50.medianWelfare;
    marginalContributions.wageBargain = {
      label: state.wageBargain > 0.5
        ? `+${wageWageDelta.toFixed(0)} wages, ${wageValueDelta > 0 ? "+" : ""}${wageValueDelta.toFixed(0)} total value vs neutral baseline`
        : state.wageBargain < 0.5
        ? `${wageWageDelta.toFixed(0)} wages, ${wageValueDelta > 0 ? "+" : ""}${wageValueDelta.toFixed(0)} total value vs neutral baseline`
        : `Neutral wage setting (50%)`,
      delta: { wages: wageWageDelta, value: wageValueDelta, medianWelfare: wageMedianDelta },
    };

    // Rebalancing investment: actual effect on urban share drift
    const rebalAt0 = computeTurn({ ...state, rebalancingInvest: 0 }, true);
    const urbanDriftFromRebal = rebalAt0.newUrbanShare - newUrbanShare;
    marginalContributions.rebalancing = {
      label: state.rebalancingInvest > 0.05
        ? `Slows urban drift by ${(urbanDriftFromRebal * 100).toFixed(1)}%/turn (cost ${rebalancingCost.toFixed(0)} treasury)`
        : `No rebalancing investment`,
      delta: { urbanDrift: urbanDriftFromRebal, treasury: -rebalancingCost },
    };

    // Each vowel level: contribution to total value through sector multipliers
    // Compare current to "what if this vowel was at level 1?" (its minimum)
    marginalContributions.vowels = {};
    for (const k of Object.keys(state.vowels)) {
      if (state.vowels[k] <= 1) continue;
      const droppedVowels = { ...state.vowels, [k]: 1 };
      const dropResult = computeTurn({ ...state, vowels: droppedVowels }, true);
      const valueLoss = totalValue - dropResult.totalValue;
      // Also compute drop-by-1 for the "if I dropped just one level" case
      const dropOneVowels = { ...state.vowels, [k]: state.vowels[k] - 1 };
      const dropOneResult = computeTurn({ ...state, vowels: dropOneVowels }, true);
      const valueLossOne = totalValue - dropOneResult.totalValue;
      const maintSavedOne = vowelMaintenance(k, state.vowels[k], state.biome) - vowelMaintenance(k, state.vowels[k] - 1, state.biome);
      marginalContributions.vowels[k] = {
        valueLoss: Math.max(0, valueLoss),
        valueLossOne: Math.max(0, valueLossOne),
        maintenanceSaved: maintSavedOne,
      };
    }
  }

  return {
    sectorResults, totalValue, netWages, netOwners, taxes,
    newWorkforce, newTreasury: state.treasury + taxes - rebalancingCost - actualFoodCost + adjustedTotalInflow - maintenancePaid,
    newCapacity, unlockChecks,
    complexityScore, gini, medianWelfare, welfareEquity, accumulatedCapital,
    activeSectors, newUrbanShare, targetUrban, rebalancingCost,
    foodProduced: totalFoodProduced, foodNeed, foodShortfall, foodSurplus,
    foodImportCost, treasuryCanCoverFood, actualFoodCost,
    newHealthPenalty, newFoodShortfallStreak,
    transitionPenalties,
    extractiveShare, dutchDiseasePenalty, communityAbsorption, localAllocShare,
    housingCrisis, ruralDrain,
    marketInflow: adjustedMarketInflow, commonsInflow, totalInflow: adjustedTotalInflow,
    investorInterest, ruleOfLawComponent, portComponent, lowTaxBonus, lowWageBonus,
    policyStance, newSocialContract, divergence, contractPenaltyDescription, capitalFlight, workerExit,
    cyclePhase, nextCyclePhase, currentPhase, cycleAlignment, taxAlignment, rebalAlignment, sectorMaturity,
    maintenanceCosts, totalMaintenanceCost, maintenancePaid, maintenanceShortfall,
    fundedVowels, newMaintenanceArrears, newVowels, decayedVowels,
    marginalContributions,
  };
}

// ============ COMPONENT ============
export default function CommunitySim() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("sectors");
  const [showLearn, setShowLearn] = useState(false);
  const [reflection, setReflection] = useState("");
  const [reveal, setReveal] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [expandedPath, setExpandedPath] = useState(null);
  const [showInvestorWhy, setShowInvestorWhy] = useState(false);

  const turnPreview = useMemo(() => state ? computeTurn(state) : null, [state]);

  useEffect(() => {
    if (!state || state.gameOver) return;
    for (const pk in PATHS) {
      if (!state.revealedPaths.includes(pk) && PATHS[pk].isTriggered(state)) {
        setState(s => ({
          ...s,
          revealedPaths: [...s.revealedPaths, pk],
          log: [`PATH REVEALED: ${PATHS[pk].name}.`, ...s.log].slice(0, 7),
          debugLog: [...(s.debugLog || []), `*** PATH REVEALED at turn ${s.turn}: ${PATHS[pk].name} (${pk}) ***`],
        }));
        setReveal({ type: "path", payload: pk });
        break;
      }
    }
  }, [state?.wageBargain, state?.taxRate, state?.vowels, state?.allocation]);

  // Biome selection screen
  if (!state) {
    return (
      <div style={S.page}>
        <BiomeSelect onSelect={(k) => setState(initialState(k))} />
      </div>
    );
  }

  const biomeData = BIOMES[state.biome];

  const setAlloc = (sector, newVal) => {
    setState(s => {
      const biome = BIOMES[s.biome];
      const active = Object.keys(SECTORS).filter(k => (!SECTORS[k].locked || s.unlocked[k]) && biome.sectorAvailable[k] !== false);
      const others = active.filter(k => k !== sector);
      const newAlloc = { ...s.allocation };
      newVal = Math.max(0, Math.min(1, newVal));
      newAlloc[sector] = newVal;
      const othersSum = others.reduce((a, k) => a + (s.allocation[k] || 0), 0);
      const remaining = 1 - newVal;
      if (othersSum > 0) {
        const scale = remaining / othersSum;
        for (const k of others) newAlloc[k] = (s.allocation[k] || 0) * scale;
      } else if (remaining > 0 && others.length > 0) {
        const each = remaining / others.length;
        for (const k of others) newAlloc[k] = each;
      }
      return { ...s, allocation: newAlloc };
    });
  };

  const buyVowel = (key) => {
    const cost = vowelCost(key, state.vowels[key], state.biome);
    if (state.treasury < cost) {
      setState(s => ({ ...s, log: [`Not enough treasury for ${VOWELS[key].name}. Need ${cost}.`, ...s.log].slice(0, 7) }));
      return;
    }
    setState(s => ({
      ...s,
      treasury: s.treasury - cost,
      vowels: { ...s.vowels, [key]: s.vowels[key] + 1 },
      log: [`Built ${VOWELS[key].name} (lvl ${s.vowels[key] + 1}). Cost ${cost}.`, ...s.log].slice(0, 7),
      debugLog: [...(s.debugLog || []), `BUILD at turn ${s.turn}: ${VOWELS[key].name} → lvl ${s.vowels[key] + 1} (cost ${cost})`],
    }));
  };

  const tryUnlock = (sectorKey) => {
    const check = turnPreview.unlockChecks[sectorKey];
    if (!check || !check.ready) return;
    setState(s => ({
      ...s,
      unlocked: { ...s.unlocked, [sectorKey]: true },
      capacity: { ...s.capacity, [sectorKey]: 1.0 },
      log: [`UNLOCKED: ${SECTORS[sectorKey].name}.`, ...s.log].slice(0, 7),
      debugLog: [...(s.debugLog || []), `*** UNLOCKED at turn ${s.turn}: ${SECTORS[sectorKey].name} (${sectorKey}, tier ${SECTORS[sectorKey].tier}) ***`],
    }));
    setReveal({ type: "unlock", payload: sectorKey });
  };

  const advanceTurn = () => {
    const t = turnPreview;
    setState(s => {
      let newLog = [...s.log];
      const turnEvents = [];
      const turnNum = s.turn + 1;
      let newShock = s.activeShock;
      let shockTurnsLeft = s.shockTurnsLeft;
      let shockCount = s.shockCount;
      let nextShockTurn = s.nextShockTurn;

      if (newShock && shockTurnsLeft > 0) {
        shockTurnsLeft -= 1;
        if (shockTurnsLeft === 0) {
          newLog.unshift(`Shock ended: ${SHOCKS[newShock].name}.`);
          turnEvents.push(`Shock ended: ${SHOCKS[newShock].name}`);
          newShock = null;
        }
      }

      // No new shocks in the final 2 turns (shock duration is 2, would never resolve)
      if (!newShock && turnNum >= nextShockTurn && turnNum < MAX_TURNS - 1) {
        const biome = BIOMES[s.biome];
        // Pick a shock weighted by biome bias and what's active
        const candidates = [];
        for (const sk in SHOCKS) {
          const hasTarget = SHOCKS[sk].targets.some(t => (s.allocation[t] || 0) > 0.05);
          if (!hasTarget) continue;
          // Urban unrest triggers only if urban share is high
          if (sk === "urban_unrest" && s.urbanShare < 0.65) continue;
          const bias = (biome.shockBias[sk] !== undefined ? biome.shockBias[sk] : 1);
          if (bias <= 0) continue;
          for (let i = 0; i < bias * 10; i++) candidates.push(sk);
        }
        if (candidates.length > 0) {
          newShock = candidates[Math.floor(Math.random() * candidates.length)];
          shockTurnsLeft = 2;
          shockCount += 1;
          nextShockTurn = turnNum + 6 + Math.floor(Math.random() * 5);
          newLog.unshift(`SHOCK: ${SHOCKS[newShock].name}.`);
          turnEvents.push(`SHOCK TRIGGERED: ${SHOCKS[newShock].name} (severity ${SHOCKS[newShock].severity}, 2 turns)`);
          setReveal({ type: "shock", payload: newShock });
        } else {
          nextShockTurn = turnNum + 3;
        }
      }

      const newCumOwnerTake = s.cumOwnerTake + t.netOwners;

      // Milestones
      const newMilestones = { ...s.milestones };
      let mFired = null;
      if (s.revealedPaths.includes("capability") && !newMilestones.capability) {
        const hasT2 = Object.keys(s.unlocked).some(k => SECTORS[k]?.tier === 2);
        if (hasT2 && t.complexityScore >= 220) { newMilestones.capability = true; mFired = "capability"; }
      }
      if (s.revealedPaths.includes("commons") && !newMilestones.commons) {
        if (t.welfareEquity >= 50) { newMilestones.commons = true; mFired = "commons"; }
      }
      if (s.revealedPaths.includes("market") && !newMilestones.market) {
        if (t.accumulatedCapital >= 1500) { newMilestones.market = true; mFired = "market"; }
      }
      if (mFired) {
        newLog.unshift(`MILESTONE: ${PATHS[mFired].name}.`);
        turnEvents.push(`MILESTONE REACHED: ${PATHS[mFired].name}`);
        setReveal({ type: "milestone", payload: mFired });
      }

      newLog.unshift(`T${turnNum}: value ${t.totalValue.toFixed(0)} · wages ${t.netWages.toFixed(0)} · owners ${t.netOwners.toFixed(0)} · tax ${t.taxes.toFixed(0)}`);

      // Detailed debug log entry for this turn
      const debugEntry = [
        `--- TURN ${turnNum} ---`,
        `Value: ${t.totalValue.toFixed(1)} | Wages: ${t.netWages.toFixed(1)} | Owners: ${t.netOwners.toFixed(1)} | Tax: ${t.taxes.toFixed(1)}`,
        `Treasury: ${Math.max(0, t.newTreasury).toFixed(1)} (was ${s.treasury.toFixed(1)}) | Cum owner take: ${(s.cumOwnerTake + t.netOwners).toFixed(1)}`,
        `Food: produced ${t.foodProduced.toFixed(1)} / need ${t.foodNeed} | shortfall ${t.foodShortfall.toFixed(1)} | import cost ${t.actualFoodCost.toFixed(1)} | health penalty ${(t.newHealthPenalty * 100).toFixed(0)}%`,
        `Effects: extractive ${(t.extractiveShare * 100).toFixed(0)}% | dutch disease ${(t.dutchDiseasePenalty * 100).toFixed(0)}% on local sectors | community absorption ${(t.communityAbsorption * 100).toFixed(0)}% shock buffer | inflows market+${t.marketInflow.toFixed(1)} commons+${t.commonsInflow.toFixed(1)}`,
        `Cycle: ${t.currentPhase.name} (alignment ${(t.cycleAlignment * 100).toFixed(0)}%, capMod ${t.currentPhase.capacityMod}, inflowMod ${t.currentPhase.inflowMod}) | Contract: ${t.newSocialContract.toFixed(2)} (policy stance ${t.policyStance.toFixed(2)})`,
        `Maintenance: paid ${t.maintenancePaid.toFixed(1)}/${t.totalMaintenanceCost.toFixed(1)}${t.maintenanceShortfall > 0 ? ` SHORTFALL ${t.maintenanceShortfall.toFixed(1)}` : ""}${t.decayedVowels && t.decayedVowels.length > 0 ? ` DECAYED [${t.decayedVowels.join(",")}]` : ""}`,
        `Workforce: U${t.newWorkforce[0].toFixed(0)} | SS${t.newWorkforce[1].toFixed(0)} | S${t.newWorkforce[2].toFixed(0)} | Sp${t.newWorkforce[3].toFixed(0)}`,
        `Urban share: ${(t.newUrbanShare * 100).toFixed(0)}% (target ${(t.targetUrban * 100).toFixed(0)}%)`,
        `Levers: wageBargain ${(s.wageBargain * 100).toFixed(0)}% | tax ${(s.taxRate * 100).toFixed(0)}% | rebalancing ${(s.rebalancingInvest * 100).toFixed(0)}%`,
        `Vowels: roads ${s.vowels.roads} | port ${s.vowels.port} | schools ${s.vowels.schools} | health ${s.vowels.health} | rd ${s.vowels.rd} | rule ${s.vowels.ruleOfLaw}`,
        `Allocation: ${Object.entries(s.allocation).filter(([k, v]) => v > 0.005).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(" · ")}`,
        `Sector value: ${Object.entries(t.sectorResults).filter(([k, r]) => r.labor > 0.5).map(([k, r]) => `${k} ${r.value.toFixed(0)}${r.shocked ? "⚡" : ""}${r.binding ? "⚠" : ""}${r.transitionPenalty > 0.1 ? "🔄" : ""}`).join(" | ")}`,
        `Path scores: capability ${t.complexityScore.toFixed(0)}/220 | commons ${t.welfareEquity.toFixed(0)}/50 (G ${t.gini.toFixed(2)}, MW ${t.medianWelfare.toFixed(0)}) | market ${t.accumulatedCapital.toFixed(0)}/1500`,
        `Revealed: [${s.revealedPaths.join(", ") || "none"}] | Milestones: ${Object.entries(s.milestones).filter(([k, v]) => v).map(([k]) => k).join(", ") || "none"}`,
        s.activeShock ? `SHOCK ACTIVE: ${s.activeShock} (${s.shockTurnsLeft} turns left)` : null,
        ...turnEvents.map(e => `  → ${e}`),
      ].filter(Boolean).join("\n");

      // Update transition state: decrement existing, add new ones from this turn's shifts
      const newTransitionState = {};
      for (const sec in (s.transitionState || {})) {
        const e = s.transitionState[sec];
        if (e.turnsRemaining > 1) {
          // Slower decay: 80% retention per turn instead of 60%
          newTransitionState[sec] = { turnsRemaining: e.turnsRemaining - 1, severity: e.severity * 0.80 };
        }
      }
      // New transitions from rapid shifts this turn
      for (const sec in t.transitionPenalties) {
        const pen = t.transitionPenalties[sec];
        const curDelta = Math.abs((s.allocation[sec] || 0) - ((s.prevAllocation && s.prevAllocation[sec]) || 0));
        if (curDelta > 0.03) {
          // Now 3-turn transitions (was 2). Workforce takes longer to retrain.
          newTransitionState[sec] = { turnsRemaining: 3, severity: pen };
          turnEvents.push(`Labor transition in ${sec}: ${(curDelta * 100).toFixed(0)}% shift causes ${(pen * 100).toFixed(0)}% productivity loss for 3 turns`);
        }
      }

      // Food events
      if (t.foodShortfall > 0) {
        if (t.treasuryCanCoverFood) {
          turnEvents.push(`Food deficit ${t.foodShortfall.toFixed(1)} covered by imports (${t.actualFoodCost.toFixed(1)} treasury)`);
        } else {
          turnEvents.push(`FOOD CRISIS: shortfall ${t.foodShortfall.toFixed(1)}, treasury can't fully import. Health penalty rising.`);
        }
      }

      // Maintenance events
      if (t.maintenanceShortfall > 0) {
        turnEvents.push(`MAINTENANCE SHORTFALL: ${t.maintenanceShortfall.toFixed(1)}/${t.totalMaintenanceCost.toFixed(1)} treasury short. Infrastructure decaying.`);
      }
      if (t.decayedVowels && t.decayedVowels.length > 0) {
        for (const k of t.decayedVowels) {
          turnEvents.push(`INFRASTRUCTURE DECAY: ${VOWELS[k].name} dropped one level from neglect`);
        }
      }

      // First milestone tracking — triggers configuration lock
      let firstMilestoneTriggered = s.firstMilestone;
      if (!firstMilestoneTriggered && mFired) {
        firstMilestoneTriggered = mFired;
        const lockMessages = {
          capability: "Configuration lock: tax floor 18% (developmental state commitment). Investor interest capped at 60% (foreign capital sees you as expensive). Market path now requires breaking this institutional commitment.",
          commons: "Configuration lock: wage floor 45% (workers have organized). Capital flight triggers more easily. Market pivot requires breaking the social contract.",
          market: "Configuration lock: commons score capped at 30 (capital concentration too far advanced to unwind). Worker-owned sectors lose 30% productivity. The accumulation has political costs you cannot reverse.",
        };
        newLog.unshift(`POLITICAL ECONOMY LOCKED: ${lockMessages[mFired]}`);
        turnEvents.push(`CONFIGURATION LOCK: ${lockMessages[mFired]}`);
      }

      // Update achievement history accumulators
      const ah = { ...(s.achievementHistory || {}) };
      // Mondragón threshold
      if (t.localAllocShare >= 0.50) ah.turnsAtCoopShare = (ah.turnsAtCoopShare || 0) + 1;
      else ah.turnsAtCoopShare = 0;
      // Developmental state
      if (t.complexityScore >= 200 && s.taxRate >= 0.20) ah.turnsAtDevelopmentalState = (ah.turnsAtDevelopmentalState || 0) + 1;
      else ah.turnsAtDevelopmentalState = 0;
      // Norway pattern
      if (t.extractiveShare >= 0.40 && t.dutchDiseasePenalty < 0.05) ah.turnsAtNorway = (ah.turnsAtNorway || 0) + 1;
      else ah.turnsAtNorway = 0;
      // Counter-cyclical
      if (t.currentPhase.name === "Recession" && t.maintenanceShortfall === 0 && t.totalMaintenanceCost > 0) {
        ah.recessionFullyFundedTurns = (ah.recessionFullyFundedTurns || 0) + 1;
        if (ah.recessionFullyFundedTurns >= 1) ah.survivedRecessionFullyFunded = true;
      }
      // Industrial upgrade detection
      for (const sec in (t.sectorMaturity || {})) {
        if (t.sectorMaturity[sec] >= 60 && MODERNIZATION_CHAIN[sec]) {
          const target = MODERNIZATION_CHAIN[sec];
          // Did we reallocate labor to the modernized sector?
          if ((s.allocation[target] || 0) > 0.08) ah.completedModernization = true;
        }
      }
      // Polycrisis: 2 shocks within 5 turns
      if (newShock && !s.activeShock) {
        ah.shockTurns = [...(ah.shockTurns || []), turnNum];
      }
      if (ah.shockTurns && ah.shockTurns.length >= 2) {
        const recent = ah.shockTurns.filter(tt => turnNum - tt <= 5);
        if (recent.length >= 2 && t.newHealthPenalty < 0.05 && t.foodShortfall < 1) {
          ah.polycrisisResilience = true;
        }
      }
      // Pathologies
      if (t.decayedVowels && t.decayedVowels.length > 0) {
        ah.prematureScalingDecay = true;
        // Austerity trap: did we cut taxes recently?
        if ((s.lastTaxRate || 0.15) > s.taxRate + 0.05) {
          ah.austerityTrap = true;
        }
      }
      // Rural drain sustained
      if (t.ruralDrain > 0.05) ah.turnsRuralDrained = (ah.turnsRuralDrained || 0) + 1;
      else ah.turnsRuralDrained = 0;
      // Housing crisis sustained
      if (t.housingCrisis > 0.05) ah.turnsHousingCrisis = (ah.turnsHousingCrisis || 0) + 1;
      else ah.turnsHousingCrisis = 0;
      // Capital flight sustained
      if (t.capitalFlight > 0.30) ah.turnsCapitalFlight = (ah.turnsCapitalFlight || 0) + 1;
      else ah.turnsCapitalFlight = 0;

      // Check for newly earned achievements
      const newAchievements = [...(s.achievements || [])];
      const earnedThisTurn = [];
      for (const aid in ACHIEVEMENTS) {
        if (newAchievements.includes(aid)) continue;
        if (ACHIEVEMENTS[aid].check(s, t, ah)) {
          newAchievements.push(aid);
          earnedThisTurn.push(aid);
        }
      }
      for (const aid of earnedThisTurn) {
        const a = ACHIEVEMENTS[aid];
        newLog.unshift(`ACHIEVEMENT: ${a.name} — ${a.description}`);
        turnEvents.push(`ACHIEVEMENT EARNED: ${a.name}. ${a.realWorld}`);
      }

      const newState = {
        ...s,
        turn: turnNum,
        treasury: Math.max(0, t.newTreasury),
        workforce: t.newWorkforce.map(x => Math.round(x * 10) / 10),
        capacity: t.newCapacity,
        urbanShare: t.newUrbanShare,
        cumOwnerTake: newCumOwnerTake,
        activeShock: newShock, shockTurnsLeft, shockCount, nextShockTurn,
        milestones: newMilestones,
        prevAllocation: { ...s.allocation },
        transitionState: newTransitionState,
        healthPenalty: t.newHealthPenalty,
        socialContract: t.newSocialContract,
        cyclePhase: t.nextCyclePhase,
        sectorMaturity: t.sectorMaturity,
        vowels: t.newVowels,
        maintenanceArrears: t.newMaintenanceArrears,
        foodShortfallStreak: t.newFoodShortfallStreak,
        firstMilestone: firstMilestoneTriggered,
        achievements: newAchievements,
        achievementHistory: ah,
        lastTaxRate: s.taxRate,
        log: newLog.slice(0, 7),
        debugLog: [...(s.debugLog || []), debugEntry],
        newAchievementsThisTurn: earnedThisTurn,
      };

      // End of game at MAX_TURNS
      if (turnNum >= MAX_TURNS && !newState.gameOver) {
        const finalScores = {
          capability: { score: t.complexityScore, target: 220, hit: t.complexityScore >= 220 },
          commons: { score: t.welfareEquity, target: 50, hit: t.welfareEquity >= 50 },
          market: { score: t.accumulatedCapital, target: 1500, hit: t.accumulatedCapital >= 1500 },
        };
        newState.gameOver = { type: "complete", finalScores };
        newLog.unshift(`Final turn reached. The story is told.`);
        newState.log = newLog.slice(0, 7);
        const finalSummary = [
          ``,
          `=== GAME COMPLETE at turn ${turnNum} ===`,
          `Final path scores:`,
          `  Capability: ${finalScores.capability.score.toFixed(0)}/220 ${finalScores.capability.hit ? "✓ MILESTONE" : ""}`,
          `  Commons:    ${finalScores.commons.score.toFixed(0)}/50 ${finalScores.commons.hit ? "✓ MILESTONE" : ""}`,
          `  Market:     ${finalScores.market.score.toFixed(0)}/1500 ${finalScores.market.hit ? "✓ MILESTONE" : ""}`,
          `Unlocked sectors: ${Object.keys(newState.unlocked).join(", ") || "none"}`,
          `Total shocks survived: ${newState.shockCount}`,
          `Final treasury: ${newState.treasury.toFixed(0)} | Final value/turn: ${t.totalValue.toFixed(0)}`,
        ].join("\n");
        newState.debugLog = [...newState.debugLog, finalSummary];
        setReveal({ type: "complete", payload: finalScores });
      }

      const derived = { totalValue: t.totalValue };
      for (const fk in FAILURE_MODES) {
        if (FAILURE_MODES[fk].check(newState, derived)) {
          newState.gameOver = { type: "failure", mode: fk };
          newLog.unshift(`GAME OVER: ${FAILURE_MODES[fk].name}.`);
          newState.log = newLog.slice(0, 7);
          const failSummary = [
            ``,
            `=== GAME OVER at turn ${turnNum} ===`,
            `Failure: ${FAILURE_MODES[fk].name}`,
            `Cause: ${FAILURE_MODES[fk].description}`,
            `Path scores at end:`,
            `  Capability: ${t.complexityScore.toFixed(0)}/220`,
            `  Commons:    ${t.welfareEquity.toFixed(0)}/50`,
            `  Market:     ${t.accumulatedCapital.toFixed(0)}/1500`,
          ].join("\n");
          newState.debugLog = [...newState.debugLog, failSummary];
          setReveal({ type: "failure", payload: fk });
          break;
        }
      }
      return newState;
    });
  };

  const reset = () => { setState(null); setReflection(""); setReveal(null); };

  const activeSectors = Object.keys(SECTORS).filter(s => (!SECTORS[s].locked || state.unlocked[s]) && biomeData.sectorAvailable[s] !== false);
  const maxValue = Math.max(40, ...Object.values(turnPreview.sectorResults).map(r => r.value));

  const wageBargainColor = (() => {
    const w = state.wageBargain;
    if (w < 0.2 || w > 0.85) return "#a83a1a";
    if (w >= 0.45 && w <= 0.65) return "#5a8a3f";
    return "#c98a3a";
  })();
  const wageBargainLabel = (() => {
    const w = state.wageBargain;
    if (w < 0.2) return "Extractive — owners don't reinvest";
    if (w > 0.85) return "Capital flight risk";
    if (w >= 0.45 && w <= 0.65) return "Sweet spot";
    if (w > 0.65) return "Worker-leaning — reinvestment slowing";
    return "Low but formal sector growing";
  })();

  const nextUnlocks = Object.entries(turnPreview.unlockChecks)
    .filter(([k, v]) => !v.alreadyUnlocked)
    .sort((a, b) => a[1].tier - b[1].tier)
    .slice(0, 3);

  // Urban/rural status
  const urbanPct = state.urbanShare * 100;
  const urbanStatus = (() => {
    if (urbanPct > 78) return { label: "Overconcentrated", color: "#a83a1a" };
    if (urbanPct > 65) return { label: "Urbanizing fast", color: "#c98a3a" };
    if (urbanPct < 25) return { label: "Heavily rural", color: "#c98a3a" };
    return { label: "Balanced", color: "#5a8a3f" };
  })();

  const foodStatus = (() => {
    if (turnPreview.foodShortfall <= 0) return { label: "Self-sufficient", color: "#5a8a3f" };
    if (turnPreview.treasuryCanCoverFood && turnPreview.foodShortfall < turnPreview.foodNeed * 0.3) {
      return { label: "Net importer", color: "#c98a3a" };
    }
    if (turnPreview.treasuryCanCoverFood) return { label: "Dependent on imports", color: "#c98a3a" };
    return { label: "FOOD CRISIS", color: "#a83a1a" };
  })();

  const investorStatus = (() => {
    const i = turnPreview.investorInterest;
    if (i < 0.15) return { label: "Cold", color: "#5a4e3a" };
    if (i < 0.35) return { label: "Modest", color: "#8a6a3a" };
    if (i < 0.55) return { label: "Warm", color: "#c98a3a" };
    if (i < 0.75) return { label: "Hot", color: "#8a5a3f" };
    return { label: "Frenzy", color: "#a83a1a" };
  })();

  return (
    <div style={S.page}>
      <style>{globalCSS}</style>

      {/* Achievement banner */}
      {state.newAchievementsThisTurn && state.newAchievementsThisTurn.length > 0 && (
        <div style={S.achievementBanner}>
          <div style={S.achievementBannerHeader}>
            <span style={{ fontSize: 18 }}>{state.newAchievementsThisTurn.some(id => ACHIEVEMENTS[id].tone === "cautionary") ? "⚠" : "✦"}</span>
            <span>Achievement{state.newAchievementsThisTurn.length > 1 ? "s" : ""} earned</span>
            <button
              onClick={() => setState(s => ({ ...s, newAchievementsThisTurn: [] }))}
              style={S.achievementClose}
            >✕</button>
          </div>
          {state.newAchievementsThisTurn.map(aid => {
            const a = ACHIEVEMENTS[aid];
            return (
              <div key={aid} style={S.achievementCard}>
                <div style={{ ...S.achievementName, color: a.tone === "cautionary" ? "#a83a1a" : "#3a4a25" }}>{a.name}</div>
                <div style={S.achievementDesc}>{a.description}</div>
                <div style={S.achievementReal}>{a.realWorld}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {reveal && <RevealModal reveal={reveal} onClose={() => setReveal(null)} reset={reset} debugLog={state.debugLog} onViewLog={() => { setReveal(null); setTab("debug"); }} />}

      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>{biomeData.icon}</span>
          <div style={S.eyebrow}>{biomeData.name}</div>
        </div>
        <h1 style={S.h1}>Where Value Comes From</h1>
        <div style={S.sub}>{biomeData.character}</div>
        <div style={S.headerBtns}>
          <button onClick={() => setShowLearn(s => !s)} style={S.learnBtn}>
            {showLearn ? "hide notes ▴" : "what is this? ▾"}
          </button>
          <button onClick={() => setShowNotes(s => !s)} style={{
            ...S.hintsToggle,
            background: showNotes ? "#3f7a8a" : "transparent",
            color: showNotes ? "#fdf6e3" : "#3f7a8a",
          }}>
            {showNotes ? "✓ explainers" : "explainers"}
          </button>
          {state.revealedPaths.length > 0 && (
            <button onClick={() => setShowHints(s => !s)} style={{
              ...S.hintsToggle,
              background: showHints ? "#5a3f8a" : "transparent",
              color: showHints ? "#fdf6e3" : "#5a3f8a",
            }}>
              {showHints ? "✓ hints on" : "show hints"}
            </button>
          )}
        </div>
      </header>

      {showLearn && (
        <div style={S.learn}>
          <p style={S.learnP}><strong>Scrabble theory.</strong> Sectors are words built from letters. Public goods are the vowels. <span style={S.thinker}>Hausmann</span></p>
          <p style={S.learnP}><strong>This place.</strong> {biomeData.blurb}</p>
          <p style={S.learnP}><strong>Three paths.</strong> Capability, Commons, or Market. Different metrics, different failure modes.</p>
          <p style={S.learnP}><strong>Labor doesn't switch instantly.</strong> Shift more than 5% of workers between sectors and they lose productivity for 2 turns while learning the new work. Gradual transitions are healthier. <span style={S.thinker}>Polanyi</span></p>
          <p style={S.learnP}><strong>People need to eat.</strong> Crops, agritech, and regenerative produce food. Shortfalls must be imported (costs treasury, cheap on islands, expensive inland) or workers get sick and productivity drops everywhere. You cannot abandon farming.</p>
        </div>
      )}

      {state.activeShock && (
        <div style={S.shockBanner}>
          ⚡ {SHOCKS[state.activeShock].name} ({state.shockTurnsLeft} turn{state.shockTurnsLeft !== 1 ? "s" : ""})
        </div>
      )}

      {state.revealedPaths.length > 0 && (
        <div style={S.pathStrip}>
          {state.revealedPaths.map(pk => {
            const p = PATHS[pk];
            let score, target;
            if (pk === "capability") { score = turnPreview.complexityScore; target = 250; }
            if (pk === "commons") { score = turnPreview.welfareEquity; target = 50; }
            if (pk === "market") { score = turnPreview.accumulatedCapital; target = 1500; }
            const pct = Math.min(100, (score / target) * 100);
            const isExpanded = expandedPath === pk;
            const diag = isExpanded ? diagnosePath(pk, state, turnPreview) : null;
            const ctx = isExpanded ? metricContext(pk, score) : "";
            return (
              <div key={pk} style={{ ...S.pathCard, borderColor: p.color, cursor: "pointer" }}
                   onClick={() => setExpandedPath(isExpanded ? null : pk)}>
                <div style={{ ...S.pathName, color: p.color }}>
                  {p.name}
                  {state.milestones[pk] && <span style={S.milestoneBadge}>✦</span>}
                  <span style={S.expandHint}>{isExpanded ? "▴ tap to collapse" : "▾ tap for strategy"}</span>
                </div>
                <div style={S.pathMetric}>{p.metric}</div>
                <div style={S.pathBar}>
                  <div className="bar" style={{ width: `${pct}%`, height: "100%", background: p.color, borderRadius: 2 }} />
                </div>
                <div style={S.pathScore}>
                  <span className="num">{score.toFixed(0)}</span> <span style={S.pathTarget}>/ {target}</span>
                </div>
                {isExpanded && (
                  <div style={S.pathDiagnostic} onClick={(e) => e.stopPropagation()}>
                    {ctx && <div style={S.pathContext}>{ctx}</div>}
                    {diag.helping.length > 0 && (
                      <div style={S.diagSection}>
                        <div style={S.diagHeader}>✓ working</div>
                        {diag.helping.map((h, i) => <div key={i} style={S.diagItem}>{h}</div>)}
                      </div>
                    )}
                    {diag.blocking.length > 0 && (
                      <div style={S.diagSection}>
                        <div style={{ ...S.diagHeader, color: "#a83a1a" }}>✗ blocking</div>
                        {diag.blocking.map((b, i) => <div key={i} style={S.diagItem}>{b}</div>)}
                      </div>
                    )}
                    {diag.next.length > 0 && (
                      <div style={S.diagSection}>
                        <div style={{ ...S.diagHeader, color: "#8a6a3a" }}>→ next move</div>
                        {diag.next.map((n, i) => <div key={i} style={S.diagItem}>{n}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Path discovery: show proximity for all un-revealed paths starting at turn 3 */}
      {state.turn >= 3 && state.revealedPaths.length < 3 && (
        <div style={S.discoveryPanel}>
          <div style={S.discoveryTitle}>
            {state.revealedPaths.length === 0 ? "No path triggered yet" : "Other paths within reach"}
          </div>
          <div style={S.discoveryNote}>
            {state.revealedPaths.length === 0
              ? "Three different ways to read this economy. Each scores differently. Reveal one by satisfying its triggers."
              : "Different policy mix would reveal other trajectories."}
          </div>
          {Object.keys(PATHS).filter(pk => !state.revealedPaths.includes(pk)).map(pk => {
            const p = PATHS[pk];
            const prox = pathProximity(pk, state);
            return (
              <div key={pk} style={{ ...S.discoveryCard, borderColor: p.color, opacity: 0.85 }}>
                <div style={{ ...S.discoveryCardTitle, color: p.color }}>
                  {p.name}
                  <span style={S.discoveryRatio}>{prox.okCount}/{prox.total} triggers met</span>
                </div>
                <div style={S.discoveryChecks}>
                  {prox.checks.map((c, i) => (
                    <div key={i} style={{ ...S.discoveryCheck, color: c.ok ? "#5a8a3f" : "#7a6a4a" }}>
                      <span style={S.discoveryCheckMark}>{c.ok ? "✓" : "·"}</span>
                      <span style={S.discoveryCheckLabel}>{c.label}</span>
                      <span className="num" style={S.discoveryCheckCur}>{c.current}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={S.statusStrip}>
        <Stat label="Turn" value={`${state.turn} / ${MAX_TURNS}`} />
        <Stat label="Treasury" value={state.treasury.toFixed(0)} />
        <Stat label="Value" value={turnPreview.totalValue.toFixed(0)} />
      </div>

      {/* Urban/Rural panel - always visible after turn 2 */}
      {state.turn >= 2 && (
        <div style={S.urbanPanel}>
          <div style={S.urbanHeader}>
            <span style={S.urbanLabel}>Urban / Rural split</span>
            <span style={{ ...S.urbanStatus, color: urbanStatus.color }}>{urbanStatus.label}</span>
          </div>
          <div style={S.urbanTrack}>
            <div style={{ ...S.urbanRural, width: `${100 - urbanPct}%` }}>
              <span style={S.urbanSegLabel}>rural <span className="num">{(100 - urbanPct).toFixed(0)}%</span></span>
            </div>
            <div style={{ ...S.urbanCity, width: `${urbanPct}%` }}>
              <span style={S.urbanSegLabel}>urban <span className="num">{urbanPct.toFixed(0)}%</span></span>
            </div>
          </div>
          {Math.abs(turnPreview.targetUrban - state.urbanShare) > 0.05 && (
            <div style={S.driftHint}>
              Drifting toward {(turnPreview.targetUrban * 100).toFixed(0)}% urban based on sector mix
            </div>
          )}
        </div>
      )}

      {/* Macroeconomic cycle phase - visible from turn 1 */}
      {state.turn >= 1 && (
        <div style={{ ...S.investorPanel, borderLeft: `4px solid ${turnPreview.currentPhase.color}` }}>
          <div style={S.urbanHeader}>
            <span style={S.urbanLabel}>Economic cycle</span>
            <span style={{ ...S.urbanStatus, color: turnPreview.currentPhase.color }}>{turnPreview.currentPhase.name}</span>
          </div>
          <div style={S.cycleTrack}>
            {[0, 1, 2, 3, 4, 5].map(i => {
              const phase = CYCLE_PHASES[i];
              const active = i === turnPreview.cyclePhase;
              const next = i === turnPreview.nextCyclePhase;
              return (
                <div key={i} style={{
                  flex: 1,
                  height: 8,
                  background: active ? phase.color : next ? `${phase.color}55` : "#ead5ab",
                  marginRight: i < 5 ? 2 : 0,
                  borderRadius: 2,
                }} title={phase.name} />
              );
            })}
          </div>
          <div style={S.cycleMeta}>
            {showNotes && <span style={{ fontSize: 12, color: "#5a4e3a", fontStyle: "italic" }}>{turnPreview.currentPhase.narrative}</span>}
            <div style={S.cycleAlignment}>
              <span style={{ fontSize: 11, color: "#7a6a4a" }}>Policy alignment:</span>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: turnPreview.cycleAlignment >= 0.6 ? "#5a8a3f" : turnPreview.cycleAlignment >= 0.3 ? "#c98a3a" : "#a83a1a", marginLeft: 6 }}>
                {(turnPreview.cycleAlignment * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div style={S.cycleHints}>
            Ideal tax: <strong>{(turnPreview.currentPhase.idealTax * 100).toFixed(0)}%</strong> (you: {(state.taxRate * 100).toFixed(0)}%). Ideal rebalancing: <strong>{(turnPreview.currentPhase.idealRebal * 100).toFixed(0)}%</strong> (you: {(state.rebalancingInvest * 100).toFixed(0)}%). Mismatch reduces capacity growth.
          </div>
        </div>
      )}

      {/* Investor interest meter - visible from turn 1 */}
      {state.turn >= 1 && (
        <div style={S.investorPanel}>
          <div style={S.urbanHeader}>
            <span style={S.urbanLabel}>Outside investor interest</span>
            <span style={{ ...S.urbanStatus, color: investorStatus.color }}>{investorStatus.label}</span>
          </div>
          <div style={S.investorTrack}>
            <div style={{ width: `${turnPreview.investorInterest * 100}%`, height: "100%", background: investorStatus.color, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <div style={S.investorMeta}>
            <span>Capital inflow: <span className="num" style={{ color: turnPreview.marketInflow > 0 ? "#5a8a3f" : "#7a6a4a", fontWeight: 600 }}>+{turnPreview.marketInflow.toFixed(1)}</span> /turn</span>
            <button onClick={() => setShowInvestorWhy(!showInvestorWhy)} style={S.whyBtn}>
              {showInvestorWhy ? "hide" : "why?"}
            </button>
          </div>
          {showInvestorWhy && (
            <div style={S.investorWhyBox}>
              <div style={S.investorWhyTitle}>What outside investors are watching:</div>
              <div style={S.investorWhyRow}>
                <span>Rule of law (level {state.vowels.ruleOfLaw})</span>
                <span className="num" style={{ color: turnPreview.ruleOfLawComponent > 0.2 ? "#5a8a3f" : "#7a6a4a" }}>
                  +{(turnPreview.ruleOfLawComponent * 100).toFixed(0)}%
                </span>
              </div>
              <div style={S.investorWhyRow}>
                <span>Port infrastructure (level {state.vowels.port})</span>
                <span className="num" style={{ color: turnPreview.portComponent > 0.08 ? "#5a8a3f" : "#7a6a4a" }}>
                  +{(turnPreview.portComponent * 100).toFixed(0)}%
                </span>
              </div>
              <div style={S.investorWhyRow}>
                <span>Low taxes ({(state.taxRate * 100).toFixed(0)}%)</span>
                <span className="num" style={{ color: turnPreview.lowTaxBonus > 0.15 ? "#5a8a3f" : "#7a6a4a" }}>
                  +{(turnPreview.lowTaxBonus * 100).toFixed(0)}%
                </span>
              </div>
              <div style={S.investorWhyRow}>
                <span>Low wages ({(state.wageBargain * 100).toFixed(0)}%)</span>
                <span className="num" style={{ color: turnPreview.lowWageBonus > 0.10 ? "#5a8a3f" : "#7a6a4a" }}>
                  +{(turnPreview.lowWageBonus * 100).toFixed(0)}%
                </span>
              </div>
              <div style={S.investorWhyNote}>
                Outside investors look for stable institutions (rule of law), export infrastructure (port), and high returns (low taxes + low wages). Inflow scales with how much of your economy is extractive. Market path doubles inflow once triggered.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Food security panel */}
      {state.turn >= 1 && (
        <div style={S.foodPanel}>
          <div style={S.foodHeader}>
            <span style={S.urbanLabel}>Food security</span>
            <span style={{ ...S.foodStatus, color: foodStatus.color }}>{foodStatus.label}</span>
          </div>
          <div style={S.foodMetrics}>
            <div style={S.foodMetric}>
              <span style={S.foodMetricLabel}>produced</span>
              <span className="num" style={S.foodMetricVal}>{turnPreview.foodProduced.toFixed(0)}</span>
            </div>
            <div style={S.foodMetric}>
              <span style={S.foodMetricLabel}>needed</span>
              <span className="num" style={S.foodMetricVal}>{turnPreview.foodNeed}</span>
            </div>
            {turnPreview.foodShortfall > 0 && (
              <div style={S.foodMetric}>
                <span style={S.foodMetricLabel}>import cost</span>
                <span className="num" style={{ ...S.foodMetricVal, color: turnPreview.treasuryCanCoverFood ? "#c98a3a" : "#a83a1a" }}>
                  {turnPreview.foodImportCost.toFixed(0)}
                </span>
              </div>
            )}
          </div>

          {/* CRITICAL: Show the actual VALUE cost of health penalty */}
          {state.healthPenalty > 0.05 && (
            <div style={S.healthCostBox}>
              <div style={S.healthCostHeader}>
                ⚠ Worker illness costing you <span className="num">{(turnPreview.totalValue * state.healthPenalty * 0.3 / (1 - state.healthPenalty * 0.3)).toFixed(0)}</span> value/turn
              </div>
              <div style={S.healthCostBreakdown}>
                Current health penalty: <span style={{ color: "#a83a1a", fontWeight: 700 }}>−{(state.healthPenalty * 30).toFixed(0)}%</span> productivity on every sector.
                {state.vowels.health < 2 && (
                  <span> Build <strong>Health to level 2</strong> to allow recovery when food is imported. Build <strong>Health 3+</strong> for faster recovery and resistance to future food shocks.</span>
                )}
                {state.vowels.health === 2 && (
                  <span> Health 2 allows slow recovery (5%/turn) when food is covered. Health 3+ would recover 10%/turn.</span>
                )}
                {state.vowels.health >= 3 && (
                  <span> Health {state.vowels.health} is recovering 10%/turn when food is covered. Producing surplus food would heal even faster.</span>
                )}
              </div>
            </div>
          )}

          {turnPreview.foodShortfall > 0 && !turnPreview.treasuryCanCoverFood && (
            <div style={S.foodWarning}>
              ⚠ Treasury can't cover food imports. Worker health declining {(0.15 * (1 - (state.vowels.health >= 3 ? 0.5 : state.vowels.health >= 2 ? 0.25 : 0)) * 100).toFixed(0)}%/turn.
            </div>
          )}

          {turnPreview.foodShortfall > turnPreview.foodNeed * 0.4 && (
            <div style={S.foodWarning}>
              ⚠ Heavy food dependency. Consider increasing crops or agritech allocation.
            </div>
          )}
        </div>
      )}

      <div style={S.tabs}>
        <TabBtn active={tab === "sectors"} onClick={() => setTab("sectors")}>Sectors</TabBtn>
        <TabBtn active={tab === "workers"} onClick={() => setTab("workers")}>Policy</TabBtn>
        <TabBtn active={tab === "public"} onClick={() => setTab("public")}>Build</TabBtn>
        <TabBtn active={tab === "unlocks"} onClick={() => setTab("unlocks")}>
          Unlocks {nextUnlocks.filter(([, v]) => v.ready).length > 0 && <span style={S.badge}>!</span>}
        </TabBtn>
        <TabBtn active={tab === "debug"} onClick={() => setTab("debug")}>Log</TabBtn>
      </div>

      {tab === "sectors" && (
        <section style={S.panel}>
          <h2 style={S.h2}>Labor allocation</h2>
          {showNotes && (<div style={S.note}>100% of workforce. Moving one redistributes others.</div>)}

          <div style={S.allocStackTrack}>
            {activeSectors.map(s => {
              const pct = (state.allocation[s] || 0) * 100;
              if (pct < 0.5) return null;
              return (
                <div key={s} style={{ ...S.allocStackSeg, width: `${pct}%`, background: SECTORS[s].color }}>
                  {pct > 8 && <span style={S.allocStackLabel}>{pct.toFixed(0)}%</span>}
                </div>
              );
            })}
          </div>

          <div style={S.divider} />
          <h2 style={S.h2}>Sectors</h2>
          {showNotes && (<div style={S.note}>Biome multiplier in green favors local strengths.</div>)}

          {activeSectors.map(s => {
            const r = turnPreview.sectorResults[s];
            const sect = SECTORS[s];
            if (!r) return null;
            const widthPct = Math.min(100, (r.value / maxValue) * 100);
            const wagePct = r.wageShare * 100;
            return (
              <div key={s} style={S.sectorBlock}>
                <div style={S.sectorTop}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...S.sectorName, color: sect.color }}>
                      {sect.name}
                      {r.shocked && <span style={S.shockTag}>⚡</span>}
                      {r.biomeMult > 1.1 && <span style={S.bonusTag}>+{((r.biomeMult - 1) * 100).toFixed(0)}%</span>}
                      {r.biomeMult < 0.9 && r.biomeMult > 0 && <span style={S.penaltyTag}>{((r.biomeMult - 1) * 100).toFixed(0)}%</span>}
                    </div>
                    <div style={S.sectorBlurb}>{sect.blurb}</div>
                  </div>
                  <div style={S.sectorRight}>
                    <div className="num" style={S.bigNum}>{r.value.toFixed(0)}</div>
                    <div style={S.tinyLabel}>value</div>
                  </div>
                </div>
                <div style={S.barTrack}>
                  <div className="bar" style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${sect.color} 0 ${wagePct}%, ${shade(sect.color, -30)} ${wagePct}% 100%)`,
                    height: 22, borderRadius: 3,
                  }} />
                </div>
                <div style={S.sectorMeta}>
                  <Pill label="workers" val={r.labor.toFixed(0)} />
                  <Pill label="wages" val={r.wages.toFixed(0)} />
                  <Pill label="owners" val={r.owners.toFixed(0)} />
                  <Pill label="cap" val={`${(r.capacity * 100).toFixed(0)}%`} />
                </div>
                {r.binding && <div style={S.binding}>⚠ binding: {VOWELS[r.binding].name}</div>}
                {r.transitionPenalty > 0.1 && (
                  <div style={S.warning}>
                    🔄 labor transition: {(r.transitionPenalty * 100).toFixed(0)}% productivity loss (recovering)
                  </div>
                )}
                {/* Sector maturity */}
                {(r.maturity || 0) > 30 && (
                  <div style={S.maturityBox}>
                    <div style={S.maturityHeader}>
                      <span style={S.maturityLabel}>Maturity</span>
                      <span className="num" style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: r.maturity >= 80 ? "#a83a1a" : r.maturity >= 60 ? "#c98a3a" : "#7a6a4a"
                      }}>{r.maturity.toFixed(0)}/100</span>
                    </div>
                    <div style={S.maturityTrack}>
                      <div style={{
                        width: `${r.maturity}%`,
                        height: "100%",
                        background: r.maturity >= 80 ? "#a83a1a" : r.maturity >= 60 ? "#c98a3a" : "#5a8a3f",
                        borderRadius: 2,
                      }} />
                    </div>
                    {r.maturity >= 60 && r.maturity < 80 && (
                      <div style={S.maturityNote}>
                        Sector slowing ({(r.maturityPenalty * 100).toFixed(0)}% reduced). {MODERNIZATION_CHAIN[s] ? `Begin transitioning to ${SECTORS[MODERNIZATION_CHAIN[s]].name}.` : "Consider new sector mix."}
                      </div>
                    )}
                    {r.maturity >= 80 && (
                      <div style={{ ...S.maturityNote, color: "#a83a1a", fontWeight: 600 }}>
                        ⚠ Capacity decaying ({(r.maturityPenalty * 100).toFixed(0)}% loss). {MODERNIZATION_CHAIN[s] ? `Reallocate workers to ${SECTORS[MODERNIZATION_CHAIN[s]].name}.` : "Diversify."}
                      </div>
                    )}
                  </div>
                )}
                <div style={S.allocBox}>
                  <div style={S.allocHeader}>
                    <span style={S.allocLabel}>Workforce share</span>
                  </div>
                  <Stepper
                    value={`${((state.allocation[s] ?? 0) * 100).toFixed(0)}%`}
                    onDec={() => setAlloc(s, (state.allocation[s] || 0) - 0.05)}
                    onInc={() => setAlloc(s, (state.allocation[s] || 0) + 0.05)}
                    decDisabled={(state.allocation[s] || 0) <= 0}
                    incDisabled={(state.allocation[s] || 0) >= 1}
                    hints={getSectorHints(s)}
                    revealedPaths={state.revealedPaths}
                    showHints={showHints}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {tab === "workers" && (
        <section style={S.panel}>
          <h2 style={S.h2}>Knowhow ladder</h2>
          {showNotes && (<div style={S.note}>Workers move up only with schools + health.</div>)}
          {RUNG_LABELS.map((label, i) => {
            const count = state.workforce[i];
            const widthPct = Math.min(100, (count / state.population) * 100);
            return (
              <div key={label} style={S.rungRow}>
                <div style={S.rungLabel}>{label}</div>
                <div style={S.rungTrack}>
                  <div className="bar" style={{ width: `${widthPct}%`, height: 18, background: rungColor(i), borderRadius: 2 }} />
                </div>
                <div className="num" style={S.rungCount}>{count.toFixed(0)}</div>
              </div>
            );
          })}

          <div style={S.divider} />
          <h2 style={S.h2}>Policy levers</h2>

          <div style={S.leverBlock}>
            <div style={S.leverLabel}><span>Wage bargaining strength</span></div>
            <Stepper
              value={`${(state.wageBargain * 100).toFixed(0)}%`}
              onDec={() => setState(s => ({ ...s, wageBargain: Math.max(0, Math.round((s.wageBargain - 0.05) * 100) / 100) }))}
              onInc={() => setState(s => ({ ...s, wageBargain: Math.min(1, Math.round((s.wageBargain + 0.05) * 100) / 100) }))}
              decDisabled={state.wageBargain <= 0}
              incDisabled={state.wageBargain >= 1}
              hints={getLeverHints("wageBargain", state.wageBargain)}
              revealedPaths={state.revealedPaths}
              showHints={showHints}
            />
            <div style={S.zoneStrip}>
              <div style={{ ...S.zone, flex: 2, background: "#fce8db" }}>extract</div>
              <div style={{ ...S.zone, flex: 2.5, background: "#fef3d8" }}>under</div>
              <div style={{ ...S.zone, flex: 2, background: "#e2efd8" }}>sweet</div>
              <div style={{ ...S.zone, flex: 2, background: "#fef3d8" }}>over</div>
              <div style={{ ...S.zone, flex: 1.5, background: "#fce8db" }}>flight</div>
            </div>
            <div style={{ ...S.zoneLabel, color: wageBargainColor }}>{wageBargainLabel}</div>
            <div style={S.causalBox}>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Median worker earns</span>
                <span className="num" style={S.causalVal}>{turnPreview.medianWelfare.toFixed(0)} <span style={S.causalUnit}>/turn</span></span>
              </div>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Gini (inequality)</span>
                <span className="num" style={{ ...S.causalVal, color: turnPreview.gini > 0.45 ? "#a83a1a" : turnPreview.gini < 0.32 ? "#5a8a3f" : "#c98a3a" }}>
                  {turnPreview.gini.toFixed(2)} <span style={S.causalUnit}>{giniContext(turnPreview.gini)}</span>
                </span>
              </div>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Worker share of value</span>
                <span className="num" style={S.causalVal}>{turnPreview.totalValue > 0 ? ((turnPreview.netWages / turnPreview.totalValue) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
            {turnPreview.marginalContributions && (
              <div style={S.contribBox}>
                <div style={S.contribHeader}>Current contribution vs neutral (50%)</div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Wages received</span>
                  <span className="num" style={{ ...S.contribVal, color: turnPreview.marginalContributions.wageBargain.delta.wages >= 0 ? "#5a8a3f" : "#a83a1a" }}>
                    {turnPreview.marginalContributions.wageBargain.delta.wages >= 0 ? "+" : ""}{turnPreview.marginalContributions.wageBargain.delta.wages.toFixed(1)}/turn
                  </span>
                </div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Total production</span>
                  <span className="num" style={{ ...S.contribVal, color: turnPreview.marginalContributions.wageBargain.delta.value >= 0 ? "#5a8a3f" : "#a83a1a" }}>
                    {turnPreview.marginalContributions.wageBargain.delta.value >= 0 ? "+" : ""}{turnPreview.marginalContributions.wageBargain.delta.value.toFixed(1)}/turn
                  </span>
                </div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Median worker pay</span>
                  <span className="num" style={{ ...S.contribVal, color: turnPreview.marginalContributions.wageBargain.delta.medianWelfare >= 0 ? "#5a8a3f" : "#a83a1a" }}>
                    {turnPreview.marginalContributions.wageBargain.delta.medianWelfare >= 0 ? "+" : ""}{turnPreview.marginalContributions.wageBargain.delta.medianWelfare.toFixed(1)}/turn
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={S.leverBlock}>
            <div style={S.leverLabel}><span>Tax rate</span></div>
            <Stepper
              value={`${(state.taxRate * 100).toFixed(0)}%`}
              onDec={() => setState(s => ({ ...s, taxRate: Math.max(0, Math.round((s.taxRate - 0.02) * 100) / 100) }))}
              onInc={() => setState(s => ({ ...s, taxRate: Math.min(0.4, Math.round((s.taxRate + 0.02) * 100) / 100) }))}
              decDisabled={state.taxRate <= 0}
              incDisabled={state.taxRate >= 0.4}
              hints={getLeverHints("taxRate", state.taxRate)}
              revealedPaths={state.revealedPaths}
              showHints={showHints}
            />
            <div style={S.causalBox}>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Treasury inflow / turn</span>
                <span className="num" style={S.causalVal}>+{turnPreview.taxes.toFixed(0)}</span>
              </div>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Real-world comparison</span>
                <span style={S.causalUnit}>
                  {state.taxRate < 0.10 ? "Tax haven / Gulf state" :
                   state.taxRate < 0.20 ? "US / Switzerland" :
                   state.taxRate < 0.30 ? "UK / Germany" :
                   "Nordic-style"}
                </span>
              </div>
            </div>
            {showNotes && <div style={S.leverNote}>Funds treasury. No taxes, no vowels.</div>}
            {turnPreview.marginalContributions && (
              <div style={S.contribBox}>
                <div style={S.contribHeader}>Current contribution vs 0% baseline</div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Treasury inflow</span>
                  <span className="num" style={{ ...S.contribVal, color: "#5a8a3f" }}>+{turnPreview.taxes.toFixed(1)}/turn</span>
                </div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Effect on production</span>
                  <span className="num" style={{ ...S.contribVal, color: turnPreview.marginalContributions.taxRate.delta.value >= 0 ? "#5a8a3f" : "#a83a1a" }}>
                    {turnPreview.marginalContributions.taxRate.delta.value >= 0 ? "+" : ""}{turnPreview.marginalContributions.taxRate.delta.value.toFixed(1)}/turn
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={S.leverBlock}>
            <div style={S.leverLabel}><span>Urban/rural rebalancing</span></div>
            <Stepper
              value={`${(state.rebalancingInvest * 100).toFixed(0)}%`}
              onDec={() => setState(s => ({ ...s, rebalancingInvest: Math.max(0, Math.round((s.rebalancingInvest - 0.1) * 10) / 10) }))}
              onInc={() => setState(s => ({ ...s, rebalancingInvest: Math.min(1, Math.round((s.rebalancingInvest + 0.1) * 10) / 10) }))}
              decDisabled={state.rebalancingInvest <= 0}
              incDisabled={state.rebalancingInvest >= 1}
            />
            <div style={S.causalBox}>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Current urban share</span>
                <span className="num" style={S.causalVal}>{(state.urbanShare * 100).toFixed(0)}%</span>
              </div>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Where sectors pull it</span>
                <span className="num" style={S.causalVal}>{(turnPreview.targetUrban * 100).toFixed(0)}%</span>
              </div>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Net drift next turn</span>
                <span className="num" style={{ ...S.causalVal, color: Math.abs(turnPreview.newUrbanShare - state.urbanShare) > 0.02 ? "#c98a3a" : "#5a8a3f" }}>
                  {turnPreview.newUrbanShare > state.urbanShare ? "+" : ""}{((turnPreview.newUrbanShare - state.urbanShare) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={S.causalRow}>
                <span style={S.causalLabel}>Cost from treasury</span>
                <span className="num" style={{ ...S.causalVal, color: "#a83a1a" }}>−{(state.rebalancingInvest * 8).toFixed(1)}/turn</span>
              </div>
            </div>
            {showNotes && (
              <div style={S.leverNote}>
                Investing here slows the drift toward where your sector mix would naturally push urban share. Useful when sectors pull urban share too high (housing crisis past 70%) or too low (rural brain drain below 30%).
              </div>
            )}
            {turnPreview.marginalContributions && state.rebalancingInvest > 0 && (
              <div style={S.contribBox}>
                <div style={S.contribHeader}>What this lever is doing now</div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Urban drift reduction</span>
                  <span className="num" style={{ ...S.contribVal, color: "#5a8a3f" }}>
                    {Math.abs(turnPreview.marginalContributions.rebalancing.delta.urbanDrift) > 0.001
                      ? `${(turnPreview.marginalContributions.rebalancing.delta.urbanDrift * 100).toFixed(2)}%/turn`
                      : "none"}
                  </span>
                </div>
                <div style={S.contribRow}>
                  <span style={S.contribLabel}>Treasury cost</span>
                  <span className="num" style={{ ...S.contribVal, color: "#a83a1a" }}>−{(state.rebalancingInvest * 8).toFixed(1)}/turn</span>
                </div>
              </div>
            )}
          </div>

          <div style={S.divider} />
          <h2 style={S.h2}>Where value went</h2>
          <Distro label="Workers (net)" value={turnPreview.netWages} max={turnPreview.totalValue} color="#3f7a8a" />
          <Distro label="Owners (net)" value={turnPreview.netOwners} max={turnPreview.totalValue} color="#8a3f5a" />
          <Distro label="State (tax)" value={turnPreview.taxes} max={turnPreview.totalValue} color="#7e8b3a" />

          <div style={S.divider} />
          <h2 style={S.h2}>Structural effects</h2>
          {showNotes && (<div style={S.note}>How sector mix and ownership patterns affect everything else.</div>)}

          {/* Social contract */}
          <div style={S.effectCard}>
            <div style={S.effectHeader}>Social contract</div>
            <div style={S.contractTrack}>
              <div style={S.contractMidLine} />
              <div style={{
                position: "absolute",
                left: `${((state.socialContract + 1) / 2) * 100}%`,
                top: -3,
                width: 14,
                height: 14,
                background: "#2a2218",
                borderRadius: 7,
                transform: "translateX(-7px)",
                border: "2px solid #fdf6e3",
              }} />
              <div style={{
                position: "absolute",
                left: `${((turnPreview.policyStance + 1) / 2) * 100}%`,
                top: -3,
                width: 10,
                height: 10,
                background: "#8a3f1a",
                borderRadius: 5,
                transform: "translateX(-5px)",
                opacity: 0.7,
              }} />
            </div>
            <div style={S.contractLabels}>
              <span>← Solidaristic</span>
              <span style={{ color: "#5a4e3a", fontSize: 10 }}>{state.socialContract.toFixed(2)}</span>
              <span>Extractive →</span>
            </div>
            {showNotes && (
              <div style={S.effectNote}>
                ● Established contract: <strong>{state.socialContract < -0.5 ? "Commons settlement" : state.socialContract < -0.15 ? "Mixed-leaning commons" : state.socialContract < 0.15 ? "Mixed economy" : state.socialContract < 0.5 ? "Mixed-leaning market" : "Market settlement"}</strong>.
                ● Current policy direction: <strong>{turnPreview.policyStance < -0.5 ? "Strong commons" : turnPreview.policyStance < -0.15 ? "Commons-leaning" : turnPreview.policyStance < 0.15 ? "Mixed" : turnPreview.policyStance < 0.5 ? "Market-leaning" : "Strong market"}</strong>. {turnPreview.contractPenaltyDescription || "Policy aligned with contract; no penalties."}
              </div>
            )}
            {turnPreview.capitalFlight > 0.05 && (
              <div style={S.contractWarning}>
                ⚠ Capital flight: foreign investment cut by {(turnPreview.capitalFlight * 100).toFixed(0)}%. Investors abandon solidaristic pivots.
              </div>
            )}
            {turnPreview.workerExit > 0.05 && (
              <div style={S.contractWarning}>
                ⚠ Worker exit: local sectors lose {(turnPreview.workerExit * 100).toFixed(0)}% productivity. Workers resist market pivots from established commons.
              </div>
            )}
          </div>

          {/* Urban/Rural imbalance penalties */}
          {(turnPreview.housingCrisis > 0.02 || turnPreview.ruralDrain > 0.02) && (
            <div style={{ ...S.effectCard, borderColor: "#c98a3a" }}>
              <div style={{ ...S.effectHeader, color: "#a83a1a" }}>⚠ Urban/rural imbalance</div>
              {turnPreview.housingCrisis > 0.02 && (
                <div style={S.effectRow}>
                  <span>Housing crisis on urban sectors</span>
                  <span className="num" style={{ color: "#a83a1a", fontWeight: 600 }}>−{(turnPreview.housingCrisis * 100).toFixed(0)}%</span>
                </div>
              )}
              {turnPreview.ruralDrain > 0.02 && (
                <div style={S.effectRow}>
                  <span>Rural brain drain reducing training</span>
                  <span className="num" style={{ color: "#a83a1a", fontWeight: 600 }}>−{(turnPreview.ruralDrain * 100).toFixed(0)}%</span>
                </div>
              )}
              {showNotes && (
                <div style={S.effectNote}>
                  {turnPreview.housingCrisis > 0.02 && "Cities overheating: rent eats wages, services and finance sectors lose productivity. Build housing-friendly policies (rural rebalancing, lower urbanization)."}
                  {turnPreview.ruralDrain > 0.02 && "Countryside depopulating: skilled workers leaving for cities elsewhere, training collapsing. Shift labor toward rural-pull sectors (crops, regenerative)."}
                </div>
              )}
            </div>
          )}

          {/* Foreign investment / inflows */}
          {(turnPreview.marketInflow > 0 || turnPreview.commonsInflow > 0) && (
            <div style={S.effectCard}>
              <div style={S.effectHeader}>External capital inflows</div>
              {turnPreview.marketInflow > 0 && (
                <div style={S.effectRow}>
                  <span>📈 Foreign investment</span>
                  <span className="num" style={{ color: "#5a8a3f", fontWeight: 600 }}>+{turnPreview.marketInflow.toFixed(1)} <span style={S.causalUnit}>/turn</span></span>
                </div>
              )}
              {turnPreview.commonsInflow > 0 && (
                <div style={S.effectRow}>
                  <span>🤝 Development aid</span>
                  <span className="num" style={{ color: "#5a8a3f", fontWeight: 600 }}>+{turnPreview.commonsInflow.toFixed(1)} <span style={S.causalUnit}>/turn</span></span>
                </div>
              )}
              {showNotes && (
                <div style={S.effectNote}>
                  {turnPreview.marketInflow > 0 && "Outside capital flows toward stable, extractive economies (high rule of law + extractive sectors)."}
                  {turnPreview.commonsInflow > 0 && turnPreview.marketInflow === 0 && "Development partners support health-and-education-led local economies."}
                </div>
              )}
            </div>
          )}

          {/* Dutch disease */}
          {turnPreview.dutchDiseasePenalty > 0.02 && (
            <div style={{ ...S.effectCard, borderColor: "#c98a3a" }}>
              <div style={{ ...S.effectHeader, color: "#a83a1a" }}>⚠ Resource curse active</div>
              <div style={S.effectRow}>
                <span>Local sectors output reduced by</span>
                <span className="num" style={{ color: "#a83a1a", fontWeight: 600 }}>−{(turnPreview.dutchDiseasePenalty * 100).toFixed(0)}%</span>
              </div>
              {showNotes && (
                <div style={S.effectNote}>
                  Extractive sectors at {(turnPreview.extractiveShare * 100).toFixed(0)}% are crowding out local economies. High-wage extractive jobs pull talent, drive up costs, and hollow out crops, services, and cooperatives. This is the boom-town pathology.
                </div>
              )}
            </div>
          )}

          {/* Community absorption */}
          {turnPreview.communityAbsorption > 0.05 && (
            <div style={{ ...S.effectCard, borderColor: "#3f8a7a" }}>
              <div style={{ ...S.effectHeader, color: "#3f8a7a" }}>🛡 Community shock buffer</div>
              <div style={S.effectRow}>
                <span>Shocks weakened by</span>
                <span className="num" style={{ color: "#5a8a3f", fontWeight: 600 }}>−{(turnPreview.communityAbsorption * 100).toFixed(0)}%</span>
              </div>
              {showNotes && (
                <div style={S.effectNote}>
                  {(turnPreview.localAllocShare * 100).toFixed(0)}% of labor in local/worker-owned sectors. Strong commons absorb shocks — Mondragón retained all workers through 2008. Worker sectors take an additional 30% less shock damage.
                </div>
              )}
            </div>
          )}

          {state.revealedPaths.includes("commons") && (
            <>
              <div style={S.divider} />
              <h2 style={S.h2}>Equity</h2>
              <div style={S.equityExplainer}>
                <strong>Gini coefficient</strong> measures wage inequality: 0 = everyone earns the same, 1 = one person has it all. Real world: Denmark 0.27, Germany 0.32, US 0.41, Brazil 0.52.<br/>
                <strong>Median welfare</strong> is what a typical worker earns. Welfare × (1 − Gini) is the composite that rewards both lifting the median AND keeping the spread tight.
              </div>
              <div style={S.metricRow}>
                <span>Gini coefficient</span>
                <span className="num" style={{ color: turnPreview.gini <= 0.35 ? "#5a8a3f" : turnPreview.gini <= 0.45 ? "#c98a3a" : "#a83a1a", fontWeight: 600 }}>
                  {turnPreview.gini.toFixed(2)}
                </span>
              </div>
              <div style={S.metricRow}>
                <span>Median welfare</span>
                <span className="num" style={{ color: turnPreview.medianWelfare >= 60 ? "#5a8a3f" : turnPreview.medianWelfare >= 40 ? "#c98a3a" : "#a83a1a", fontWeight: 600 }}>
                  {turnPreview.medianWelfare.toFixed(0)}
                </span>
              </div>
              <div style={S.metricRow}>
                <span>Welfare × Equity (commons score)</span>
                <span className="num" style={{ color: turnPreview.welfareEquity >= 50 ? "#5a8a3f" : "#c98a3a", fontWeight: 600 }}>
                  {turnPreview.welfareEquity.toFixed(0)}
                </span>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "public" && (
        <section style={S.panel}>
          <h2 style={S.h2}>Public goods (vowels)</h2>
          {showNotes && (<div style={S.note}>Costs vary by terrain. Past level 3, returns diminish. Higher levels cost more to maintain.</div>)}

          {/* Maintenance budget overview */}
          <div style={{
            ...S.investorPanel,
            background: turnPreview.maintenanceShortfall > 0 ? "#fce8db" : "#fef8e8",
            borderColor: turnPreview.maintenanceShortfall > 0 ? "#a83a1a" : "#d8c4a0"
          }}>
            <div style={S.urbanHeader}>
              <span style={S.urbanLabel}>Infrastructure maintenance</span>
              <span className="num" style={{
                fontSize: 14,
                fontWeight: 700,
                color: turnPreview.maintenanceShortfall > 0 ? "#a83a1a" : "#5a4e3a"
              }}>
                {turnPreview.maintenancePaid.toFixed(0)} / {turnPreview.totalMaintenanceCost.toFixed(0)} per turn
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#5a4e3a", marginTop: 4, lineHeight: 1.4 }}>
              {turnPreview.maintenanceShortfall > 0
                ? `⚠ Shortfall of ${turnPreview.maintenanceShortfall.toFixed(0)} treasury. After 3 turns underfunded, infrastructure decays.`
                : `Treasury covers all maintenance. Tax (${turnPreview.taxes.toFixed(0)}/turn) is funding upkeep.`}
            </div>
          </div>

          {Object.keys(VOWELS).map(k => {
            const v = VOWELS[k];
            const level = state.vowels[k];
            const cost = vowelCost(k, level, state.biome);
            const affordable = state.treasury >= cost;
            const biomeMult = biomeData.vowelCostMult[k] || 1;
            const vHints = getVowelHints(k);
            const maintenance = vowelMaintenance(k, level, state.biome);
            const arrears = (state.maintenanceArrears || {})[k] || 0;
            const funded = turnPreview.fundedVowels && turnPreview.fundedVowels[k];
            return (
              <div key={k} style={S.vowelCard}>
                <div style={S.vowelTop}>
                  <div style={S.vowelName}>
                    {v.name}
                    {biomeMult < 0.95 && <span style={S.bonusTag}>cheap</span>}
                    {biomeMult > 1.2 && <span style={S.penaltyTag}>costly</span>}
                  </div>
                  <div style={S.vowelLevelTag}><span className="num">lvl {level}</span></div>
                </div>
                {maintenance > 0 && (
                  <div style={S.maintenanceRow}>
                    <span style={{ fontSize: 11, color: arrears >= 2 ? "#a83a1a" : arrears >= 1 ? "#c98a3a" : "#7a6a4a" }}>
                      Upkeep: <span className="num">{maintenance}/turn</span>
                      {!funded && arrears > 0 && (
                        <span style={{ marginLeft: 6, fontWeight: 700, color: arrears >= 2 ? "#a83a1a" : "#c98a3a" }}>
                          ⚠ underfunded {arrears}/3 turns
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div style={S.vowelDotsRow}>
                  {Array.from({ length: Math.max(6, level + 2) }).map((_, i) => (
                    <span key={i} style={{
                      ...S.dot,
                      background: i < level ? (i < 3 ? "#8a3f1a" : "#5a3f8a") : "transparent",
                      borderColor: i < 3 ? "#8a3f1a" : "#5a3f8a",
                    }} />
                  ))}
                </div>
                {showNotes && <div style={S.vowelWhy}>{v.why}</div>}
                {(() => {
                  const eff = buildingEffects(k, level);
                  const effLevel = effectiveVowelLevel(k, state.vowels);
                  const isPhantom = effLevel < level;
                  const nextLevel = level + 1;
                  const nextPrereqs = VOWEL_PREREQS[k] && VOWEL_PREREQS[k][nextLevel];
                  let nextPrereqUnmet = null;
                  if (nextPrereqs) {
                    for (const reqKey in nextPrereqs) {
                      if (state.vowels[reqKey] < nextPrereqs[reqKey]) {
                        nextPrereqUnmet = `${VOWELS[reqKey].name} ${nextPrereqs[reqKey]}`;
                        break;
                      }
                    }
                  }
                  const contrib = turnPreview.marginalContributions && turnPreview.marginalContributions.vowels[k];
                  return (
                    <div style={S.buildingEffects}>
                      {showNotes && <div style={S.buildingNow}><strong>Now:</strong> {eff.current}</div>}
                      {contrib && (contrib.valueLoss > 0.5 || contrib.valueLossOne > 0.5) && (
                        <div style={S.contribInline}>
                          <strong>This is generating:</strong> {contrib.valueLoss > 0.5 && `${contrib.valueLoss.toFixed(0)} total value/turn (vs lvl 1)`}
                          {contrib.valueLossOne > 0.5 && `, ${contrib.valueLossOne.toFixed(0)} from this level alone`}
                        </div>
                      )}
                      {contrib && contrib.valueLoss < 0.5 && contrib.valueLossOne < 0.5 && level > 1 && (
                        <div style={{ ...S.contribInline, color: "#c98a3a" }}>
                          <strong>Currently underutilized:</strong> no active sector needs this level. Saves {contrib.maintenanceSaved}/turn maintenance if reduced.
                        </div>
                      )}
                      {isPhantom && (
                        <div style={{ ...S.buildingNext, color: "#a83a1a", fontWeight: 600 }}>
                          ⚠ Level {level} is phantom: effective only at lvl {effLevel}. Build prerequisites first.
                        </div>
                      )}
                      {affordable && !nextPrereqUnmet && (
                        <div style={S.buildingNext}>
                          <strong>If you build:</strong> {eff.next}
                          {(() => {
                            const newMaintenance = vowelMaintenance(k, level + 1, state.biome);
                            const maintenanceIncrease = newMaintenance - maintenance;
                            return maintenanceIncrease > 0 ? (
                              <span style={{ color: "#a83a1a", fontWeight: 600 }}> +{maintenanceIncrease}/turn upkeep.</span>
                            ) : null;
                          })()}
                        </div>
                      )}
                      {affordable && nextPrereqUnmet && (
                        <div style={{ ...S.buildingNext, color: "#c98a3a" }}>
                          ⚠ Building lvl {nextLevel} requires {nextPrereqUnmet} first. Otherwise it's wasted.
                        </div>
                      )}
                    </div>
                  );
                })()}
                {showHints && vHints.up.filter(p => state.revealedPaths.includes(p)).length > 0 && (
                  <div style={S.vowelHints}>
                    Favored by: {vHints.up.filter(p => state.revealedPaths.includes(p)).map(p => (
                      <span key={p} style={{ ...S.hintArrow, background: PATHS[p].color, marginLeft: 4 }}>{PATHS[p].name}</span>
                    ))}
                  </div>
                )}
                <div style={S.vowelBottom}>
                  <span style={S.vowelEffective}>effective: <span className="num">{vowelEffective(level).toFixed(1)}</span></span>
                  <button onClick={() => buyVowel(k)} disabled={!affordable} style={{
                    ...S.buildBtn,
                    background: affordable ? "#8a3f1a" : "#d8c4a0",
                    color: affordable ? "#fdf6e3" : "#7a6a4a",
                  }}>
                    build · <span className="num">{cost}</span>
                  </button>
                </div>
              </div>
            );
          })}

          <div style={S.divider} />
          <div style={S.logBox}>
            <div style={S.logTitle}>Recent moves</div>
            {state.log.map((line, i) => (
              <div key={i} style={{ ...S.logLine, opacity: 1 - i * 0.12 }}>{line}</div>
            ))}
          </div>
        </section>
      )}

      {tab === "unlocks" && (
        <section style={S.panel}>
          <h2 style={S.h2}>Adjacent possible</h2>
          {showNotes && (<div style={S.note}>Next reachable sectors. Higher tiers hidden until earlier reach.</div>)}

          {nextUnlocks.length === 0 && (
            <div style={S.emptyState}>All visible sectors unlocked.</div>
          )}

          {nextUnlocks.map(([sectorKey, check]) => {
            const sect = SECTORS[sectorKey];
            const ready = check.ready;
            return (
              <div key={sectorKey} style={{
                ...S.unlockCard,
                borderColor: ready ? "#5a8a3f" : "#d8c4a0",
                background: ready ? "#f0f5e0" : "#fdf6e3",
              }}>
                <div style={S.unlockHeader}>
                  <div>
                    <div style={{ ...S.unlockName, color: sect.color }}>{sect.name}</div>
                    <div style={S.unlockBlurb}>{sect.blurb}</div>
                  </div>
                  <div style={S.tierBadge}>tier {check.tier}</div>
                </div>
                <div style={S.unlockChecks}>
                  {check.checks.map((c, i) => (
                    <div key={i} style={S.checkRow}>
                      <span style={{ ...S.checkMark, color: c.ok ? "#5a8a3f" : "#a83a1a" }}>{c.ok ? "✓" : "·"}</span>
                      <span style={S.checkLabel}>{c.label}</span>
                      <span className="num" style={{ ...S.checkCurrent, color: c.ok ? "#5a8a3f" : "#7a6a4a" }}>{c.current}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => tryUnlock(sectorKey)} disabled={!ready} style={{
                  ...S.unlockBtn,
                  background: ready ? "#5a8a3f" : "#d8c4a0",
                  color: ready ? "#fdf6e3" : "#7a6a4a",
                }}>
                  {ready ? "✦ Unlock now" : "Requirements not met"}
                </button>
              </div>
            );
          })}

          <div style={S.divider} />
          <h2 style={S.h2}>Achievements</h2>
          {showNotes && (<div style={S.note}>Side quests naming what you've built. Some require sustained conditions, some are pathologies to avoid.</div>)}
          <div style={S.achievementSummary}>
            <span className="num">{(state.achievements || []).length}</span> of {Object.keys(ACHIEVEMENTS).length} earned
          </div>
          {Object.entries(ACHIEVEMENTS).map(([aid, a]) => {
            const earned = (state.achievements || []).includes(aid);
            return (
              <div key={aid} style={{
                ...S.achievementListItem,
                opacity: earned ? 1 : 0.55,
                borderColor: earned ? (a.tone === "cautionary" ? "#c98a3a" : "#5a8a3f") : "#d8c4a0",
              }}>
                <div style={S.achievementListHeader}>
                  <span style={{ fontSize: 14 }}>{earned ? (a.tone === "cautionary" ? "⚠" : "✦") : "○"}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: earned ? (a.tone === "cautionary" ? "#a83a1a" : "#3a4a25") : "#7a6a4a" }}>{a.name}</span>
                </div>
                <div style={{ fontSize: 11, color: "#5a4e3a", marginTop: 4, marginLeft: 22 }}>{a.description}</div>
                {earned && <div style={{ fontSize: 11, color: "#7a6a4a", fontStyle: "italic", marginTop: 4, marginLeft: 22 }}>{a.realWorld}</div>}
              </div>
            );
          })}

          {state.firstMilestone && (
            <>
              <div style={S.divider} />
              <h2 style={S.h2}>Configuration lock</h2>
              <div style={{
                ...S.unlockCard,
                borderColor: "#8a3f1a",
                background: "#fef3d8",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#8a3f1a", marginBottom: 6 }}>
                  First milestone reached: {state.firstMilestone === "capability" ? "Capability-led" : state.firstMilestone === "commons" ? "Commons-led" : "Market-led"}
                </div>
                <div style={{ fontSize: 12, color: "#3a3225", lineHeight: 1.5 }}>
                  {state.firstMilestone === "capability" && "Your developmental state has structural commitments. Tax floor 18% (no austerity). Investor interest capped at 60% (foreign capital sees you as expensive). Pursuing market path now requires breaking your institutional foundation."}
                  {state.firstMilestone === "commons" && "Your social contract is solidaristic. Wage floor 45% (workers have organized). Capital flight triggers more easily on any market pivot. The Mondragón path is now your political identity."}
                  {state.firstMilestone === "market" && "Capital concentration is structurally locked in. Commons score capped at 30. Worker-owned sectors take 30% productivity penalty (their political space is foreclosed). The accumulation has costs you cannot reverse."}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "debug" && (
        <section style={S.panel}>
          <h2 style={S.h2}>Debug log</h2>
          {showNotes && (<div style={S.note}>Full game state turn-by-turn. Copy and share for tuning feedback.</div>)}

          <DebugLogPanel debugLog={state.debugLog || []} />
        </section>
      )}

      <div style={S.stickyBar}>
        <button onClick={advanceTurn} disabled={!!state.gameOver} style={{
          ...S.advanceBtn,
          background: state.turn >= MAX_TURNS - 3 && !state.gameOver ? "#a83a1a" : "#2a2218",
        }}>
          {state.gameOver ? "Game over" : state.turn >= MAX_TURNS - 3 ? `Advance turn (${MAX_TURNS - state.turn} left)` : "Advance turn →"}
        </button>
        <button onClick={reset} style={S.resetBtn}>change biome</button>
      </div>

      <section style={S.reflectionBox}>
        <h2 style={S.h2}>Reflection</h2>
        <div style={S.note}>How did this place shape your choices? What did the terrain make easy or impossible?</div>
        <textarea value={reflection} onChange={(e) => setReflection(e.target.value)}
          placeholder="Your read of the system..." style={S.textarea} />
      </section>

      <footer style={S.footer}>
        Geography is not destiny but it is friction. Hausmann would say capabilities can overcome it. Scott would say the terrain remembers.
      </footer>
    </div>
  );
}

// ============ BIOME SELECT ============
function BiomeSelect({ onSelect }) {
  return (
    <>
      <style>{globalCSS}</style>
      <div style={S.biomeWrap}>
        <div style={S.eyebrow}>Choose your place</div>
        <h1 style={S.h1}>Where do you begin?</h1>
        <div style={S.sub}>
          The terrain doesn't decide the story, but it shapes what's easy, what's expensive, and what's never going to happen here.
        </div>

        <div style={S.pathPrimer}>
          <div style={S.pathPrimerTitle}>Three paths will reveal themselves through your choices</div>
          {Object.entries(PATHS).map(([k, p]) => (
            <div key={k} style={S.pathPrimerCard}>
              <div style={{ ...S.pathPrimerName, color: p.color }}>{p.name}</div>
              <div style={S.pathPrimerBlurb}>{p.blurb}</div>
              <div style={S.pathPrimerTrigger}>To trigger: {p.triggerLabel}</div>
            </div>
          ))}
          <div style={S.pathPrimerNote}>
            20 turns. At the end, scored against all three. No single winner.
          </div>
        </div>

        {Object.keys(BIOMES).map(k => {
          const b = BIOMES[k];
          return (
            <button key={k} onClick={() => onSelect(k)} style={{ ...S.biomeCard, borderColor: b.color }}>
              <div style={S.biomeTop}>
                <span style={S.biomeIcon}>{b.icon}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ ...S.biomeName, color: b.color }}>{b.name}</div>
                  <div style={S.biomeChar}>{b.character}</div>
                </div>
              </div>
              <div style={S.biomeBlurb}>{b.blurb}</div>
              <div style={S.biomeAdvantages}>
                <div style={S.biomeAdvCol}>
                  <div style={S.biomeAdvLabel}>Advantaged</div>
                  {Object.entries(b.sectorMult).filter(([s, v]) => v >= 1.3).map(([s, v]) => (
                    <div key={s} style={{ ...S.biomeAdvItem, color: SECTORS[s].color }}>
                      ↑ {SECTORS[s].name} <span className="num">×{v.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                <div style={S.biomeAdvCol}>
                  <div style={S.biomeAdvLabel}>Limited</div>
                  {Object.entries(b.sectorMult).filter(([s, v]) => v <= 0.7 && v > 0).map(([s, v]) => (
                    <div key={s} style={{ ...S.biomeAdvItem, color: "#7a6a4a" }}>
                      ↓ {SECTORS[s].name} <span className="num">×{v.toFixed(1)}</span>
                    </div>
                  ))}
                  {Object.entries(b.sectorAvailable).filter(([s, v]) => v === false).map(([s]) => (
                    <div key={s} style={{ ...S.biomeAdvItem, color: "#a83a1a" }}>
                      ✕ {SECTORS[s].name} unavailable
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.biomeShocks}>
                <span style={S.biomeShockLabel}>Common shocks:</span> {Object.entries(b.shockBias).filter(([s, v]) => v >= 1.5).map(([s]) => SHOCKS[s].name).join(", ")}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ============ HELPERS & SUBCOMPONENTS ============
function Stat({ label, value }) {
  return <div style={S.stat}><div style={S.statLabel}>{label}</div><div className="num" style={S.statValue}>{value}</div></div>;
}
function Pill({ label, val }) {
  return <div style={S.pill}><span style={S.pillLabel}>{label}</span><span className="num" style={S.pillVal}>{val}</span></div>;
}
function TabBtn({ active, onClick, children }) {
  return <button onClick={onClick} style={{ ...S.tabBtn, background: active ? "#2a2218" : "transparent", color: active ? "#f5ead5" : "#5a4e3a", borderColor: active ? "#2a2218" : "#d8c4a0" }}>{children}</button>;
}
function Distro({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "#3a3225" }}>
        <span>{label}</span><span className="num">{value.toFixed(0)}</span>
      </div>
      <div style={{ height: 12, background: "#ead5ab", borderRadius: 2, overflow: "hidden" }}>
        <div className="bar" style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}
// How close is the current state to triggering an un-revealed path?
function pathProximity(pathKey, state) {
  const checks = [];
  if (pathKey === "capability") {
    checks.push({ label: `R&D ≥ 3`, current: state.vowels.rd, target: 3, ok: state.vowels.rd >= 3 });
    checks.push({ label: `Schools ≥ 3`, current: state.vowels.schools, target: 3, ok: state.vowels.schools >= 3 });
    checks.push({ label: `Tax ≥ 20%`, current: `${(state.taxRate * 100).toFixed(0)}%`, target: "20%", ok: state.taxRate >= 0.20 });
  }
  if (pathKey === "commons") {
    const localShare = (state.allocation.services || 0) + (state.allocation.cooperatives || 0) + (state.allocation.ecotourism || 0);
    checks.push({ label: `Wages ≥ 55%`, current: `${(state.wageBargain * 100).toFixed(0)}%`, target: "55%", ok: state.wageBargain >= 0.55 });
    checks.push({ label: `Local sectors ≥ 30%`, current: `${(localShare * 100).toFixed(0)}%`, target: "30%", ok: localShare >= 0.30 });
    checks.push({ label: `Health ≥ 2`, current: state.vowels.health, target: 2, ok: state.vowels.health >= 2 });
  }
  if (pathKey === "market") {
    const extShare = (state.allocation.mining || 0) + (state.allocation.tourism || 0) + (state.allocation.finance || 0);
    checks.push({ label: `Tax ≤ 12%`, current: `${(state.taxRate * 100).toFixed(0)}%`, target: "12%", ok: state.taxRate <= 0.12 });
    checks.push({ label: `Extractive ≥ 35%`, current: `${(extShare * 100).toFixed(0)}%`, target: "35%", ok: extShare >= 0.35 });
    checks.push({ label: `Wages ≤ 40%`, current: `${(state.wageBargain * 100).toFixed(0)}%`, target: "40%", ok: state.wageBargain <= 0.40 });
  }
  const okCount = checks.filter(c => c.ok).length;
  return { checks, okCount, total: checks.length, ratio: okCount / checks.length };
}

function rungColor(i) { return ["#b8a87c", "#8a9a5a", "#3f7a8a", "#8a3f5a"][i]; }

// What does each building level provide?
function buildingEffects(key, level) {
  const effects = {
    roads: {
      0: "Crops and tourism limited (need roads 1).",
      1: "Crops and tourism active. Manufacturing limited (need roads 2).",
      2: "Manufacturing and finance enabled. Logistics smoother.",
      3: "Mining and specialized at full effectiveness. Infrastructure for advanced sectors.",
      4: "Research and regenerative get logistics boost. Diminishing returns past here.",
    },
    port: {
      0: "No exports. Tourism and finance limited.",
      1: "Basic trade. Light tourism. Food imports start.",
      2: "Manufacturing exports. Cheap food imports. Foreign capital can flow.",
      3: "Finance & finance reaches full potential. Maximum trade leverage.",
      4: "Hub-port economy. Massive trade flows. Diminishing returns.",
    },
    schools: {
      0: "No worker training. Workforce stuck unskilled.",
      1: "Slow training to semi-skilled. Crops, services run.",
      2: "Faster training. Mining, agritech, ecotourism unlocked.",
      3: "Skilled workers train fast. Manufacturing, specialized, finance unlocked.",
      4: "+15% training speed. Research enabled. High-complexity sectors reach full output.",
      5: "+30% training speed. Reduces rural brain drain.",
    },
    health: {
      0: "Workers can't accumulate skill. Training halved.",
      1: "Baseline. Food crises cause unrecoverable penalty.",
      2: "Health 2: penalty recovers 5%/turn when food covered. 25% protection against new penalty.",
      3: "Health 3: 10%/turn recovery, 50% protection. Better workforce stability.",
      4: "Health 4: full shock protection on health-related shocks (drought).",
      5: "Health 5: workforce demographic stability, retirement rate reduced.",
    },
    rd: {
      0: "No high-complexity sectors. Capability path blocked.",
      1: "Manufacturing unlocked. Agritech possible.",
      2: "Specialized manufacturing unlocked. Some sectors run efficient.",
      3: "Capability path triggers (with tax+schools). Research enabled. Regenerative possible.",
      4: "+10% productivity on tier 2+ sectors. Frontier R&D.",
      5: "+20% productivity on tier 2+ sectors. Diminishing returns past 5.",
      6: "Pure prestige; cost-benefit collapses past 5.",
    },
    ruleOfLaw: {
      0: "No outside investment possible. Finance blocked.",
      1: "Basic property rights. Mining/tourism can operate.",
      2: "Foreign capital starts flowing. Investor interest gains 17%.",
      3: "Capital flows stable. Finance unlocks. Investor interest gains 26%.",
      4: "Investor interest at 35% from rule of law. Market inflows maximized.",
      5: "Diminishing returns past here.",
    },
  };
  const e = effects[key] || {};
  const current = e[level] || "No documented effect at this level.";
  const next = e[level + 1] || "No further upgrade modeled.";
  return { current, next };
}

// Diagnose a path: what's helping, what's blocking, what to do next
function diagnosePath(pathKey, state, t) {
  const helping = [];
  const blocking = [];
  const next = [];

  if (pathKey === "capability") {
    if (state.vowels.rd >= 3) helping.push("R&D at level 3+");
    else blocking.push(`R&D only at level ${state.vowels.rd} (need 3+)`);
    if (state.vowels.schools >= 3) helping.push("Schools at level 3+");
    else blocking.push(`Schools at level ${state.vowels.schools} (need 3+)`);
    const skilledShare = (state.workforce[2] + state.workforce[3]) / state.population;
    if (skilledShare >= 0.15) helping.push(`${(skilledShare * 100).toFixed(0)}% skilled workers`);
    else blocking.push(`Only ${(skilledShare * 100).toFixed(0)}% skilled workers (need 15%+)`);
    const hasT2 = Object.keys(state.unlocked).some(k => SECTORS[k]?.tier === 2);
    if (hasT2) helping.push("Tier 2 sector unlocked");
    else next.push("Unlock a Tier 2 sector (manufacturing or specialized)");
    if (t.complexityScore < 220) next.push(`Allocate more workers to high-complexity sectors (current: ${t.complexityScore.toFixed(0)}/220)`);
  }

  if (pathKey === "commons") {
    if (state.wageBargain >= 0.55) helping.push(`Wage bargain at ${(state.wageBargain * 100).toFixed(0)}%`);
    else blocking.push(`Wage bargain at ${(state.wageBargain * 100).toFixed(0)}% (need 55%+)`);
    if (state.vowels.health >= 2) helping.push("Health funded");
    else blocking.push(`Health at level ${state.vowels.health} (need 2+)`);
    // Local ownership analysis
    let localValue = 0, totalValue = 0;
    for (const s in t.sectorResults) {
      const r = t.sectorResults[s];
      totalValue += r.value;
      if (SECTORS[s].ownerType === "worker" || SECTORS[s].ownerType === "local") localValue += r.value;
    }
    const localShare = totalValue > 0 ? localValue / totalValue : 0;
    if (localShare >= 0.6) helping.push(`${(localShare * 100).toFixed(0)}% value from local/worker-owned sectors`);
    else blocking.push(`Only ${(localShare * 100).toFixed(0)}% value from local sectors (shift away from mining/tourism/finance)`);
    if (t.gini <= 0.35) helping.push(`Gini ${t.gini.toFixed(2)} (low inequality, like Germany or Canada)`);
    else next.push(`Gini ${t.gini.toFixed(2)} too high; lift wages or reduce extractive sectors`);
    if (state.unlocked.cooperatives) helping.push("Cooperatives unlocked");
    else next.push("Unlock Worker Cooperatives (requires services active, wage bargain 55%+, schools 2+, health 2+)");
  }

  if (pathKey === "market") {
    if (state.taxRate <= 0.10) helping.push(`Low tax at ${(state.taxRate * 100).toFixed(0)}%`);
    else blocking.push(`Tax at ${(state.taxRate * 100).toFixed(0)}% (target ≤10%)`);
    if (state.wageBargain <= 0.35) helping.push(`Wages low at ${(state.wageBargain * 100).toFixed(0)}%`);
    else blocking.push(`Wages at ${(state.wageBargain * 100).toFixed(0)}% (target ≤35%)`);
    const extractiveShare = (state.allocation.mining || 0) + (state.allocation.tourism || 0) + (state.allocation.finance || 0);
    if (extractiveShare >= 0.40) helping.push(`${(extractiveShare * 100).toFixed(0)}% in extractive sectors`);
    else blocking.push(`Only ${(extractiveShare * 100).toFixed(0)}% in mining/tourism/finance (target 40%+)`);
    if (state.vowels.ruleOfLaw >= 2) helping.push("Rule of law funded (attracts outside capital)");
    else next.push(`Rule of law at level ${state.vowels.ruleOfLaw} (need 2+ for stable capital inflows)`);
    if (t.accumulatedCapital < 1500) next.push(`Need ${(1500 - t.accumulatedCapital).toFixed(0)} more accumulated capital`);
  }

  return { helping, blocking, next };
}

// Real-world reference points for metrics
function metricContext(pathKey, score) {
  if (pathKey === "capability") {
    if (score < 40) return "Subsistence economy. Bangladesh, Ethiopia range.";
    if (score < 100) return "Early manufacturing. Vietnam, Indonesia range.";
    if (score < 180) return "Mid-complexity. Thailand, Mexico range.";
    if (score < 300) return "Advanced manufacturing. South Korea, Czech Republic range.";
    return "Frontier economy. Germany, Singapore range.";
  }
  if (pathKey === "commons") {
    if (score < 15) return "High inequality, narrow value capture. US South or extractive economies.";
    if (score < 35) return "Mixed economy with moderate inequality. UK, France range.";
    if (score < 50) return "Approaching Nordic-style social democracy.";
    if (score < 70) return "Strong worker welfare and equity. Denmark, Sweden range.";
    return "Mondragón-style cooperative deep commons.";
  }
  if (pathKey === "market") {
    if (score < 400) return "Limited capital base. Frontier or pre-industrial.";
    if (score < 900) return "Emerging capital markets. Brazil, Indonesia range.";
    if (score < 1500) return "Functional capital economy. Chile, Malaysia range.";
    if (score < 2500) return "Capital-intensive resource economy. Australia, UAE range.";
    return "Saudi or Norwegian sovereign-wealth scale extraction.";
  }
  return "";
}

// Gini interpretation
function giniContext(gini) {
  if (gini < 0.25) return "very equal (Slovenia, Czech)";
  if (gini < 0.32) return "Nordic equality (Denmark, Sweden)";
  if (gini < 0.38) return "EU average (Germany, France)";
  if (gini < 0.45) return "US-level inequality";
  if (gini < 0.52) return "Latin America range (Mexico, Argentina)";
  return "extreme inequality (Brazil, South Africa)";
}
function shade(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent, g = ((num >> 8) & 0x00ff) + percent, b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
function getLeverHints(lever, currentVal) {
  switch (lever) {
    case "wageBargain": return { up: ["commons"], down: ["market"], neutral: currentVal >= 0.45 && currentVal <= 0.65 ? ["capability"] : [] };
    case "taxRate": return { up: ["capability", "commons"], down: ["market"], neutral: [] };
    default: return { up: [], down: [], neutral: [] };
  }
}
function getSectorHints(sectorKey) {
  const sect = SECTORS[sectorKey];
  const hints = { up: [], down: [] };
  if (sect.complexity >= 4) hints.up.push("capability");
  if (sect.complexity <= 1 && sectorKey !== "services") hints.down.push("capability");
  if (sect.ownerType === "worker" || sect.ownerType === "local") {
    if (sect.wageCeiling >= 0.80) hints.up.push("commons");
  }
  if (sect.ownerType === "outside" && sect.wageFloor < 0.40) hints.down.push("commons");
  if (sect.ownerType === "outside" && sect.baseValue >= 20) hints.up.push("market");
  if (sect.ownerType === "worker") hints.down.push("market");
  return hints;
}
function getVowelHints(vowelKey) {
  const hints = { up: [] };
  if (vowelKey === "rd") hints.up.push("capability");
  if (vowelKey === "schools") hints.up.push("capability", "commons");
  if (vowelKey === "health") hints.up.push("commons");
  if (vowelKey === "ruleOfLaw") hints.up.push("market", "capability");
  if (vowelKey === "port") hints.up.push("market", "capability");
  if (vowelKey === "roads") hints.up.push("capability", "commons", "market");
  return hints;
}
function Stepper({ value, onDec, onInc, decDisabled, incDisabled, hints, revealedPaths, showHints }) {
  return (
    <div style={S.stepperRow}>
      <button onClick={onDec} disabled={decDisabled} style={S.stepperBtn}>−</button>
      <div style={S.stepperDisplay}>
        <span className="num" style={S.stepperValue}>{value}</span>
        {showHints && hints && (
          <div style={S.hintInline}>
            <div style={S.hintCol}>
              {hints.down && hints.down.filter(p => revealedPaths?.includes(p)).map(p => (
                <span key={p} style={{ ...S.hintArrow, background: PATHS[p].color }}>← {p[0].toUpperCase()}</span>
              ))}
            </div>
            <div style={S.hintCol}>
              {hints.up && hints.up.filter(p => revealedPaths?.includes(p)).map(p => (
                <span key={p} style={{ ...S.hintArrow, background: PATHS[p].color }}>{p[0].toUpperCase()} →</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={onInc} disabled={incDisabled} style={S.stepperBtn}>+</button>
    </div>
  );
}
function DebugLogPanel({ debugLog }) {
  const [copied, setCopied] = useState(false);
  const fullText = debugLog.join("\n\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback: select the textarea
      const ta = document.getElementById("debug-log-textarea");
      if (ta) { ta.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }
  };

  return (
    <>
      <div style={S.debugActions}>
        <button onClick={handleCopy} style={{
          ...S.debugCopyBtn,
          background: copied ? "#5a8a3f" : "#8a3f1a",
        }}>
          {copied ? "✓ copied" : "copy full log"}
        </button>
        <span style={S.debugMeta}>{debugLog.length} entries · {fullText.length} chars</span>
      </div>
      <textarea
        id="debug-log-textarea"
        value={fullText}
        readOnly
        style={S.debugTextarea}
        onClick={(e) => e.target.select()}
      />
      <div style={S.debugHint}>
        Tap inside the box to select all, or use the copy button. Paste this to Sean for tuning feedback.
      </div>
    </>
  );
}

function RevealModal({ reveal, onClose, reset, debugLog, onViewLog }) {
  const [copied, setCopied] = useState(false);

  const copyLog = async () => {
    if (!debugLog || debugLog.length === 0) return;
    const text = debugLog.join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // fallback handled in log panel
      setCopied(false);
    }
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} className="reveal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={S.modalCloseX} aria-label="Close">✕</button>
        {reveal.type === "path" && (<>
          <div style={S.modalEyebrow}>Path emerging</div>
          <div style={{ ...S.modalTitle, color: PATHS[reveal.payload].color }}>{PATHS[reveal.payload].name}</div>
          <div style={S.modalBody}>{PATHS[reveal.payload].blurb}</div>
          <div style={S.modalMeta}>
            <div style={{ marginBottom: 6 }}><strong>Trigger:</strong> {PATHS[reveal.payload].triggerLabel}</div>
            <div style={{ marginBottom: 6 }}><strong>Metric:</strong> {PATHS[reveal.payload].metric}</div>
            <div style={{ marginBottom: 6, fontStyle: "italic", fontSize: 12 }}>{PATHS[reveal.payload].metricExplainer}</div>
            <div style={{ marginBottom: 10 }}><strong>Milestone:</strong> {PATHS[reveal.payload].milestone}</div>
          </div>

          {reveal.payload === "capability" && (
            <div style={S.historyBlock}>
              <div style={S.historyHeader}>How others walked this path</div>
              <div style={S.historyItem}>
                <strong>South Korea (1962-1997):</strong> Park Chung-hee's developmental state. Public investment in steel, shipbuilding, and electronics. State-directed bank loans to chaebol conglomerates. Education as national priority. Result: per capita income from $100 to $14,000. Cost: authoritarian period, 1997 financial crisis when chaebol over-leveraged.
              </div>
              <div style={S.historyItem}>
                <strong>Singapore (1965-present):</strong> Lee Kuan Yew's state capitalism. EDB recruited multinationals selectively. Forced savings via CPF. Public housing for 80%. Top global ranks in education and complexity. Cost: tightly managed politics, limited free speech.
              </div>
              <div style={S.historyItem}>
                <strong>Tensions to watch:</strong> Capability requires patience and state capacity. The "middle income trap" hits when easy gains are exhausted but institutions aren't sophisticated enough for frontier innovation. Brazil and Argentina got stuck here.
              </div>
            </div>
          )}
          {reveal.payload === "commons" && (
            <div style={S.historyBlock}>
              <div style={S.historyHeader}>How others walked this path</div>
              <div style={S.historyItem}>
                <strong>Mondragón Corporation (Basque Country, 1956-present):</strong> Started by a priest, José María Arizmendiarrieta, after the Spanish Civil War. Today 81,000 worker-owners across 100+ cooperatives. Caja Laboral (worker-owned bank) finances expansion. Salary ratios capped at 1:9 (vs 1:350 in US firms). Survived 2008 with no layoffs — wages cut instead. Tension: foreign subsidiaries are not cooperatives.
              </div>
              <div style={S.historyItem}>
                <strong>Emilia-Romagna (Italy):</strong> 8,000+ cooperatives covering 30% of GDP. Strong public services, regional banking. Average income above national average, inequality below. Built over a century of patient institution-building.
              </div>
              <div style={S.historyItem}>
                <strong>Tensions to watch:</strong> Commons economies scale slowly and struggle to raise outside capital (since returns are capped). They're vulnerable to capture when nearby market economies poach talent with higher salaries. Maintaining the commons requires constant institutional renewal.
              </div>
            </div>
          )}
          {reveal.payload === "market" && (
            <div style={S.historyBlock}>
              <div style={S.historyHeader}>How others walked this path</div>
              <div style={S.historyItem}>
                <strong>Chile under Pinochet (1973-1990):</strong> The "Chicago Boys" implemented neoliberal reforms — privatized state firms, slashed taxes, dismantled labor protections. Foreign capital flowed in. GDP growth was strong but inequality spiked to the highest in OECD. The political cost: thousands killed, decades of disputed legitimacy. Inequality persists today and triggered the 2019 protests.
              </div>
              <div style={S.historyItem}>
                <strong>Saudi Arabia / Gulf states:</strong> Rentier model. Oil revenue + low taxes + imported labor. State accumulates massive sovereign wealth, but local population isn't productive — most work is done by migrants. Vision 2030 is trying to diversify before oil runs out. Norway's sovereign wealth fund is the rare exception that managed extraction without curse.
              </div>
              <div style={S.historyItem}>
                <strong>Tensions to watch:</strong> Market path produces accumulated capital fast but is brittle. Commodity crashes hit hard (1986 oil glut, 2014 oil collapse). Capital flight is always one shock away. Without strong institutions, extraction often ends with elite capture and hollowed-out local economies.
              </div>
            </div>
          )}
          <button onClick={onClose} style={S.modalBtn}>Continue</button>
        </>)}
        {reveal.type === "unlock" && (<>
          <div style={S.modalEyebrow}>Sector unlocked</div>
          <div style={{ ...S.modalTitle, color: SECTORS[reveal.payload].color }}>{SECTORS[reveal.payload].name}</div>
          <div style={S.modalBody}>{SECTORS[reveal.payload].blurb}</div>
          <button onClick={onClose} style={S.modalBtn}>Continue</button>
        </>)}
        {reveal.type === "shock" && (<>
          <div style={{ ...S.modalEyebrow, color: "#a83a1a" }}>⚡ Shock event</div>
          <div style={{ ...S.modalTitle, color: "#a83a1a" }}>{SHOCKS[reveal.payload].name}</div>
          <div style={S.modalBody}>{SHOCKS[reveal.payload].blurb}</div>
          <div style={S.modalMeta}>Affected sectors lose {(SHOCKS[reveal.payload].severity * 100).toFixed(0)}% for 2 turns.</div>
          <button onClick={onClose} style={S.modalBtn}>Brace</button>
        </>)}
        {reveal.type === "milestone" && (<>
          <div style={S.modalEyebrow}>✦ Milestone reached</div>
          <div style={{ ...S.modalTitle, color: PATHS[reveal.payload].color }}>{PATHS[reveal.payload].name}</div>
          <div style={S.modalBody}>{PATHS[reveal.payload].milestone}</div>
          {reveal.payload === "capability" && (
            <div style={S.historyBlock}>
              <div style={S.historyHeader}>What economies do after this point</div>
              <div style={S.historyItem}>
                You've reached the complexity of Thailand, Mexico, or Czech Republic. Mid-complexity economies face a choice: keep pushing into advanced manufacturing and R&D (Korea, Taiwan, Singapore), or stagnate (Brazil, Argentina, Malaysia have all been stuck near this level for decades).
              </div>
              <div style={S.historyItem}>
                The "middle income trap" is real. Easy gains from cheap labor and tech transfer run out. Next-stage growth requires institutional reform, frontier R&D, and political stability — much harder than the catch-up phase.
              </div>
            </div>
          )}
          {reveal.payload === "commons" && (
            <div style={S.historyBlock}>
              <div style={S.historyHeader}>What economies do after this point</div>
              <div style={S.historyItem}>
                You're operating like Nordic social democracies or strong cooperative networks. The challenge ahead: maintaining the commons as the economy grows. Sweden's model held until financial deregulation in the 1990s. Denmark's flexicurity adapts to shocks.
              </div>
              <div style={S.historyItem}>
                The political work never ends. Every generation must re-commit to the social contract or it erodes. The Mondragón cooperatives constantly innovate their governance to prevent capture.
              </div>
            </div>
          )}
          {reveal.payload === "market" && (
            <div style={S.historyBlock}>
              <div style={S.historyHeader}>What economies do after this point</div>
              <div style={S.historyItem}>
                You've accumulated significant capital. The question is what you do with it. Norway built a sovereign wealth fund and saved for the future. The Gulf states are now scrambling to diversify away from oil before reserves drop. Most resource economies haven't managed this transition.
              </div>
              <div style={S.historyItem}>
                Risk now: capital flight, commodity crashes, and political instability from inequality. The accumulated wealth is real but fragile. Without institutional investment (rule of law, education, infrastructure), it can evaporate fast.
              </div>
            </div>
          )}
          <button onClick={onClose} style={S.modalBtn}>Continue</button>
        </>)}
        {reveal.type === "failure" && (<>
          <div style={{ ...S.modalEyebrow, color: "#a83a1a" }}>Game over</div>
          <div style={{ ...S.modalTitle, color: "#a83a1a" }}>{FAILURE_MODES[reveal.payload].name}</div>
          <div style={S.modalBody}>{FAILURE_MODES[reveal.payload].description}</div>
          <div style={S.modalLogRow}>
            <button onClick={copyLog} style={{
              ...S.modalSecondaryBtn,
              background: copied ? "#5a8a3f" : "#8a3f1a",
              color: "#fdf6e3",
            }}>
              {copied ? "✓ log copied" : "📋 copy log"}
            </button>
            <button onClick={onViewLog} style={S.modalSecondaryBtn}>
              view log
            </button>
          </div>
          <button onClick={reset} style={S.modalBtn}>Try again</button>
        </>)}
        {reveal.type === "complete" && (<>
          <div style={S.modalEyebrow}>20 turns. Final scorecard.</div>
          <div style={{ ...S.modalTitle, color: "#2a2218" }}>How did your story score?</div>
          <div style={S.modalBody}>
            No single winner. Three different judgments of the same economy.
          </div>
          <div style={{ marginBottom: 16 }}>
            {Object.entries(reveal.payload).map(([pk, s]) => {
              const p = PATHS[pk];
              const pct = Math.min(100, (s.score / s.target) * 100);
              return (
                <div key={pk} style={{ ...S.finalCard, borderColor: p.color }}>
                  <div style={{ ...S.finalName, color: p.color }}>
                    {s.hit ? "✦ " : ""}{p.name}
                    {s.hit && <span style={S.finalHit}>milestone reached</span>}
                  </div>
                  <div style={S.finalMetric}>{p.metric}</div>
                  <div style={S.pathBar}>
                    <div style={{ width: `${pct}%`, height: "100%", background: p.color, borderRadius: 2 }} />
                  </div>
                  <div style={S.finalScore}>
                    <span className="num">{s.score.toFixed(0)}</span> / <span className="num">{s.target}</span>
                    <span style={S.finalPct}>({pct.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={S.modalLogRow}>
            <button onClick={copyLog} style={{
              ...S.modalSecondaryBtn,
              background: copied ? "#5a8a3f" : "#8a3f1a",
              color: "#fdf6e3",
            }}>
              {copied ? "✓ log copied" : "📋 copy log"}
            </button>
            <button onClick={onViewLog} style={S.modalSecondaryBtn}>
              view log
            </button>
          </div>
          <button onClick={reset} style={S.modalBtn}>Try another place</button>
        </>)}
      </div>
    </div>
  );
}

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=JetBrains+Mono:wght@500&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
.bar { transition: width .4s ease, background-color .3s ease; }
button { font-family: inherit; cursor: pointer; touch-action: manipulation; }
button:disabled { opacity: 0.35; cursor: not-allowed; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.reveal { animation: slideIn 0.4s ease-out; }
`;

const S = {
  page: {
    minHeight: "100vh",
    background: "#f5ead5",
    backgroundImage: "radial-gradient(at 20% 10%, #f9efd9 0%, #f1e3c4 60%, #ead5ab 100%)",
    fontFamily: "'Fraunces', Georgia, serif",
    color: "#2a2218", padding: "20px 14px 100px",
    maxWidth: 640, margin: "0 auto",
  },
  // Biome select
  biomeWrap: { padding: "10px 0" },
  pathPrimer: { marginTop: 18, padding: "16px 16px", background: "#fef8e8", border: "1px solid #d8c4a0", borderRadius: 4 },
  pathPrimerTitle: { fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, color: "#5a4e3a", fontWeight: 700, marginBottom: 10 },
  pathPrimerCard: { padding: "8px 0", borderBottom: "1px solid #ead5ab" },
  pathPrimerName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  pathPrimerBlurb: { fontSize: 12, color: "#3a3225", marginBottom: 3, lineHeight: 1.4 },
  pathPrimerTrigger: { fontSize: 11, color: "#7a6a4a", fontStyle: "italic" },
  pathPrimerNote: { fontSize: 12, color: "#5a4e3a", marginTop: 10, fontWeight: 600, fontStyle: "italic" },
  biomeCard: {
    display: "block", width: "100%", textAlign: "left",
    background: "#fdf6e3", border: "2px solid", borderRadius: 6,
    padding: "16px 16px", marginTop: 14, fontFamily: "inherit",
    cursor: "pointer",
  },
  biomeTop: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  biomeIcon: { fontSize: 42, lineHeight: 1, flexShrink: 0 },
  biomeName: { fontSize: 22, fontWeight: 800, letterSpacing: -0.3, marginBottom: 4 },
  biomeChar: { fontSize: 13, color: "#5a4e3a", lineHeight: 1.4, fontStyle: "italic" },
  biomeBlurb: { fontSize: 13, color: "#3a3225", lineHeight: 1.5, marginBottom: 10 },
  biomeAdvantages: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 },
  biomeAdvCol: { fontSize: 12 },
  biomeAdvLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#8a6a3a", fontWeight: 600, marginBottom: 4 },
  biomeAdvItem: { fontWeight: 600, marginBottom: 2, fontSize: 12 },
  biomeShocks: { fontSize: 11, color: "#7a6a4a", paddingTop: 8, borderTop: "1px solid #ead5ab" },
  biomeShockLabel: { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontSize: 10, color: "#8a6a3a", marginRight: 4 },

  header: { marginBottom: 12 },
  headerBtns: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  eyebrow: { textTransform: "uppercase", letterSpacing: 1.5, fontSize: 10, color: "#8a6a3a", fontWeight: 600 },
  h1: { fontSize: 30, fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: "#5a4e3a", marginTop: 6, lineHeight: 1.45 },
  learnBtn: { background: "transparent", border: "1px solid #8a6a3a", padding: "8px 14px", borderRadius: 999, color: "#8a6a3a", fontSize: 13 },
  learn: { padding: "14px 16px", background: "#fef8e8", border: "1px solid #d8c4a0", borderRadius: 4, fontSize: 14, lineHeight: 1.55, color: "#3a3225", marginBottom: 12 },
  learnP: { margin: "0 0 10px" },
  thinker: { fontSize: 10, color: "#8a3f1a", textTransform: "uppercase", letterSpacing: 1, background: "#fef3d8", padding: "2px 6px", borderRadius: 2, marginLeft: 6, fontStyle: "normal", fontWeight: 600 },

  shockBanner: { padding: "10px 14px", background: "#a83a1a", color: "#fdf6e3", borderRadius: 4, marginBottom: 12, fontSize: 13, fontWeight: 600, textAlign: "center" },

  pathStrip: { display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 12 },
  pathCard: { background: "#fdf6e3", border: "2px solid", borderRadius: 4, padding: "10px 14px" },
  pathName: { fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 },
  pathMetric: { fontSize: 11, color: "#7a6a4a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  pathBar: { height: 8, background: "#ead5ab", borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  pathScore: { fontSize: 13, color: "#3a3225", fontWeight: 600 },
  pathTarget: { fontSize: 11, color: "#7a6a4a", fontWeight: 400 },
  expandHint: { fontSize: 10, color: "#7a6a4a", fontWeight: 400, marginLeft: "auto", fontStyle: "italic" },
  pathDiagnostic: { marginTop: 10, padding: "10px 12px", background: "#f5ead5", borderRadius: 3, border: "1px solid #ead5ab" },
  pathContext: { fontSize: 11, color: "#5a4e3a", fontStyle: "italic", marginBottom: 8, paddingBottom: 6, borderBottom: "1px dotted #d8c4a0", lineHeight: 1.4 },
  diagSection: { marginBottom: 6 },
  diagHeader: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#5a8a3f", fontWeight: 700, marginBottom: 2 },
  diagItem: { fontSize: 11, color: "#3a3225", lineHeight: 1.4, paddingLeft: 12, marginBottom: 2 },
  milestoneBadge: { color: "#c98a3a", fontSize: 14 },

  hintBox: { padding: "10px 14px", background: "#fef3d8", border: "1px dashed #c98a3a", borderRadius: 4, marginBottom: 12 },
  hintTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#8a6a3a", fontWeight: 600 },
  hintBody: { fontSize: 12, color: "#5a4e3a", marginTop: 3, lineHeight: 1.4 },
  discoveryPanel: { padding: "12px 14px", background: "#fef8e8", border: "1px solid #d8c4a0", borderRadius: 4, marginBottom: 12 },
  discoveryTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#5a4e3a", fontWeight: 700, marginBottom: 4 },
  discoveryNote: { fontSize: 11, color: "#7a6a4a", fontStyle: "italic", marginBottom: 10, lineHeight: 1.4 },
  discoveryCard: { padding: "8px 10px", border: "1.5px dashed", borderRadius: 3, marginBottom: 8, background: "#fdf6e3" },
  discoveryCardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  discoveryRatio: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#7a6a4a", fontWeight: 600 },
  discoveryChecks: { display: "flex", flexDirection: "column", gap: 2 },
  discoveryCheck: { display: "flex", alignItems: "center", gap: 6, fontSize: 11 },
  discoveryCheckMark: { fontSize: 13, fontWeight: 700, width: 12, textAlign: "center" },
  discoveryCheckLabel: { flex: 1 },
  discoveryCheckCur: { fontWeight: 600 },

  statusStrip: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12, position: "sticky", top: 0, zIndex: 10, padding: "8px 0", background: "#f5ead5" },
  stat: { background: "#fdf6e3", padding: "8px 12px", borderRadius: 4, border: "1px solid #e2cda3" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#8a6a3a", marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: 600, color: "#2a2218" },

  urbanPanel: { background: "#fdf6e3", border: "1px solid #d8c4a0", borderRadius: 4, padding: "10px 14px", marginBottom: 12 },
  investorPanel: { background: "#fdf6e3", border: "1px solid #d8c4a0", borderRadius: 4, padding: "10px 14px", marginBottom: 12 },
  cycleTrack: { display: "flex", marginTop: 6, marginBottom: 6 },
  cycleMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 4 },
  cycleAlignment: { display: "flex", alignItems: "baseline" },
  cycleHints: { fontSize: 11, color: "#5a4e3a", lineHeight: 1.4, padding: "6px 8px", background: "#fef8e8", borderRadius: 3, marginTop: 6 },
  maturityBox: { marginTop: 6, marginBottom: 8, padding: "6px 8px", background: "#fef8e8", borderRadius: 3, border: "1px solid #ead5ab" },
  maturityHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  maturityLabel: { fontSize: 10, color: "#7a6a4a", textTransform: "uppercase", letterSpacing: 0.5 },
  maturityTrack: { width: "100%", height: 6, background: "#ead5ab", borderRadius: 2, overflow: "hidden", marginTop: 4 },
  maturityNote: { fontSize: 11, color: "#5a4e3a", lineHeight: 1.4, marginTop: 4, fontStyle: "italic" },
  investorTrack: { width: "100%", height: 10, background: "#ead5ab", borderRadius: 2, overflow: "hidden", marginTop: 6, marginBottom: 6 },
  investorMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#5a4e3a" },
  whyBtn: { background: "transparent", border: "1px solid #8a6a3a", color: "#5a4e3a", fontSize: 11, padding: "3px 10px", borderRadius: 3, fontFamily: "inherit", cursor: "pointer", minHeight: 28 },
  investorWhyBox: { marginTop: 8, padding: "8px 10px", background: "#fef8e8", borderRadius: 3, border: "1px solid #ead5ab" },
  investorWhyTitle: { fontSize: 11, color: "#5a4e3a", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  investorWhyRow: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "#3a3225" },
  investorWhyNote: { fontSize: 11, color: "#5a4e3a", fontStyle: "italic", marginTop: 6, lineHeight: 1.4, paddingTop: 6, borderTop: "1px dotted #d8c4a0" },
  foodPanel: { background: "#fdf6e3", border: "1px solid #d8c4a0", borderRadius: 4, padding: "10px 14px", marginBottom: 12 },
  foodHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  foodStatus: { fontSize: 12, fontWeight: 600 },
  foodMetrics: { display: "flex", flexWrap: "wrap", gap: 12 },
  foodMetric: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  foodMetricLabel: { fontSize: 10, color: "#7a6a4a", textTransform: "uppercase", letterSpacing: 0.5 },
  foodMetricVal: { fontSize: 18, fontWeight: 700, color: "#2a2218" },
  foodWarning: { color: "#a83a1a", fontWeight: 600, fontSize: 12, marginTop: 8, padding: "6px 10px", background: "#fce8db", borderRadius: 3, border: "1px solid #e8b89a" },
  healthCostBox: { marginTop: 10, padding: "10px 12px", background: "#fce8db", borderRadius: 3, border: "1.5px solid #a83a1a" },
  healthCostHeader: { fontSize: 13, fontWeight: 700, color: "#a83a1a", marginBottom: 6 },
  healthCostBreakdown: { fontSize: 12, color: "#3a3225", lineHeight: 1.5 },
  urbanHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  urbanLabel: { fontSize: 12, color: "#5a4e3a", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 },
  urbanStatus: { fontSize: 12, fontWeight: 600 },
  urbanTrack: { display: "flex", height: 28, borderRadius: 3, overflow: "hidden", border: "1px solid #d8c4a0" },
  urbanRural: { background: "#8a9a5a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fdf6e3", transition: "width 0.4s ease" },
  urbanCity: { background: "#5a4660", display: "flex", alignItems: "center", justifyContent: "center", color: "#fdf6e3", transition: "width 0.4s ease" },
  urbanSegLabel: { fontSize: 11, fontWeight: 600 },
  driftHint: { fontSize: 11, color: "#7a6a4a", marginTop: 6, fontStyle: "italic" },

  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 4, marginBottom: 12 },
  tabBtn: { padding: "12px 4px", border: "1px solid", borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: "inherit", minHeight: 44 },
  badge: { background: "#a83a1a", color: "#fdf6e3", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, marginLeft: 4 },
  panel: { background: "#fdf6e3", border: "1px solid #d8c4a0", borderRadius: 4, padding: "16px 14px" },
  h2: { fontSize: 18, fontWeight: 600, margin: "0 0 6px", letterSpacing: -0.3 },
  note: { fontSize: 12, color: "#7a6a4a", marginBottom: 14, lineHeight: 1.5, fontStyle: "italic" },

  allocStackTrack: { display: "flex", height: 36, borderRadius: 4, overflow: "hidden", border: "1px solid #d8c4a0", background: "#ead5ab", marginBottom: 8 },
  allocStackSeg: { display: "flex", alignItems: "center", justifyContent: "center", transition: "width 0.3s ease", overflow: "hidden", borderRight: "1px solid rgba(253,246,227,0.4)" },
  allocStackLabel: { fontSize: 11, fontWeight: 600, color: "#fdf6e3", fontFamily: "'JetBrains Mono', monospace", textShadow: "0 1px 2px rgba(0,0,0,0.3)" },

  sectorBlock: { padding: "14px 0", borderTop: "1px solid #ead5ab" },
  sectorTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 },
  sectorName: { fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  shockTag: { fontSize: 14, color: "#a83a1a" },
  bonusTag: { fontSize: 10, background: "#5a8a3f", color: "#fdf6e3", padding: "2px 6px", borderRadius: 2, fontWeight: 700, letterSpacing: 0.5 },
  penaltyTag: { fontSize: 10, background: "#8a6a3a", color: "#fdf6e3", padding: "2px 6px", borderRadius: 2, fontWeight: 700, letterSpacing: 0.5 },
  sectorBlurb: { fontSize: 12, color: "#7a6a4a", marginTop: 2, lineHeight: 1.4 },
  sectorRight: { textAlign: "right", flexShrink: 0 },
  bigNum: { fontSize: 22, fontWeight: 600, color: "#2a2218", lineHeight: 1 },
  tinyLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#8a6a3a", marginTop: 2 },
  barTrack: { background: "#ead5ab", borderRadius: 3, height: 22, marginBottom: 8 },
  sectorMeta: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  pill: { background: "#f5ead5", border: "1px solid #e2cda3", borderRadius: 999, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 },
  pillLabel: { color: "#7a6a4a", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 },
  pillVal: { color: "#2a2218", fontWeight: 600 },
  binding: { color: "#a83a1a", fontWeight: 600, fontSize: 13, background: "#fce8db", padding: "6px 10px", borderRadius: 3, border: "1px solid #e8b89a", marginBottom: 8 },
  warning: { color: "#8a6a3a", fontSize: 12, background: "#fef3d8", padding: "6px 10px", borderRadius: 3, border: "1px solid #d8c4a0", marginBottom: 8 },
  allocBox: { marginTop: 6 },
  allocHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  allocLabel: { fontSize: 11, color: "#7a6a4a", textTransform: "uppercase", letterSpacing: 1 },

  rungRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  rungLabel: { width: 100, fontSize: 13, color: "#3a3225" },
  rungTrack: { flex: 1, height: 18, background: "#ead5ab", borderRadius: 2, overflow: "hidden" },
  rungCount: { width: 36, textAlign: "right", fontSize: 13, color: "#3a3225", fontWeight: 600 },
  divider: { height: 1, background: "#ead5ab", margin: "18px 0" },

  leverBlock: { marginBottom: 16 },
  leverLabel: { display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4, color: "#3a3225", fontWeight: 600 },
  leverNote: { fontSize: 11, color: "#7a6a4a", marginTop: 4, lineHeight: 1.5 },
  zoneStrip: { display: "flex", height: 16, marginTop: 4, marginBottom: 4, borderRadius: 2, overflow: "hidden", border: "1px solid #d8c4a0" },
  zone: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: "#5a4e3a", display: "flex", alignItems: "center", justifyContent: "center" },
  zoneLabel: { fontSize: 12, fontWeight: 600, marginTop: 4 },
  causalBox: { marginTop: 10, padding: "10px 12px", background: "#fef8e8", border: "1px solid #d8c4a0", borderRadius: 3 },
  causalRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, padding: "3px 0", borderBottom: "1px dotted #ead5ab", color: "#3a3225" },
  causalLabel: { color: "#5a4e3a" },
  causalVal: { fontWeight: 600 },
  causalUnit: { fontSize: 10, color: "#7a6a4a", fontWeight: 400, marginLeft: 4, fontStyle: "italic" },
  contribBox: { marginTop: 8, padding: "8px 10px", background: "#eaf0e0", borderRadius: 3, border: "1px solid #b8c89a" },
  contribHeader: { fontSize: 10, color: "#3a4a25", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 },
  contribRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0" },
  contribLabel: { fontSize: 12, color: "#3a4a25" },
  contribVal: { fontSize: 13, fontWeight: 600 },
  contribInline: { fontSize: 11, color: "#3a4a25", lineHeight: 1.4, paddingTop: 4, marginTop: 4, borderTop: "1px dotted #d8c4a0" },
  achievementBanner: { background: "#fdf6e3", border: "2px solid #5a8a3f", borderRadius: 6, padding: "12px 14px", marginBottom: 12, marginTop: 8, marginLeft: 16, marginRight: 16, boxShadow: "0 4px 12px rgba(90,138,63,0.2)" },
  achievementBannerHeader: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#3a4a25", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  achievementClose: { marginLeft: "auto", background: "transparent", border: "none", color: "#5a4e3a", fontSize: 18, fontWeight: 700, cursor: "pointer", padding: 0, lineHeight: 1, fontFamily: "inherit" },
  achievementCard: { padding: "8px 0", borderTop: "1px dotted #d8c4a0" },
  achievementName: { fontSize: 14, fontWeight: 700, marginBottom: 3 },
  achievementDesc: { fontSize: 12, color: "#5a4e3a", marginBottom: 4, lineHeight: 1.4 },
  achievementReal: { fontSize: 11, color: "#7a6a4a", fontStyle: "italic", lineHeight: 1.4 },
  achievementSummary: { fontSize: 13, color: "#5a4e3a", marginBottom: 12, fontWeight: 600 },
  achievementListItem: { padding: "8px 10px", marginBottom: 6, border: "1px solid", borderRadius: 3, background: "#fdf6e3" },
  achievementListHeader: { display: "flex", alignItems: "center", gap: 8 },

  metricRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #ead5ab", fontSize: 14, color: "#3a3225" },
  equityExplainer: { padding: "10px 12px", background: "#f0f5e0", borderRadius: 3, fontSize: 12, color: "#3a3225", lineHeight: 1.5, marginBottom: 8, border: "1px solid #c8d5a0" },
  effectCard: { padding: "10px 12px", background: "#fef8e8", borderRadius: 3, border: "1px solid #d8c4a0", marginBottom: 10 },
  effectHeader: { fontSize: 13, fontWeight: 700, color: "#3a3225", marginBottom: 6 },
  effectRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "#3a3225" },
  effectNote: { fontSize: 11, color: "#5a4e3a", lineHeight: 1.4, marginTop: 6, fontStyle: "italic" },
  contractTrack: { position: "relative", height: 8, background: "linear-gradient(90deg, #3f7a8a 0%, #ead5ab 50%, #8a5a3f 100%)", borderRadius: 4, margin: "12px 0 6px" },
  contractMidLine: { position: "absolute", left: "50%", top: -2, width: 1, height: 12, background: "#5a4e3a", opacity: 0.4 },
  contractLabels: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#7a6a4a", marginBottom: 8 },
  contractWarning: { color: "#a83a1a", fontWeight: 600, fontSize: 12, marginTop: 8, padding: "6px 10px", background: "#fce8db", borderRadius: 3, border: "1px solid #e8b89a" },

  vowelCard: { padding: "12px 0", borderBottom: "1px solid #ead5ab" },
  vowelTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  vowelName: { fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  vowelLevelTag: { fontSize: 12, fontWeight: 600, color: "#8a3f1a", background: "#fef3d8", padding: "3px 8px", borderRadius: 999, border: "1px solid #d8c4a0" },
  maintenanceRow: { padding: "4px 0", marginTop: 4, borderTop: "1px dotted #d8c4a0", marginBottom: 6 },
  vowelDotsRow: { display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 },
  vowelWhy: { fontSize: 11, color: "#7a6a4a", fontStyle: "italic", marginBottom: 6, lineHeight: 1.4 },
  buildingEffects: { marginTop: 6, marginBottom: 10, padding: "8px 10px", background: "#fef8e8", borderRadius: 3, border: "1px solid #ead5ab" },
  buildingNow: { fontSize: 11, color: "#3a3225", lineHeight: 1.4, marginBottom: 4 },
  buildingNext: { fontSize: 11, color: "#5a8a3f", lineHeight: 1.4, paddingTop: 4, borderTop: "1px dotted #d8c4a0" },
  vowelHints: { fontSize: 11, color: "#5a4e3a", marginBottom: 6, padding: "4px 8px", background: "#f5ead5", borderRadius: 3, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 },
  vowelEffective: { fontSize: 11, color: "#5a4e3a" },
  dot: { width: 12, height: 12, borderRadius: 2, border: "2px solid", display: "inline-block" },
  vowelBottom: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  buildBtn: { border: "none", padding: "10px 16px", borderRadius: 3, fontSize: 13, fontWeight: 600, minHeight: 40, minWidth: 100 },

  emptyState: { padding: "30px 14px", textAlign: "center", color: "#7a6a4a", fontStyle: "italic" },
  unlockCard: { padding: "14px 14px", border: "1px solid", borderRadius: 4, marginBottom: 12 },
  unlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  unlockName: { fontSize: 17, fontWeight: 700 },
  unlockBlurb: { fontSize: 12, color: "#7a6a4a", marginTop: 2, lineHeight: 1.4 },
  tierBadge: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, background: "#2a2218", color: "#f5ead5", padding: "3px 7px", borderRadius: 2, flexShrink: 0 },
  unlockChecks: { marginTop: 6, marginBottom: 10 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "5px 0", borderBottom: "1px dotted #ead5ab" },
  checkMark: { fontSize: 16, fontWeight: 700, width: 16, textAlign: "center" },
  checkLabel: { flex: 1, color: "#3a3225" },
  checkCurrent: { fontWeight: 600 },
  unlockBtn: { width: "100%", border: "none", padding: "12px 16px", borderRadius: 3, fontSize: 14, fontWeight: 600, minHeight: 46, letterSpacing: 0.3 },

  logBox: { padding: "12px 14px", background: "#f5ead5", borderRadius: 3, border: "1px solid #ead5ab" },
  logTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#8a6a3a", marginBottom: 6 },
  logLine: { fontSize: 12, color: "#3a3225", marginBottom: 4, lineHeight: 1.4 },

  stickyBar: { position: "sticky", bottom: 0, margin: "16px -14px 0", padding: "12px 14px", background: "#f5ead5", borderTop: "1px solid #d8c4a0", display: "flex", gap: 10, zIndex: 10 },
  advanceBtn: { flex: 1, background: "#2a2218", color: "#f5ead5", border: "none", padding: "14px 16px", borderRadius: 3, fontSize: 16, fontWeight: 600, fontFamily: "inherit", letterSpacing: 0.3, minHeight: 50 },
  resetBtn: { background: "transparent", color: "#5a4e3a", border: "1px solid #8a6a3a", padding: "10px 16px", borderRadius: 3, fontSize: 13, minHeight: 50 },

  reflectionBox: { marginTop: 16, padding: "16px 14px", background: "#fdf6e3", border: "1px solid #d8c4a0", borderRadius: 4 },
  textarea: { width: "100%", minHeight: 100, marginTop: 8, padding: 10, border: "1px solid #d8c4a0", borderRadius: 3, fontFamily: "inherit", fontSize: 14, background: "#fef8e8", color: "#2a2218", resize: "vertical" },
  footer: { marginTop: 20, fontSize: 12, color: "#7a6a4a", fontStyle: "italic", lineHeight: 1.5, borderTop: "1px solid #d8c4a0", paddingTop: 14 },

  // Stepper
  stepperRow: { display: "flex", alignItems: "stretch", gap: 8, marginBottom: 4 },
  stepperBtn: { width: 56, minHeight: 48, background: "#fdf6e3", border: "2px solid #8a3f1a", color: "#8a3f1a", borderRadius: 4, fontSize: 26, fontWeight: 600, lineHeight: 1, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepperDisplay: { flex: 1, background: "#f5ead5", borderRadius: 4, border: "1px solid #d8c4a0", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 48 },
  stepperValue: { fontSize: 22, fontWeight: 700, color: "#2a2218", textAlign: "center", lineHeight: 1 },
  hintInline: { display: "flex", justifyContent: "space-between", marginTop: 4, gap: 4 },
  hintCol: { display: "flex", flexWrap: "wrap", gap: 3 },
  hintArrow: { fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "#fdf6e3", padding: "2px 6px", borderRadius: 2 },
  hintsToggle: { background: "transparent", border: "1px solid #5a3f8a", color: "#5a3f8a", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },

  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(42,34,24,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, zIndex: 100, overflowY: "auto" },
  modal: { background: "#fdf6e3", border: "2px solid #2a2218", borderRadius: 6, padding: "24px 22px", maxWidth: 480, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.3)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative" },
  modalCloseX: { position: "absolute", top: 8, right: 8, background: "transparent", border: "none", color: "#5a4e3a", fontSize: 20, fontWeight: 700, cursor: "pointer", width: 36, height: 36, borderRadius: 18, fontFamily: "inherit", lineHeight: 1, padding: 0 },
  modalContent: { display: "flex", flexDirection: "column" },
  modalEyebrow: { fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#8a6a3a", fontWeight: 600, marginBottom: 6 },
  modalTitle: { fontSize: 26, fontWeight: 800, lineHeight: 1.1, marginBottom: 10, letterSpacing: -0.5 },
  modalBody: { fontSize: 15, color: "#3a3225", lineHeight: 1.5, marginBottom: 14 },
  modalMeta: { fontSize: 13, color: "#5a4e3a", background: "#f5ead5", padding: "10px 12px", borderRadius: 3, marginBottom: 16, lineHeight: 1.6 },
  modalBtn: { width: "100%", background: "#2a2218", color: "#f5ead5", border: "none", padding: "12px 20px", borderRadius: 3, fontSize: 15, fontWeight: 600, fontFamily: "inherit", letterSpacing: 0.3, minHeight: 48 },
  modalLogRow: { display: "flex", gap: 8, marginBottom: 12 },
  modalSecondaryBtn: { flex: 1, background: "transparent", color: "#5a4e3a", border: "1px solid #8a6a3a", padding: "10px 14px", borderRadius: 3, fontSize: 13, fontWeight: 600, fontFamily: "inherit", minHeight: 44 },
  historyBlock: { background: "#fef8e8", border: "1px solid #d8c4a0", borderRadius: 3, padding: "10px 12px", marginBottom: 12 },
  historyHeader: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#5a4e3a", fontWeight: 700, marginBottom: 8 },
  historyItem: { fontSize: 12, color: "#3a3225", lineHeight: 1.5, marginBottom: 8, paddingBottom: 8, borderBottom: "1px dotted #ead5ab" },
  finalCard: { padding: "10px 12px", border: "2px solid", borderRadius: 4, marginBottom: 8, background: "#fef8e8" },
  finalName: { fontSize: 15, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  finalHit: { fontSize: 9, background: "#5a8a3f", color: "#fdf6e3", padding: "2px 6px", borderRadius: 2, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" },
  finalMetric: { fontSize: 11, color: "#7a6a4a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  finalScore: { fontSize: 13, color: "#3a3225", fontWeight: 600, marginTop: 4 },
  finalPct: { fontSize: 11, color: "#7a6a4a", marginLeft: 6, fontWeight: 400 },

  // Debug panel
  debugActions: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  debugCopyBtn: { color: "#fdf6e3", border: "none", padding: "10px 18px", borderRadius: 3, fontSize: 13, fontWeight: 600, minHeight: 42, fontFamily: "inherit" },
  debugMeta: { fontSize: 11, color: "#7a6a4a", fontFamily: "'JetBrains Mono', monospace" },
  debugTextarea: {
    width: "100%", minHeight: 320, padding: 10,
    border: "1px solid #d8c4a0", borderRadius: 3,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    background: "#fef8e8", color: "#2a2218",
    lineHeight: 1.4, resize: "vertical",
    whiteSpace: "pre", overflowX: "auto",
  },
  debugHint: { fontSize: 11, color: "#7a6a4a", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 },
};
