(() => {
  const { useState, useMemo, useEffect, useRef, useCallback, useReducer, useContext, useLayoutEffect, Fragment } = React;
  const BIOMES = {
    island: {
      name: "Coastal Island",
      blurb: "A small island. Sea on all sides, no large mineral deposits, limited arable land but warm sea and a natural harbor.",
      character: "Tourism comes naturally. Trade and connection are cheap. But you depend on the outside world, and shocks travel by ship.",
      color: "#3f7a8a",
      icon: "\u{1F3DD}",
      sectorMult: { crops: 0.7, tourism: 1.5, mining: 0, services: 1, manufacturing: 0.9, agritech: 0.8, cooperatives: 1, specialized: 0.85, finance: 1.1, ecotourism: 1.4, research: 0.9, regenerative: 1.1 },
      vowelCostMult: { roads: 0.9, port: 0.6, schools: 1, health: 1, rd: 1, ruleOfLaw: 1 },
      sectorAvailable: { mining: false },
      shockBias: { tourist_crisis: 2.5, trade_disruption: 1.5, drought: 0.8, commodity_crash: 0, financial_panic: 1, storm: 2 },
      startTreasury: 32,
      startWorkforce: [68, 22, 8, 2],
      startAllocation: { tourism: 0.3, crops: 0.3, services: 0.35, mining: 0 },
      foodNeed: 18,
      // food units required per turn
      importCostPerUnit: 1
      // cheap to import via port
    },
    inland: {
      name: "Inland Plains",
      blurb: "Wide arable land, river valleys, no coastline. The granary if you build it right, the dust bowl if you don't.",
      character: "Crops are your dowry. Distance from the sea taxes everything that has to move. Capability built here radiates inward to neighbors.",
      color: "#7e8b3a",
      icon: "\u{1F33E}",
      sectorMult: { crops: 1.5, tourism: 0.8, mining: 0.7, services: 1, manufacturing: 0.95, agritech: 1.4, cooperatives: 1.1, specialized: 0.9, finance: 0.9, ecotourism: 0.8, research: 0.95, regenerative: 1.2 },
      vowelCostMult: { roads: 0.75, port: 2.5, schools: 1, health: 1, rd: 1, ruleOfLaw: 1 },
      sectorAvailable: {},
      shockBias: { drought: 2.5, commodity_crash: 0.7, tourist_crisis: 0.5, trade_disruption: 1.2, financial_panic: 1, storm: 1 },
      startTreasury: 30,
      startWorkforce: [72, 20, 6, 2],
      startAllocation: { crops: 0.55, services: 0.25, mining: 0.05, tourism: 0.1 },
      foodNeed: 20,
      importCostPerUnit: 2.5
      // expensive overland imports
    },
    mountain: {
      name: "Mountainous Highlands",
      blurb: "Rugged terrain, mineral wealth in the rocks, terraced agriculture only. Roads cost more, but what you dig up is valuable.",
      character: "The veins run deep. Your bet is whether to spend the mining revenue on capability or let it leak to outside owners.",
      color: "#5a5660",
      icon: "\u26F0",
      sectorMult: { crops: 0.6, tourism: 1, mining: 1.5, services: 1, manufacturing: 0.95, agritech: 0.7, cooperatives: 1, specialized: 1, finance: 0.95, ecotourism: 1.2, research: 1, regenerative: 0.95 },
      vowelCostMult: { roads: 1.7, port: 1.4, schools: 1.1, health: 1.1, rd: 1, ruleOfLaw: 1 },
      sectorAvailable: {},
      shockBias: { commodity_crash: 2.5, drought: 0.6, tourist_crisis: 0.8, trade_disruption: 1.3, financial_panic: 1, storm: 1.5 },
      startTreasury: 50,
      startWorkforce: [70, 22, 7, 1],
      startAllocation: { mining: 0.3, crops: 0.3, services: 0.25, tourism: 0.15 },
      foodNeed: 20,
      importCostPerUnit: 2
    }
  };
  const SECTORS = {
    crops: {
      name: "Crops",
      tier: 0,
      urbanPull: -0.8,
      blurb: "Smallholder farming. Place-bound. Produces food.",
      baseValue: 8,
      complexity: 1,
      trainingRate: 0.04,
      hiresFrom: 0,
      requires: { roads: 1, health: 1 },
      wageFloor: 0.55,
      wageCeiling: 0.78,
      ownerType: "local",
      color: "#7e8b3a",
      shockVulnerable: ["drought", "storm"],
      foodYield: 1.2
      // food units per labor unit
    },
    tourism: {
      name: "Tourism",
      tier: 0,
      urbanPull: 0.1,
      blurb: "Hospitality. Externally exposed.",
      baseValue: 14,
      complexity: 2,
      trainingRate: 0.06,
      hiresFrom: 0,
      requires: { roads: 2, port: 1, health: 1, ruleOfLaw: 1 },
      wageFloor: 0.4,
      wageCeiling: 0.7,
      ownerType: "outside",
      color: "#c98a3a",
      shockVulnerable: ["tourist_crisis", "storm"]
    },
    mining: {
      name: "Mining",
      tier: 0,
      urbanPull: -0.6,
      blurb: "Extractive. Narrow spillover.",
      baseValue: 26,
      complexity: 2,
      trainingRate: 0.02,
      hiresFrom: 1,
      requires: { roads: 2, port: 2, ruleOfLaw: 2 },
      wageFloor: 0.2,
      wageCeiling: 0.55,
      ownerType: "outside",
      color: "#5a5660",
      shockVulnerable: ["commodity_crash"]
    },
    services: {
      name: "Local Services",
      tier: 0,
      urbanPull: 0.3,
      blurb: "Repair, trades, clinics. Capability seedbed.",
      baseValue: 11,
      complexity: 2,
      trainingRate: 0.11,
      hiresFrom: 1,
      requires: { roads: 1, schools: 1, health: 1 },
      wageFloor: 0.65,
      wageCeiling: 0.85,
      ownerType: "local",
      color: "#3f7a8a",
      shockVulnerable: []
    },
    // TIER 1
    manufacturing: {
      name: "Light Manufacturing",
      tier: 1,
      urbanPull: 0.6,
      blurb: "Assembly. Classic adjacent possible.",
      baseValue: 32,
      complexity: 4,
      trainingRate: 0.14,
      hiresFrom: 2,
      requires: { roads: 2, port: 2, schools: 2, rd: 1, ruleOfLaw: 2 },
      wageFloor: 0.5,
      wageCeiling: 0.78,
      ownerType: "mixed",
      color: "#8a3f5a",
      locked: true,
      unlockReqs: { skilledShare: 0.13, vowels: { roads: 2, port: 2, schools: 2, rd: 1, ruleOfLaw: 2 } },
      shockVulnerable: ["trade_disruption"]
    },
    agritech: {
      name: "Agri-tech",
      tier: 1,
      urbanPull: -0.3,
      blurb: "Value-added farming via R&D. Produces high-yield food.",
      baseValue: 28,
      complexity: 3,
      trainingRate: 0.12,
      hiresFrom: 1,
      requires: { roads: 2, schools: 2, rd: 2, health: 1 },
      wageFloor: 0.55,
      wageCeiling: 0.82,
      ownerType: "mixed",
      color: "#5a8a3f",
      locked: true,
      unlockReqs: { sectorActive: "crops", skilledShare: 0.1, vowels: { schools: 2, rd: 2, roads: 2 } },
      shockVulnerable: ["drought"],
      foodYield: 2.5
      // higher yield than crops
    },
    cooperatives: {
      name: "Worker Cooperatives",
      tier: 1,
      urbanPull: 0.2,
      blurb: "Locally owned shared production.",
      baseValue: 18,
      complexity: 3,
      trainingRate: 0.15,
      hiresFrom: 1,
      requires: { schools: 2, health: 2, ruleOfLaw: 2 },
      wageFloor: 0.78,
      wageCeiling: 0.92,
      ownerType: "worker",
      color: "#3f8a7a",
      locked: true,
      unlockReqs: { sectorActive: "services", wageBargain: 0.55, vowels: { schools: 2, health: 2 } },
      shockVulnerable: []
    },
    // TIER 2
    specialized: {
      name: "Specialized Manufacturing",
      tier: 2,
      urbanPull: 0.8,
      blurb: "Precision goods. Deep capability stack.",
      baseValue: 56,
      complexity: 6,
      trainingRate: 0.17,
      hiresFrom: 3,
      requires: { roads: 3, port: 3, schools: 3, rd: 3, ruleOfLaw: 3 },
      wageFloor: 0.55,
      wageCeiling: 0.8,
      ownerType: "mixed",
      color: "#5a3f8a",
      locked: true,
      unlockReqs: { specialistShare: 0.08, sectorActive: "manufacturing", vowels: { rd: 3, schools: 3, port: 3 } },
      shockVulnerable: ["trade_disruption"]
    },
    finance: {
      name: "Finance & Capital",
      tier: 2,
      urbanPull: 0.9,
      blurb: "Banking, insurance, brokerage.",
      baseValue: 48,
      complexity: 5,
      trainingRate: 0.1,
      hiresFrom: 2,
      requires: { schools: 3, rd: 2, ruleOfLaw: 4, port: 2 },
      wageFloor: 0.3,
      wageCeiling: 0.62,
      ownerType: "outside",
      color: "#8a5a3f",
      locked: true,
      unlockReqs: { sectorActive: "services", vowels: { ruleOfLaw: 4, schools: 3 }, treasury: 60 },
      shockVulnerable: ["financial_panic"]
    },
    ecotourism: {
      name: "Ecotourism & Heritage",
      tier: 2,
      urbanPull: -0.4,
      blurb: "Community tourism. Identity over volume.",
      baseValue: 24,
      complexity: 3,
      trainingRate: 0.13,
      hiresFrom: 1,
      requires: { schools: 2, health: 2, roads: 2, ruleOfLaw: 2 },
      wageFloor: 0.7,
      wageCeiling: 0.88,
      ownerType: "local",
      color: "#3f8a5a",
      locked: true,
      unlockReqs: { sectorActive: "tourism", wageBargain: 0.5, vowels: { schools: 2, health: 2 } },
      shockVulnerable: ["tourist_crisis"]
    },
    // TIER 3
    research: {
      name: "Research & Design",
      tier: 3,
      urbanPull: 0.95,
      blurb: "Frontier knowledge. Highest complexity.",
      baseValue: 72,
      complexity: 8,
      trainingRate: 0.2,
      hiresFrom: 3,
      requires: { schools: 4, rd: 5, ruleOfLaw: 3, health: 3 },
      wageFloor: 0.6,
      wageCeiling: 0.85,
      ownerType: "mixed",
      color: "#3f5a8a",
      locked: true,
      unlockReqs: { specialistShare: 0.12, sectorActive: "specialized", vowels: { rd: 5, schools: 4 } },
      shockVulnerable: []
    },
    regenerative: {
      name: "Regenerative Systems",
      tier: 3,
      urbanPull: -0.5,
      blurb: "Ecological restoration as economy. Yields food and resilience.",
      baseValue: 38,
      complexity: 5,
      trainingRate: 0.16,
      hiresFrom: 2,
      requires: { schools: 3, rd: 3, health: 3, ruleOfLaw: 3 },
      wageFloor: 0.72,
      wageCeiling: 0.9,
      ownerType: "worker",
      color: "#5a8a8a",
      locked: true,
      unlockReqs: { sectorActive: "cooperatives", skilledShare: 0.2, vowels: { rd: 3, schools: 3, health: 3 } },
      shockVulnerable: [],
      foodYield: 1.5
    }
  };
  const VOWELS = {
    roads: { name: "Roads", baseCost: 6, why: "Moves people and goods. Nothing else compounds without it." },
    port: { name: "Port", baseCost: 9, why: "Connects to outside markets. Required for export sectors." },
    schools: { name: "Schools", baseCost: 7, why: "Moves workers up the knowhow ladder." },
    health: { name: "Health", baseCost: 6, why: "Workers can't accumulate knowhow if they're sick." },
    rd: { name: "R&D / Standards", baseCost: 10, why: "Required for complex sectors." },
    ruleOfLaw: { name: "Rule of Law", baseCost: 8, why: "Investors won't commit without enforcement." }
  };
  function vowelCost(key, level, biome) {
    const mult = biome && BIOMES[biome] && BIOMES[biome].vowelCostMult[key] || 1;
    if (key === "health" && level <= 2) {
      return Math.round(VOWELS[key].baseCost * Math.pow(1 + level * 0.35, 2) * mult);
    }
    const base = VOWELS[key].baseCost * Math.pow(1 + level * 0.55, 2) * mult;
    return Math.round(level >= 2 ? base * 1.4 : base);
  }
  function vowelMaintenance(key, level, biome) {
    if (level <= 1) return 0;
    let totalBuildCost = 0;
    for (let l = 1; l < level; l++) {
      totalBuildCost += vowelCost(key, l, biome);
    }
    return Math.round(totalBuildCost * 0.12);
  }
  function vowelEffective(level) {
    if (level <= 3) return level;
    return 3 + (level - 3) * 0.6;
  }
  const RUNG_LABELS = ["Unskilled", "Semi-skilled", "Skilled", "Specialist"];
  const MAX_TURNS = 20;
  const PATHS = {
    capability: {
      name: "Capability-led",
      color: "#5a3f8a",
      blurb: "Hausmann/Chang. Build vowels, climb complexity.",
      triggerLabel: "R&D \u2265 3 \xB7 Schools \u2265 3 \xB7 Tax \u2265 20%",
      isTriggered: (s) => s.vowels.rd >= 3 && s.vowels.schools >= 3 && s.taxRate >= 0.2,
      metric: "Economic Complexity",
      metricExplainer: "Sum of (sector complexity \xD7 workers). Reaching 220 means real industrial capacity. Vietnam ~80, Thailand ~150, South Korea ~250.",
      target: 220,
      milestone: "Unlock a Tier 2 sector and reach complexity 220"
    },
    commons: {
      name: "Commons-led",
      color: "#3f8a7a",
      blurb: "Ostrom/Graeber. Worker bargaining, local ownership.",
      triggerLabel: "Wages \u2265 55% \xB7 Local sectors \u2265 30% \xB7 Health \u2265 2",
      isTriggered: (s) => {
        const localShare = (s.allocation.services || 0) + (s.allocation.cooperatives || 0) + (s.allocation.ecotourism || 0);
        return s.wageBargain >= 0.55 && localShare >= 0.3 && s.vowels.health >= 2;
      },
      metric: "Welfare \xD7 Equity",
      metricExplainer: "Median worker pay \xD7 (1 \u2212 Gini). Rewards both: lifting the median AND keeping spread tight. Target 50 = ~Nordic equity. Gini 0.35 \u2248 EU average, 0.41 \u2248 US, 0.52 \u2248 Brazil.",
      target: 50,
      milestone: "Welfare-equity score \u2265 50 (median welfare high AND Gini low)"
    },
    market: {
      name: "Market-led",
      color: "#8a5a3f",
      blurb: "Hayek/Buffett. Low taxes, outside capital, accept inequality for growth.",
      triggerLabel: "Tax \u2264 12% \xB7 Extractive sectors \u2265 35% \xB7 Wages \u2264 40%",
      isTriggered: (s) => {
        const extractiveShare = (s.allocation.mining || 0) + (s.allocation.tourism || 0) + (s.allocation.finance || 0);
        return s.taxRate <= 0.12 && extractiveShare >= 0.35 && s.wageBargain <= 0.4;
      },
      metric: "Accumulated Capital",
      metricExplainer: "Treasury + cumulative owner take. Rewards letting owners keep value and pile it up. Bonus: capital compounds faster when market triggers are active.",
      target: 1500,
      milestone: "Accumulated capital \u2265 1500"
    }
  };
  const SHOCKS = {
    drought: { name: "Drought", blurb: "Climate shock. Crops yields collapse.", targets: ["crops", "agritech"], severity: 0.6 },
    commodity_crash: { name: "Commodity Crash", blurb: "Global prices collapse. Mining revenue cut.", targets: ["mining"], severity: 0.7 },
    tourist_crisis: { name: "Tourist Crisis", blurb: "Visitors vanish.", targets: ["tourism", "ecotourism"], severity: 0.65 },
    trade_disruption: { name: "Trade Disruption", blurb: "Supply chains break. Export sectors squeezed.", targets: ["manufacturing", "specialized"], severity: 0.55 },
    financial_panic: { name: "Financial Panic", blurb: "Capital markets seize.", targets: ["finance"], severity: 0.8 },
    storm: { name: "Major Storm", blurb: "Infrastructure damage. Outdoor sectors hit.", targets: ["tourism", "crops", "ecotourism"], severity: 0.5 },
    urban_unrest: { name: "Urban Unrest", blurb: "Cities boil over. Capital-intensive sectors hit.", targets: ["manufacturing", "specialized", "finance"], severity: 0.5 }
  };
  const CYCLE_PHASES = {
    0: { name: "Recovery", short: "rec", color: "#5a8a8a", capacityMod: 1.03, inflowMod: 0.8, idealTax: 0.1, idealRebal: 0.4, narrative: "Coming out of downturn. Stimulus helps." },
    1: { name: "Recovery", short: "rec", color: "#5a8a8a", capacityMod: 1.03, inflowMod: 0.8, idealTax: 0.1, idealRebal: 0.4, narrative: "Confidence returning. Investment scarce." },
    2: { name: "Expansion", short: "exp", color: "#5a8a3f", capacityMod: 1.05, inflowMod: 1, idealTax: 0.18, idealRebal: 0.2, narrative: "Growth phase. Normal policy works." },
    3: { name: "Expansion", short: "exp", color: "#5a8a3f", capacityMod: 1.05, inflowMod: 1, idealTax: 0.18, idealRebal: 0.2, narrative: "Strong growth. Wages rising healthily." },
    4: { name: "Peak", short: "pk", color: "#c98a3a", capacityMod: 1, inflowMod: 1.1, idealTax: 0.25, idealRebal: 0.1, narrative: "Boom plateau. Save for downturn. Cool the economy." },
    5: { name: "Recession", short: "rec", color: "#a83a1a", capacityMod: 0.92, inflowMod: 0.6, idealTax: 0.22, idealRebal: 0.3, narrative: "Downturn. Counter-cyclical spending matters now." }
  };
  const MODERNIZATION_CHAIN = {
    crops: "agritech",
    agritech: "regenerative",
    tourism: "ecotourism",
    mining: "specialized",
    services: "cooperatives",
    cooperatives: "research",
    manufacturing: "specialized",
    specialized: "research"
  };
  const VOWEL_PREREQS = {
    schools: { 4: { health: 2 }, 5: { health: 3 } },
    rd: { 4: { schools: 3 }, 5: { schools: 4 }, 6: { schools: 4, health: 3 } },
    ruleOfLaw: { 4: { schools: 2 }, 5: { schools: 3 } },
    health: { 4: { rd: 2 }, 5: { rd: 3 } },
    port: { 4: { roads: 3 }, 5: { roads: 3 } }
  };
  function effectiveVowelLevel(key, vowels) {
    const raw = vowels[key];
    const prereqs = VOWEL_PREREQS[key];
    if (!prereqs) return raw;
    for (let level = raw; level >= 1; level--) {
      const req = prereqs[level];
      if (!req) continue;
      let satisfied = true;
      for (const reqKey in req) {
        if (vowels[reqKey] < req[reqKey]) {
          satisfied = false;
          break;
        }
      }
      if (!satisfied) {
        return level - 1 < 0 ? 0 : level - 1;
      }
      return raw;
    }
    return raw;
  }
  const ACHIEVEMENTS = {
    mondragon_threshold: {
      name: "Mondrag\xF3n Threshold",
      description: "50%+ of labor in local or worker-owned sectors for 5 turns",
      realWorld: "Like the Basque cooperative network \u2014 81,000 worker-owners, survived 2008 with no layoffs by cutting wages instead.",
      tone: "positive",
      category: "commons",
      check: (s, t, h) => (h.turnsAtCoopShare || 0) >= 5
    },
    developmental_state: {
      name: "Developmental State",
      description: "Capability score 200+ with tax 20%+ sustained for 5 turns",
      realWorld: "Like South Korea or Taiwan in the 70s-80s \u2014 strong state directs investment, high taxes fund infrastructure, complexity grows.",
      tone: "positive",
      category: "capability",
      check: (s, t, h) => (h.turnsAtDevelopmentalState || 0) >= 5
    },
    resource_curse_avoided: {
      name: "Resource Curse Avoided",
      description: "Extractive share 40%+ but local sectors not crowded out for 5 turns",
      realWorld: "Like Norway's sovereign wealth approach \u2014 extracted oil revenue without letting Dutch disease destroy local industries.",
      tone: "positive",
      category: "resilience",
      check: (s, t, h) => (h.turnsAtNorway || 0) >= 5
    },
    counter_cyclical: {
      name: "Counter-cyclical Sovereign",
      description: "Maintained full infrastructure funding through a complete recession phase",
      realWorld: "Like German economic policy \u2014 saved during peak, spent through downturn. Most economies cut public spending in recessions and decay.",
      tone: "positive",
      category: "resilience",
      check: (s, t, h) => !!h.survivedRecessionFullyFunded
    },
    industrial_upgrade: {
      name: "Industrial Upgrading",
      description: "A sector hit maturity 60+ and you successfully transitioned labor to its modernized form",
      realWorld: "Like South Korea moving from textiles to electronics to semiconductors \u2014 climbing the complexity ladder rather than getting stuck.",
      tone: "positive",
      category: "capability",
      check: (s, t, h) => !!h.completedModernization
    },
    polycrisis_resilience: {
      name: "Polycrisis Resilience",
      description: "Survived 2 shocks within 5 turns without health penalty or food crisis",
      realWorld: "Like Vietnam through 2020-2022: weathered COVID and supply chain shocks without collapse because public health was already strong.",
      tone: "positive",
      category: "resilience",
      check: (s, t, h) => !!h.polycrisisResilience
    },
    premature_scaling: {
      name: "Premature Scaling",
      description: "Built infrastructure past your fiscal capacity. Maintenance shortfall triggered decay.",
      realWorld: "Like 1990s post-Soviet states \u2014 Brezhnev-era infrastructure couldn't be maintained on a smaller economy. Schools, hospitals, roads decayed.",
      tone: "cautionary",
      category: "pathology",
      check: (s, t, h) => !!h.prematureScalingDecay
    },
    austerity_trap: {
      name: "Austerity Trap",
      description: "Cut taxes; lost an infrastructure level within 4 turns.",
      realWorld: "Like UK austerity 2010-2019 \u2014 tax cuts caused gradual hollowing of NHS, schools, councils. Decay invisible until things broke.",
      tone: "cautionary",
      category: "pathology",
      check: (s, t, h) => !!h.austerityTrap
    },
    brain_drain: {
      name: "Brain Drain",
      description: "Rural share below 30% caused skilled workforce decline for 5 turns",
      realWorld: "Like rural America 2000-2020 or Eastern Europe post-EU accession \u2014 countryside depopulated, training infrastructure withered.",
      tone: "cautionary",
      category: "pathology",
      check: (s, t, h) => (h.turnsRuralDrained || 0) >= 5
    },
    housing_crisis: {
      name: "Housing Crisis",
      description: "Urban share above 70% for 5 turns; service-sector productivity penalty active",
      realWorld: "Like San Francisco, London, Tokyo \u2014 productivity gains eaten by rent. Service workers can't afford to live where the jobs are.",
      tone: "cautionary",
      category: "pathology",
      check: (s, t, h) => (h.turnsHousingCrisis || 0) >= 5
    },
    capital_flight: {
      name: "Capital Flight",
      description: "Foreign investment cut by 30%+ for 3 turns due to social contract divergence",
      realWorld: "Like Chavez-era Venezuela or Allende's Chile \u2014 investors fled when policy lurched left. The political risk premium became infinite.",
      tone: "cautionary",
      category: "pathology",
      check: (s, t, h) => (h.turnsCapitalFlight || 0) >= 3
    }
  };
  const FAILURE_MODES = {
    capability_trap: {
      name: "Capability Trap",
      description: "You built skilled workers but never gave them R&D infrastructure. They emigrate to places that will use their skills.",
      check: (s, d) => {
        if (!s.revealedPaths.includes("capability")) return false;
        const sk = (s.workforce[2] + s.workforce[3]) / s.population;
        return sk > 0.3 && s.vowels.rd < 2 && s.turn > 14;
      }
    },
    capital_flight: {
      name: "Capital Flight Cascade",
      description: "Outside owners pulled out. Extractive sectors collapsed.",
      check: (s, d) => {
        const extCap = (s.capacity.mining || 1) + (s.capacity.tourism || 1);
        return s.wageBargain > 0.8 && extCap < 1.3 && s.turn > 10 && (s.allocation.mining || 0) + (s.allocation.tourism || 0) > 0.2;
      }
    },
    rural_collapse: {
      name: "Rural Collapse",
      description: "Workers fled to the city faster than food production could be replaced. Hunger followed.",
      check: (s, d) => s.urbanShare > 0.78 && s.turn > 10 && d.totalValue < 35
    },
    urban_overcrowding: {
      name: "Urban Overcrowding",
      description: "Too many people, too little infrastructure. The city consumed itself.",
      check: (s, d) => s.urbanShare > 0.85 && s.vowels.health < 3 && s.turn > 12
    },
    brittleness: {
      name: "Systemic Brittleness",
      description: "Three shocks in a row found you with no buffer.",
      check: (s, d) => s.shockCount >= 3 && d.totalValue < 25
    },
    famine: {
      name: "Famine",
      description: "Food shortfalls went uncovered for too many turns. The workforce became too sick to function.",
      check: (s, d) => s.healthPenalty >= 0.8 && s.foodShortfallStreak >= 3
    }
  };
  function computeUrbanShare(allocation, activeSectors) {
    let total = 0, weight = 0;
    for (const s of activeSectors) {
      const a = allocation[s] || 0;
      total += (SECTORS[s].urbanPull || 0) * a;
      weight += a;
    }
    if (weight === 0) return 0.5;
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
      transitionState: {},
      // sectorKey -> { turnsRemaining, severity (0-1 fraction of labor that's still transitioning) }
      foodShortfallStreak: 0,
      socialContract: 0,
      // -1 (commons) to +1 (market). Drifts with policy. Diverge from your play at your peril.
      cyclePhase: 0,
      // 0-5: Recovery(0,1), Expansion(2,3), Peak(4), Recession(5)
      sectorMaturity: {},
      // sectorKey -> 0-100 maturity. 60+ slows growth, 80+ decays unless modernized.
      maintenanceArrears: {},
      // vowelKey -> turns of underfunded maintenance. 3+ causes level drop.
      achievements: [],
      // earned achievement ids
      achievementHistory: {},
      // accumulator: turnsAtCoopShare, turnsAtDevelopmentalState, etc.
      firstMilestone: null,
      // "capability" | "commons" | "market" — first milestone reached. Triggers configuration lock.
      lastTaxRate: 0.15,
      // for detecting tax cuts
      recentDecay: 0,
      // turns since last decay event (for austerity_trap detection)
      healthPenalty: 0,
      // 0-1, accumulating from food shortfalls
      wageBargain: 0.5,
      taxRate: 0.15,
      rebalancingInvest: 0,
      // 0-1, dampens urban/rural drift
      urbanShare: 0.4,
      // starts mostly rural
      unlocked: {},
      capacity: { crops: 1, tourism: 1, mining: 1, services: 1 },
      revealedPaths: [],
      cumOwnerTake: 0,
      milestones: { capability: false, commons: false, market: false },
      activeShock: null,
      shockTurnsLeft: 0,
      shockCount: 0,
      nextShockTurn: 8 + Math.floor(Math.random() * 4),
      gameOver: null,
      log: [`Turn 0. ${biome.name}. ${biome.character}`],
      debugLog: [`=== GAME START ===`, `Biome: ${biome.name} (${biomeKey})`, `Initial treasury: ${biome.startTreasury}`, `Initial workforce: ${biome.startWorkforce.join(", ")}`, `Initial allocation: ${JSON.stringify(biome.startAllocation)}`, ``]
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
      if (r < worstRatio) {
        worstRatio = r;
        worst = k;
      }
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
    if (marketActive && sect.ownerType === "outside" && wageBargain < 0.4) {
      inv += 0.04;
    }
    if (commonsActive && (sect.ownerType === "worker" || sect.ownerType === "local") && wageBargain >= 0.55) {
      inv += 0.04;
    }
    const informal = Math.max(0, (wageBargain - 0.82) * 2);
    return { targetShare, investmentMultiplier: inv, informalRisk: informal };
  }
  function computeTurn(state, _isNested) {
    const { workforce, vowels, allocation, prevAllocation, transitionState, wageBargain, taxRate: rawTaxRate, unlocked, capacity, activeShock, biome, healthPenalty } = state;
    const firstMilestone = state.firstMilestone;
    const taxFloor = firstMilestone === "capability" ? 0.18 : 0;
    const taxRate = Math.max(rawTaxRate, taxFloor);
    const taxLocked = taxRate > rawTaxRate;
    const wageFloor = firstMilestone === "commons" ? 0.45 : 0;
    const biomeData = BIOMES[biome];
    const marketActive = state.revealedPaths && state.revealedPaths.includes("market");
    const commonsActive = state.revealedPaths && state.revealedPaths.includes("commons");
    const totalLabor = workforce.reduce((a, b) => a + b, 0);
    const sectorResults = {};
    let totalValue = 0, totalWages = 0, totalOwnerTake = 0;
    const activeSectors = Object.keys(SECTORS).filter((s) => (!SECTORS[s].locked || unlocked[s]) && biomeData.sectorAvailable[s] !== false);
    const laborBySector = {};
    let allocSum = 0;
    for (const s of activeSectors) allocSum += allocation[s] || 0;
    if (allocSum <= 0) allocSum = 1;
    for (const s of activeSectors) {
      laborBySector[s] = (allocation[s] || 0) / allocSum * totalLabor;
    }
    const transitionPenalties = {};
    for (const s of activeSectors) {
      const cur = allocation[s] || 0;
      const prev = prevAllocation && prevAllocation[s] || 0;
      const delta = Math.abs(cur - prev);
      const existing = transitionState && transitionState[s];
      let penalty = 0;
      if (existing && existing.turnsRemaining > 0) {
        penalty = Math.max(penalty, existing.severity * 0.7);
      }
      if (delta > 0.03) {
        const newSev = Math.min(0.7, (delta - 0.03) * 3.5);
        penalty = Math.max(penalty, newSev);
      }
      transitionPenalties[s] = penalty;
    }
    const newCapacity = { ...capacity };
    const extractiveShare = (allocation.mining || 0) + (allocation.tourism || 0) + (allocation.finance || 0);
    const dutchDiseasePenalty = Math.max(0, Math.min(0.3, (extractiveShare - 0.4) * 0.75));
    let localAllocShare = 0;
    for (const s of activeSectors) {
      if (SECTORS[s].ownerType === "worker" || SECTORS[s].ownerType === "local") {
        localAllocShare += allocation[s] || 0;
      }
    }
    const communityAbsorption = Math.min(0.4, localAllocShare * 0.5);
    const urbanPct = state.urbanShare;
    const housingCrisis = urbanPct > 0.7 ? Math.min(0.3, (urbanPct - 0.7) * 1.5) : 0;
    const ruralDrain = urbanPct < 0.3 ? Math.min(0.25, (0.3 - urbanPct) * 1.5) : 0;
    const cyclePhase = state.cyclePhase || 0;
    const currentPhase = CYCLE_PHASES[cyclePhase];
    const nextCyclePhase = (cyclePhase + 1) % 6;
    const taxAlignment = 1 - Math.min(1, Math.abs(state.taxRate - currentPhase.idealTax) * 4);
    const rebalAlignment = 1 - Math.min(1, Math.abs(state.rebalancingInvest - currentPhase.idealRebal) * 2);
    const cycleAlignment = (taxAlignment + rebalAlignment) / 2;
    const sectorMaturity = { ...state.sectorMaturity || {} };
    let policyStance = 0;
    if (state.taxRate <= 0.1) policyStance += 0.35;
    else if (state.taxRate >= 0.22) policyStance -= 0.35;
    if (state.wageBargain <= 0.4) policyStance += 0.3;
    else if (state.wageBargain >= 0.55) policyStance -= 0.3;
    if (extractiveShare >= 0.4) policyStance += 0.25;
    else if (localAllocShare >= 0.5) policyStance -= 0.2;
    policyStance = Math.max(-1, Math.min(1, policyStance));
    const currentContract = state.socialContract || 0;
    const contractDrift = (policyStance - currentContract) * 0.15;
    const newSocialContract = Math.max(-1, Math.min(1, currentContract + contractDrift));
    const divergence = policyStance - currentContract;
    let contractPenaltyDescription = null;
    let capitalFlight = 0;
    let workerExit = 0;
    const commonsLocked = firstMilestone === "commons";
    if (currentContract <= -0.4 && policyStance >= (commonsLocked ? 0.2 : 0.3)) {
      workerExit = Math.min(0.3, Math.abs(divergence) * (commonsLocked ? 0.3 : 0.2));
      contractPenaltyDescription = commonsLocked ? "Worker resistance (locked-in commons): solidaristic settlement actively resists market pivot" : "Worker resistance: established commons resists market pivot";
    } else if (currentContract >= 0.4 && policyStance <= -0.3) {
      capitalFlight = Math.min(0.6, Math.abs(divergence) * 0.4);
      contractPenaltyDescription = "Capital flight: investors withdrawing from solidaristic pivot";
    }
    let totalFoodProduced = 0;
    for (const s of activeSectors) {
      const sect = SECTORS[s];
      const labor = laborBySector[s];
      const vowelRatio = vowelsSatisfied(s, vowels);
      const avail = workforce[sect.hiresFrom] || 0;
      const prop = totalLabor > 0 ? avail / totalLabor : 0;
      const match = Math.min(1, prop / 0.15);
      const cap = capacity[s] !== void 0 ? capacity[s] : 1;
      const biomeMult = biomeData.sectorMult[s] || 1;
      const isLocal = sect.ownerType === "worker" || sect.ownerType === "local";
      let shockMult = 1;
      if (activeShock && SHOCKS[activeShock].targets.includes(s)) {
        let severity = SHOCKS[activeShock].severity;
        severity = severity * (1 - communityAbsorption);
        if (isLocal) severity = severity * 0.7;
        shockMult = 1 - severity;
      }
      const transitionPenalty = transitionPenalties[s] || 0;
      const transitionMult = 1 - transitionPenalty;
      const healthMult = 1 - (healthPenalty || 0) * 0.3;
      const dutchMult = isLocal ? 1 - dutchDiseasePenalty : 1;
      const isUrbanPull = sect.urbanPull > 0.1;
      const housingMult = isUrbanPull ? 1 - housingCrisis : 1;
      const workerExitMult = isLocal ? 1 - workerExit : 1;
      const maturity = sectorMaturity[s] || 0;
      let maturityMult = 1;
      if (maturity >= 80) {
        maturityMult = Math.max(0.6, 1 - (maturity - 80) * 0.02);
      } else if (maturity >= 60) {
        maturityMult = 1 - (maturity - 60) * 5e-3;
      }
      const cycleMult = currentPhase.capacityMod;
      const effValue = sect.baseValue * vowelRatio * (0.4 + 0.6 * match) * cap * shockMult * biomeMult * transitionMult * healthMult * dutchMult * housingMult * workerExitMult * maturityMult * cycleMult;
      const value = labor / 10 * effValue;
      const foodFromSector = (sect.foodYield || 0) * labor * shockMult * transitionMult * biomeMult * (capacity[s] || 1);
      totalFoodProduced += foodFromSector;
      const { targetShare: rawTargetShare, investmentMultiplier, informalRisk } = laborShareDynamics(s, wageBargain, marketActive, commonsActive);
      const targetShare = Math.max(rawTargetShare, wageFloor);
      const formal = value * (1 - informalRisk);
      let wages = formal * targetShare;
      let owners = formal * (1 - targetShare);
      const isWorkerSector = sect.local && (s === "cooperatives" || s === "regenerative");
      if (firstMilestone === "market" && isWorkerSector) {
        wages = wages * 0.7;
        owners = owners * 0.7;
      }
      const cycleAlignmentBonus = (cycleAlignment - 0.5) * 0.04;
      newCapacity[s] = Math.max(0.4, Math.min(2.5, cap * investmentMultiplier * (1 + cycleAlignmentBonus)));
      const maturityGain = labor > 0 ? Math.min(5, labor / 8) : 0;
      sectorMaturity[s] = Math.min(100, (sectorMaturity[s] || 0) + maturityGain);
      sectorResults[s] = {
        labor,
        value: formal,
        wages,
        owners,
        vowelRatio,
        binding: vowelRatio < 1 ? bindingVowel(s, vowels) : null,
        wageShare: targetShare,
        capacity: cap,
        informalRisk,
        shocked: shockMult < 1,
        biomeMult,
        transitionPenalty,
        foodProduced: foodFromSector,
        maturity: sectorMaturity[s],
        maturityPenalty: 1 - maturityMult
      };
      totalValue += formal;
      totalWages += wages;
      totalOwnerTake += owners;
    }
    const foodNeed = biomeData.foodNeed;
    const foodShortfall = Math.max(0, foodNeed - totalFoodProduced);
    const foodSurplus = Math.max(0, totalFoodProduced - foodNeed);
    const foodImportCost = foodShortfall * biomeData.importCostPerUnit;
    const treasuryCanCoverFood = state.treasury >= foodImportCost;
    const taxes = totalValue * taxRate;
    const netWages = totalWages * (1 - taxRate * 0.3);
    const netOwners = totalOwnerTake * (1 - taxRate * 0.7);
    let newWorkforce = [...workforce];
    for (const s of activeSectors) {
      const sect = SECTORS[s];
      const labor = laborBySector[s];
      const tMult = vowelEffective(vowels.schools) / 2 * (vowels.health > 0 ? 1 : 0.5) * (1 - ruralDrain);
      const trained = labor * sect.trainingRate * tMult;
      const from = sect.hiresFrom;
      const to = Math.min(3, from + 1);
      const actual = Math.min(trained, newWorkforce[from]);
      newWorkforce[from] -= actual;
      newWorkforce[to] += actual;
    }
    const retirementRate = 0.04 + ruralDrain * 0.1;
    const totalRetiring = newWorkforce.reduce((acc, w, i) => {
      const rate = retirementRate * (1 + i * 0.3);
      return acc + w * rate;
    }, 0);
    newWorkforce = newWorkforce.map((w, i) => {
      const rate = retirementRate * (1 + i * 0.3);
      return w * (1 - rate);
    });
    newWorkforce[0] += totalRetiring;
    newWorkforce = newWorkforce.map((x) => Math.max(0, x));
    const targetUrban = computeUrbanShare(allocation, activeSectors);
    const drift = (targetUrban - state.urbanShare) * (0.25 * (1 - state.rebalancingInvest * 0.7));
    const newUrbanShare = Math.max(0.1, Math.min(0.95, state.urbanShare + drift));
    const rebalancingCost = state.rebalancingInvest * 8;
    const complexityScore = Object.entries(sectorResults).reduce(
      (acc, [s, r]) => acc + SECTORS[s].complexity * r.labor,
      0
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
    const floorWelfare = wageObs.length > 0 ? wageObs.slice(0, Math.ceil(wageObs.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(wageObs.length / 2) * 10 : 0;
    let localValue = 0, totalSectorValue = 0;
    for (const s in sectorResults) {
      const r = sectorResults[s];
      totalSectorValue += r.value;
      if (SECTORS[s].ownerType === "worker" || SECTORS[s].ownerType === "local") {
        localValue += r.value;
      }
    }
    const localOwnershipShare = totalSectorValue > 0 ? localValue / totalSectorValue : 0;
    const ownershipFactor = Math.pow(localOwnershipShare, 1.3);
    let welfareEquity = floorWelfare * (0.1 + 0.9 * ownershipFactor) * 6;
    if (firstMilestone === "market") {
      welfareEquity = Math.min(welfareEquity, 30);
    }
    const accumulatedCapital = state.treasury + state.cumOwnerTake + netOwners;
    const sk = (newWorkforce[2] + newWorkforce[3]) / state.population;
    const sp = newWorkforce[3] / state.population;
    const unlockChecks = {};
    for (const s in SECTORS) {
      if (!SECTORS[s].locked) continue;
      if (biomeData.sectorAvailable[s] === false) continue;
      if (state.unlocked[s]) {
        unlockChecks[s] = { alreadyUnlocked: true };
        continue;
      }
      const reqs = SECTORS[s].unlockReqs;
      const checks = [];
      if (reqs.skilledShare) checks.push({ label: `Skilled \u2265 ${(reqs.skilledShare * 100).toFixed(0)}%`, current: `${(sk * 100).toFixed(0)}%`, ok: sk >= reqs.skilledShare });
      if (reqs.specialistShare) checks.push({ label: `Specialists \u2265 ${(reqs.specialistShare * 100).toFixed(0)}%`, current: `${(sp * 100).toFixed(0)}%`, ok: sp >= reqs.specialistShare });
      if (reqs.wageBargain) checks.push({ label: `Wage bargain \u2265 ${(reqs.wageBargain * 100).toFixed(0)}%`, current: `${(state.wageBargain * 100).toFixed(0)}%`, ok: state.wageBargain >= reqs.wageBargain });
      if (reqs.sectorActive) {
        const isAvail = biomeData.sectorAvailable[reqs.sectorActive] !== false;
        const active = isAvail && (state.allocation[reqs.sectorActive] || 0) > 0.05 && (state.unlocked[reqs.sectorActive] || !SECTORS[reqs.sectorActive].locked);
        checks.push({ label: `${SECTORS[reqs.sectorActive].name} active`, current: active ? "yes" : "no", ok: active });
      }
      if (reqs.treasury) checks.push({ label: `Treasury \u2265 ${reqs.treasury}`, current: `${state.treasury.toFixed(0)}`, ok: state.treasury >= reqs.treasury });
      if (reqs.vowels) for (const v in reqs.vowels) checks.push({ label: `${VOWELS[v].name} \u2265 ${reqs.vowels[v]}`, current: `${state.vowels[v]}`, ok: state.vowels[v] >= reqs.vowels[v] });
      const ready = checks.every((c) => c.ok);
      unlockChecks[s] = { ready, checks, tier: SECTORS[s].tier };
    }
    let newHealthPenalty = healthPenalty || 0;
    let newFoodShortfallStreak = state.foodShortfallStreak || 0;
    const healthRecoveryRate = state.vowels.health >= 3 ? 0.1 : state.vowels.health >= 2 ? 0.05 : 0;
    const healthProtection = state.vowels.health >= 3 ? 0.5 : state.vowels.health >= 2 ? 0.25 : 0;
    if (foodShortfall > 0 && !treasuryCanCoverFood) {
      newHealthPenalty = Math.min(0.9, newHealthPenalty + 0.15 * (1 - healthProtection));
      newFoodShortfallStreak += 1;
    } else if (foodShortfall > 0 && treasuryCanCoverFood) {
      newHealthPenalty = Math.max(0, newHealthPenalty - healthRecoveryRate);
      newFoodShortfallStreak = 0;
    } else {
      newHealthPenalty = Math.max(0, newHealthPenalty - (0.1 + healthRecoveryRate));
      newFoodShortfallStreak = 0;
    }
    const actualFoodCost = treasuryCanCoverFood ? foodImportCost : Math.min(state.treasury, foodImportCost);
    const ruleOfLawComponent = Math.min(1, state.vowels.ruleOfLaw / 4) * 0.35;
    const portComponent = Math.min(1, state.vowels.port / 3) * 0.15;
    const lowTaxBonus = Math.max(0, (0.15 - state.taxRate) / 0.15) * 0.3;
    const lowWageBonus = Math.max(0, (0.45 - state.wageBargain) / 0.45) * 0.2;
    const rawInvestorInterest = Math.min(1, ruleOfLawComponent + portComponent + lowTaxBonus + lowWageBonus);
    const investorInterest = firstMilestone === "capability" ? Math.min(0.6, rawInvestorInterest) : rawInvestorInterest;
    const interestScalar = marketActive ? 1 : 0.4;
    const marketInflow = investorInterest * extractiveShare * 18 * interestScalar * currentPhase.inflowMod;
    let commonsInflow = 0;
    if (commonsActive) {
      const localValueShare = totalSectorValue > 0 ? localValue / totalSectorValue : 0;
      commonsInflow = (state.vowels.health + state.vowels.schools) * 0.5 * localValueShare * 2;
    }
    const totalInflow = marketInflow + commonsInflow;
    const adjustedMarketInflow = marketInflow * (1 - capitalFlight);
    const adjustedTotalInflow = adjustedMarketInflow + commonsInflow;
    const maintenanceCosts = {};
    let totalMaintenanceCost = 0;
    for (const k in state.vowels) {
      const cost = vowelMaintenance(k, state.vowels[k], state.biome);
      maintenanceCosts[k] = cost;
      totalMaintenanceCost += cost;
    }
    const treasuryAfterCosts = state.treasury + taxes - rebalancingCost - actualFoodCost + adjustedTotalInflow;
    const maintenancePaid = Math.min(totalMaintenanceCost, Math.max(0, treasuryAfterCosts));
    const maintenanceShortfall = totalMaintenanceCost - maintenancePaid;
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
    const newMaintenanceArrears = { ...state.maintenanceArrears || {} };
    const newVowels = { ...state.vowels };
    const decayedVowels = [];
    for (const k in state.vowels) {
      if (maintenanceCosts[k] === 0) {
        newMaintenanceArrears[k] = 0;
        continue;
      }
      if (fundedVowels[k]) {
        newMaintenanceArrears[k] = Math.max(0, (newMaintenanceArrears[k] || 0) - 1);
      } else {
        newMaintenanceArrears[k] = (newMaintenanceArrears[k] || 0) + 1;
        if (newMaintenanceArrears[k] >= 3 && newVowels[k] > 1) {
          newVowels[k] = newVowels[k] - 1;
          newMaintenanceArrears[k] = 0;
          decayedVowels.push(k);
        }
      }
    }
    let marginalContributions = null;
    if (!_isNested) {
      marginalContributions = {};
      const taxAt0 = computeTurn({ ...state, taxRate: 0 }, true);
      marginalContributions.taxRate = {
        label: `+${taxes.toFixed(0)} treasury/turn from ${(state.taxRate * 100).toFixed(0)}% tax`,
        delta: { treasury: taxes, value: totalValue - taxAt0.totalValue }
      };
      const wageAt50 = computeTurn({ ...state, wageBargain: 0.5 }, true);
      const wageValueDelta = totalValue - wageAt50.totalValue;
      const wageWageDelta = netWages - wageAt50.netWages;
      const wageMedianDelta = medianWelfare - wageAt50.medianWelfare;
      marginalContributions.wageBargain = {
        label: state.wageBargain > 0.5 ? `+${wageWageDelta.toFixed(0)} wages, ${wageValueDelta > 0 ? "+" : ""}${wageValueDelta.toFixed(0)} total value vs neutral baseline` : state.wageBargain < 0.5 ? `${wageWageDelta.toFixed(0)} wages, ${wageValueDelta > 0 ? "+" : ""}${wageValueDelta.toFixed(0)} total value vs neutral baseline` : `Neutral wage setting (50%)`,
        delta: { wages: wageWageDelta, value: wageValueDelta, medianWelfare: wageMedianDelta }
      };
      const rebalAt0 = computeTurn({ ...state, rebalancingInvest: 0 }, true);
      const urbanDriftFromRebal = rebalAt0.newUrbanShare - newUrbanShare;
      marginalContributions.rebalancing = {
        label: state.rebalancingInvest > 0.05 ? `Slows urban drift by ${(urbanDriftFromRebal * 100).toFixed(1)}%/turn (cost ${rebalancingCost.toFixed(0)} treasury)` : `No rebalancing investment`,
        delta: { urbanDrift: urbanDriftFromRebal, treasury: -rebalancingCost }
      };
      marginalContributions.vowels = {};
      for (const k of Object.keys(state.vowels)) {
        if (state.vowels[k] <= 1) continue;
        const droppedVowels = { ...state.vowels, [k]: 1 };
        const dropResult = computeTurn({ ...state, vowels: droppedVowels }, true);
        const valueLoss = totalValue - dropResult.totalValue;
        const dropOneVowels = { ...state.vowels, [k]: state.vowels[k] - 1 };
        const dropOneResult = computeTurn({ ...state, vowels: dropOneVowels }, true);
        const valueLossOne = totalValue - dropOneResult.totalValue;
        const maintSavedOne = vowelMaintenance(k, state.vowels[k], state.biome) - vowelMaintenance(k, state.vowels[k] - 1, state.biome);
        marginalContributions.vowels[k] = {
          valueLoss: Math.max(0, valueLoss),
          valueLossOne: Math.max(0, valueLossOne),
          maintenanceSaved: maintSavedOne
        };
      }
    }
    return {
      sectorResults,
      totalValue,
      netWages,
      netOwners,
      taxes,
      newWorkforce,
      newTreasury: state.treasury + taxes - rebalancingCost - actualFoodCost + adjustedTotalInflow - maintenancePaid,
      newCapacity,
      unlockChecks,
      complexityScore,
      gini,
      medianWelfare,
      welfareEquity,
      accumulatedCapital,
      activeSectors,
      newUrbanShare,
      targetUrban,
      rebalancingCost,
      foodProduced: totalFoodProduced,
      foodNeed,
      foodShortfall,
      foodSurplus,
      foodImportCost,
      treasuryCanCoverFood,
      actualFoodCost,
      newHealthPenalty,
      newFoodShortfallStreak,
      transitionPenalties,
      extractiveShare,
      dutchDiseasePenalty,
      communityAbsorption,
      localAllocShare,
      housingCrisis,
      ruralDrain,
      marketInflow: adjustedMarketInflow,
      commonsInflow,
      totalInflow: adjustedTotalInflow,
      investorInterest,
      ruleOfLawComponent,
      portComponent,
      lowTaxBonus,
      lowWageBonus,
      policyStance,
      newSocialContract,
      divergence,
      contractPenaltyDescription,
      capitalFlight,
      workerExit,
      cyclePhase,
      nextCyclePhase,
      currentPhase,
      cycleAlignment,
      taxAlignment,
      rebalAlignment,
      sectorMaturity,
      maintenanceCosts,
      totalMaintenanceCost,
      maintenancePaid,
      maintenanceShortfall,
      fundedVowels,
      newMaintenanceArrears,
      newVowels,
      decayedVowels,
      marginalContributions
    };
  }
  function CommunitySim() {
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
          setState((s) => ({
            ...s,
            revealedPaths: [...s.revealedPaths, pk],
            log: [`PATH REVEALED: ${PATHS[pk].name}.`, ...s.log].slice(0, 7),
            debugLog: [...s.debugLog || [], `*** PATH REVEALED at turn ${s.turn}: ${PATHS[pk].name} (${pk}) ***`]
          }));
          setReveal({ type: "path", payload: pk });
          break;
        }
      }
    }, [state?.wageBargain, state?.taxRate, state?.vowels, state?.allocation]);
    if (!state) {
      return /* @__PURE__ */ React.createElement("div", { style: S.page }, /* @__PURE__ */ React.createElement(BiomeSelect, { onSelect: (k) => setState(initialState(k)) }));
    }
    const biomeData = BIOMES[state.biome];
    const setAlloc = (sector, newVal) => {
      setState((s) => {
        const biome = BIOMES[s.biome];
        const active = Object.keys(SECTORS).filter((k) => (!SECTORS[k].locked || s.unlocked[k]) && biome.sectorAvailable[k] !== false);
        const others = active.filter((k) => k !== sector);
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
        setState((s) => ({ ...s, log: [`Not enough treasury for ${VOWELS[key].name}. Need ${cost}.`, ...s.log].slice(0, 7) }));
        return;
      }
      setState((s) => ({
        ...s,
        treasury: s.treasury - cost,
        vowels: { ...s.vowels, [key]: s.vowels[key] + 1 },
        log: [`Built ${VOWELS[key].name} (lvl ${s.vowels[key] + 1}). Cost ${cost}.`, ...s.log].slice(0, 7),
        debugLog: [...s.debugLog || [], `BUILD at turn ${s.turn}: ${VOWELS[key].name} \u2192 lvl ${s.vowels[key] + 1} (cost ${cost})`]
      }));
    };
    const tryUnlock = (sectorKey) => {
      const check = turnPreview.unlockChecks[sectorKey];
      if (!check || !check.ready) return;
      setState((s) => ({
        ...s,
        unlocked: { ...s.unlocked, [sectorKey]: true },
        capacity: { ...s.capacity, [sectorKey]: 1 },
        log: [`UNLOCKED: ${SECTORS[sectorKey].name}.`, ...s.log].slice(0, 7),
        debugLog: [...s.debugLog || [], `*** UNLOCKED at turn ${s.turn}: ${SECTORS[sectorKey].name} (${sectorKey}, tier ${SECTORS[sectorKey].tier}) ***`]
      }));
      setReveal({ type: "unlock", payload: sectorKey });
    };
    const advanceTurn = () => {
      const t = turnPreview;
      setState((s) => {
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
        if (!newShock && turnNum >= nextShockTurn && turnNum < MAX_TURNS - 1) {
          const biome = BIOMES[s.biome];
          const candidates = [];
          for (const sk in SHOCKS) {
            const hasTarget = SHOCKS[sk].targets.some((t2) => (s.allocation[t2] || 0) > 0.05);
            if (!hasTarget) continue;
            if (sk === "urban_unrest" && s.urbanShare < 0.65) continue;
            const bias = biome.shockBias[sk] !== void 0 ? biome.shockBias[sk] : 1;
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
        const newMilestones = { ...s.milestones };
        let mFired = null;
        if (s.revealedPaths.includes("capability") && !newMilestones.capability) {
          const hasT2 = Object.keys(s.unlocked).some((k) => SECTORS[k]?.tier === 2);
          if (hasT2 && t.complexityScore >= 220) {
            newMilestones.capability = true;
            mFired = "capability";
          }
        }
        if (s.revealedPaths.includes("commons") && !newMilestones.commons) {
          if (t.welfareEquity >= 50) {
            newMilestones.commons = true;
            mFired = "commons";
          }
        }
        if (s.revealedPaths.includes("market") && !newMilestones.market) {
          if (t.accumulatedCapital >= 1500) {
            newMilestones.market = true;
            mFired = "market";
          }
        }
        if (mFired) {
          newLog.unshift(`MILESTONE: ${PATHS[mFired].name}.`);
          turnEvents.push(`MILESTONE REACHED: ${PATHS[mFired].name}`);
          setReveal({ type: "milestone", payload: mFired });
        }
        newLog.unshift(`T${turnNum}: value ${t.totalValue.toFixed(0)} \xB7 wages ${t.netWages.toFixed(0)} \xB7 owners ${t.netOwners.toFixed(0)} \xB7 tax ${t.taxes.toFixed(0)}`);
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
          `Allocation: ${Object.entries(s.allocation).filter(([k, v]) => v > 5e-3).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(" \xB7 ")}`,
          `Sector value: ${Object.entries(t.sectorResults).filter(([k, r]) => r.labor > 0.5).map(([k, r]) => `${k} ${r.value.toFixed(0)}${r.shocked ? "\u26A1" : ""}${r.binding ? "\u26A0" : ""}${r.transitionPenalty > 0.1 ? "\u{1F504}" : ""}`).join(" | ")}`,
          `Path scores: capability ${t.complexityScore.toFixed(0)}/220 | commons ${t.welfareEquity.toFixed(0)}/50 (G ${t.gini.toFixed(2)}, MW ${t.medianWelfare.toFixed(0)}) | market ${t.accumulatedCapital.toFixed(0)}/1500`,
          `Revealed: [${s.revealedPaths.join(", ") || "none"}] | Milestones: ${Object.entries(s.milestones).filter(([k, v]) => v).map(([k]) => k).join(", ") || "none"}`,
          s.activeShock ? `SHOCK ACTIVE: ${s.activeShock} (${s.shockTurnsLeft} turns left)` : null,
          ...turnEvents.map((e) => `  \u2192 ${e}`)
        ].filter(Boolean).join("\n");
        const newTransitionState = {};
        for (const sec in s.transitionState || {}) {
          const e = s.transitionState[sec];
          if (e.turnsRemaining > 1) {
            newTransitionState[sec] = { turnsRemaining: e.turnsRemaining - 1, severity: e.severity * 0.8 };
          }
        }
        for (const sec in t.transitionPenalties) {
          const pen = t.transitionPenalties[sec];
          const curDelta = Math.abs((s.allocation[sec] || 0) - (s.prevAllocation && s.prevAllocation[sec] || 0));
          if (curDelta > 0.03) {
            newTransitionState[sec] = { turnsRemaining: 3, severity: pen };
            turnEvents.push(`Labor transition in ${sec}: ${(curDelta * 100).toFixed(0)}% shift causes ${(pen * 100).toFixed(0)}% productivity loss for 3 turns`);
          }
        }
        if (t.foodShortfall > 0) {
          if (t.treasuryCanCoverFood) {
            turnEvents.push(`Food deficit ${t.foodShortfall.toFixed(1)} covered by imports (${t.actualFoodCost.toFixed(1)} treasury)`);
          } else {
            turnEvents.push(`FOOD CRISIS: shortfall ${t.foodShortfall.toFixed(1)}, treasury can't fully import. Health penalty rising.`);
          }
        }
        if (t.maintenanceShortfall > 0) {
          turnEvents.push(`MAINTENANCE SHORTFALL: ${t.maintenanceShortfall.toFixed(1)}/${t.totalMaintenanceCost.toFixed(1)} treasury short. Infrastructure decaying.`);
        }
        if (t.decayedVowels && t.decayedVowels.length > 0) {
          for (const k of t.decayedVowels) {
            turnEvents.push(`INFRASTRUCTURE DECAY: ${VOWELS[k].name} dropped one level from neglect`);
          }
        }
        let firstMilestoneTriggered = s.firstMilestone;
        if (!firstMilestoneTriggered && mFired) {
          firstMilestoneTriggered = mFired;
          const lockMessages = {
            capability: "Configuration lock: tax floor 18% (developmental state commitment). Investor interest capped at 60% (foreign capital sees you as expensive). Market path now requires breaking this institutional commitment.",
            commons: "Configuration lock: wage floor 45% (workers have organized). Capital flight triggers more easily. Market pivot requires breaking the social contract.",
            market: "Configuration lock: commons score capped at 30 (capital concentration too far advanced to unwind). Worker-owned sectors lose 30% productivity. The accumulation has political costs you cannot reverse."
          };
          newLog.unshift(`POLITICAL ECONOMY LOCKED: ${lockMessages[mFired]}`);
          turnEvents.push(`CONFIGURATION LOCK: ${lockMessages[mFired]}`);
        }
        const ah = { ...s.achievementHistory || {} };
        if (t.localAllocShare >= 0.5) ah.turnsAtCoopShare = (ah.turnsAtCoopShare || 0) + 1;
        else ah.turnsAtCoopShare = 0;
        if (t.complexityScore >= 200 && s.taxRate >= 0.2) ah.turnsAtDevelopmentalState = (ah.turnsAtDevelopmentalState || 0) + 1;
        else ah.turnsAtDevelopmentalState = 0;
        if (t.extractiveShare >= 0.4 && t.dutchDiseasePenalty < 0.05) ah.turnsAtNorway = (ah.turnsAtNorway || 0) + 1;
        else ah.turnsAtNorway = 0;
        if (t.currentPhase.name === "Recession" && t.maintenanceShortfall === 0 && t.totalMaintenanceCost > 0) {
          ah.recessionFullyFundedTurns = (ah.recessionFullyFundedTurns || 0) + 1;
          if (ah.recessionFullyFundedTurns >= 1) ah.survivedRecessionFullyFunded = true;
        }
        for (const sec in t.sectorMaturity || {}) {
          if (t.sectorMaturity[sec] >= 60 && MODERNIZATION_CHAIN[sec]) {
            const target = MODERNIZATION_CHAIN[sec];
            if ((s.allocation[target] || 0) > 0.08) ah.completedModernization = true;
          }
        }
        if (newShock && !s.activeShock) {
          ah.shockTurns = [...ah.shockTurns || [], turnNum];
        }
        if (ah.shockTurns && ah.shockTurns.length >= 2) {
          const recent = ah.shockTurns.filter((tt) => turnNum - tt <= 5);
          if (recent.length >= 2 && t.newHealthPenalty < 0.05 && t.foodShortfall < 1) {
            ah.polycrisisResilience = true;
          }
        }
        if (t.decayedVowels && t.decayedVowels.length > 0) {
          ah.prematureScalingDecay = true;
          if ((s.lastTaxRate || 0.15) > s.taxRate + 0.05) {
            ah.austerityTrap = true;
          }
        }
        if (t.ruralDrain > 0.05) ah.turnsRuralDrained = (ah.turnsRuralDrained || 0) + 1;
        else ah.turnsRuralDrained = 0;
        if (t.housingCrisis > 0.05) ah.turnsHousingCrisis = (ah.turnsHousingCrisis || 0) + 1;
        else ah.turnsHousingCrisis = 0;
        if (t.capitalFlight > 0.3) ah.turnsCapitalFlight = (ah.turnsCapitalFlight || 0) + 1;
        else ah.turnsCapitalFlight = 0;
        const newAchievements = [...s.achievements || []];
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
          newLog.unshift(`ACHIEVEMENT: ${a.name} \u2014 ${a.description}`);
          turnEvents.push(`ACHIEVEMENT EARNED: ${a.name}. ${a.realWorld}`);
        }
        const newState = {
          ...s,
          turn: turnNum,
          treasury: Math.max(0, t.newTreasury),
          workforce: t.newWorkforce.map((x) => Math.round(x * 10) / 10),
          capacity: t.newCapacity,
          urbanShare: t.newUrbanShare,
          cumOwnerTake: newCumOwnerTake,
          activeShock: newShock,
          shockTurnsLeft,
          shockCount,
          nextShockTurn,
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
          debugLog: [...s.debugLog || [], debugEntry],
          newAchievementsThisTurn: earnedThisTurn
        };
        if (turnNum >= MAX_TURNS && !newState.gameOver) {
          const finalScores = {
            capability: { score: t.complexityScore, target: 220, hit: t.complexityScore >= 220 },
            commons: { score: t.welfareEquity, target: 50, hit: t.welfareEquity >= 50 },
            market: { score: t.accumulatedCapital, target: 1500, hit: t.accumulatedCapital >= 1500 }
          };
          newState.gameOver = { type: "complete", finalScores };
          newLog.unshift(`Final turn reached. The story is told.`);
          newState.log = newLog.slice(0, 7);
          const finalSummary = [
            ``,
            `=== GAME COMPLETE at turn ${turnNum} ===`,
            `Final path scores:`,
            `  Capability: ${finalScores.capability.score.toFixed(0)}/220 ${finalScores.capability.hit ? "\u2713 MILESTONE" : ""}`,
            `  Commons:    ${finalScores.commons.score.toFixed(0)}/50 ${finalScores.commons.hit ? "\u2713 MILESTONE" : ""}`,
            `  Market:     ${finalScores.market.score.toFixed(0)}/1500 ${finalScores.market.hit ? "\u2713 MILESTONE" : ""}`,
            `Unlocked sectors: ${Object.keys(newState.unlocked).join(", ") || "none"}`,
            `Total shocks survived: ${newState.shockCount}`,
            `Final treasury: ${newState.treasury.toFixed(0)} | Final value/turn: ${t.totalValue.toFixed(0)}`
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
              `  Market:     ${t.accumulatedCapital.toFixed(0)}/1500`
            ].join("\n");
            newState.debugLog = [...newState.debugLog, failSummary];
            setReveal({ type: "failure", payload: fk });
            break;
          }
        }
        return newState;
      });
    };
    const reset = () => {
      setState(null);
      setReflection("");
      setReveal(null);
    };
    const activeSectors = Object.keys(SECTORS).filter((s) => (!SECTORS[s].locked || state.unlocked[s]) && biomeData.sectorAvailable[s] !== false);
    const maxValue = Math.max(40, ...Object.values(turnPreview.sectorResults).map((r) => r.value));
    const wageBargainColor = (() => {
      const w = state.wageBargain;
      if (w < 0.2 || w > 0.85) return "#a83a1a";
      if (w >= 0.45 && w <= 0.65) return "#5a8a3f";
      return "#c98a3a";
    })();
    const wageBargainLabel = (() => {
      const w = state.wageBargain;
      if (w < 0.2) return "Extractive \u2014 owners don't reinvest";
      if (w > 0.85) return "Capital flight risk";
      if (w >= 0.45 && w <= 0.65) return "Sweet spot";
      if (w > 0.65) return "Worker-leaning \u2014 reinvestment slowing";
      return "Low but formal sector growing";
    })();
    const nextUnlocks = Object.entries(turnPreview.unlockChecks).filter(([k, v]) => !v.alreadyUnlocked).sort((a, b) => a[1].tier - b[1].tier).slice(0, 3);
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
    return /* @__PURE__ */ React.createElement("div", { style: S.page }, /* @__PURE__ */ React.createElement("style", null, globalCSS), state.newAchievementsThisTurn && state.newAchievementsThisTurn.length > 0 && /* @__PURE__ */ React.createElement("div", { style: S.achievementBanner }, /* @__PURE__ */ React.createElement("div", { style: S.achievementBannerHeader }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18 } }, state.newAchievementsThisTurn.some((id) => ACHIEVEMENTS[id].tone === "cautionary") ? "\u26A0" : "\u2726"), /* @__PURE__ */ React.createElement("span", null, "Achievement", state.newAchievementsThisTurn.length > 1 ? "s" : "", " earned"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setState((s) => ({ ...s, newAchievementsThisTurn: [] })),
        style: S.achievementClose
      },
      "\u2715"
    )), state.newAchievementsThisTurn.map((aid) => {
      const a = ACHIEVEMENTS[aid];
      return /* @__PURE__ */ React.createElement("div", { key: aid, style: S.achievementCard }, /* @__PURE__ */ React.createElement("div", { style: { ...S.achievementName, color: a.tone === "cautionary" ? "#a83a1a" : "#3a4a25" } }, a.name), /* @__PURE__ */ React.createElement("div", { style: S.achievementDesc }, a.description), /* @__PURE__ */ React.createElement("div", { style: S.achievementReal }, a.realWorld));
    })), reveal && /* @__PURE__ */ React.createElement(RevealModal, { reveal, onClose: () => setReveal(null), reset, debugLog: state.debugLog, onViewLog: () => {
      setReveal(null);
      setTab("debug");
    } }), /* @__PURE__ */ React.createElement("header", { style: S.header }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 28 } }, biomeData.icon), /* @__PURE__ */ React.createElement("div", { style: S.eyebrow }, biomeData.name)), /* @__PURE__ */ React.createElement("h1", { style: S.h1 }, "Where Value Comes From"), /* @__PURE__ */ React.createElement("div", { style: S.sub }, biomeData.character), /* @__PURE__ */ React.createElement("div", { style: S.headerBtns }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowLearn((s) => !s), style: S.learnBtn }, showLearn ? "hide notes \u25B4" : "what is this? \u25BE"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowNotes((s) => !s), style: {
      ...S.hintsToggle,
      background: showNotes ? "#3f7a8a" : "transparent",
      color: showNotes ? "#fdf6e3" : "#3f7a8a"
    } }, showNotes ? "\u2713 explainers" : "explainers"), state.revealedPaths.length > 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => setShowHints((s) => !s), style: {
      ...S.hintsToggle,
      background: showHints ? "#5a3f8a" : "transparent",
      color: showHints ? "#fdf6e3" : "#5a3f8a"
    } }, showHints ? "\u2713 hints on" : "show hints"))), showLearn && /* @__PURE__ */ React.createElement("div", { style: S.learn }, /* @__PURE__ */ React.createElement("p", { style: S.learnP }, /* @__PURE__ */ React.createElement("strong", null, "Scrabble theory."), " Sectors are words built from letters. Public goods are the vowels. ", /* @__PURE__ */ React.createElement("span", { style: S.thinker }, "Hausmann")), /* @__PURE__ */ React.createElement("p", { style: S.learnP }, /* @__PURE__ */ React.createElement("strong", null, "This place."), " ", biomeData.blurb), /* @__PURE__ */ React.createElement("p", { style: S.learnP }, /* @__PURE__ */ React.createElement("strong", null, "Three paths."), " Capability, Commons, or Market. Different metrics, different failure modes."), /* @__PURE__ */ React.createElement("p", { style: S.learnP }, /* @__PURE__ */ React.createElement("strong", null, "Labor doesn't switch instantly."), " Shift more than 5% of workers between sectors and they lose productivity for 2 turns while learning the new work. Gradual transitions are healthier. ", /* @__PURE__ */ React.createElement("span", { style: S.thinker }, "Polanyi")), /* @__PURE__ */ React.createElement("p", { style: S.learnP }, /* @__PURE__ */ React.createElement("strong", null, "People need to eat."), " Crops, agritech, and regenerative produce food. Shortfalls must be imported (costs treasury, cheap on islands, expensive inland) or workers get sick and productivity drops everywhere. You cannot abandon farming.")), state.activeShock && /* @__PURE__ */ React.createElement("div", { style: S.shockBanner }, "\u26A1 ", SHOCKS[state.activeShock].name, " (", state.shockTurnsLeft, " turn", state.shockTurnsLeft !== 1 ? "s" : "", ")"), state.revealedPaths.length > 0 && /* @__PURE__ */ React.createElement("div", { style: S.pathStrip }, state.revealedPaths.map((pk) => {
      const p = PATHS[pk];
      let score, target;
      if (pk === "capability") {
        score = turnPreview.complexityScore;
        target = 250;
      }
      if (pk === "commons") {
        score = turnPreview.welfareEquity;
        target = 50;
      }
      if (pk === "market") {
        score = turnPreview.accumulatedCapital;
        target = 1500;
      }
      const pct = Math.min(100, score / target * 100);
      const isExpanded = expandedPath === pk;
      const diag = isExpanded ? diagnosePath(pk, state, turnPreview) : null;
      const ctx = isExpanded ? metricContext(pk, score) : "";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: pk,
          style: { ...S.pathCard, borderColor: p.color, cursor: "pointer" },
          onClick: () => setExpandedPath(isExpanded ? null : pk)
        },
        /* @__PURE__ */ React.createElement("div", { style: { ...S.pathName, color: p.color } }, p.name, state.milestones[pk] && /* @__PURE__ */ React.createElement("span", { style: S.milestoneBadge }, "\u2726"), /* @__PURE__ */ React.createElement("span", { style: S.expandHint }, isExpanded ? "\u25B4 tap to collapse" : "\u25BE tap for strategy")),
        /* @__PURE__ */ React.createElement("div", { style: S.pathMetric }, p.metric),
        /* @__PURE__ */ React.createElement("div", { style: S.pathBar }, /* @__PURE__ */ React.createElement("div", { className: "bar", style: { width: `${pct}%`, height: "100%", background: p.color, borderRadius: 2 } })),
        /* @__PURE__ */ React.createElement("div", { style: S.pathScore }, /* @__PURE__ */ React.createElement("span", { className: "num" }, score.toFixed(0)), " ", /* @__PURE__ */ React.createElement("span", { style: S.pathTarget }, "/ ", target)),
        isExpanded && /* @__PURE__ */ React.createElement("div", { style: S.pathDiagnostic, onClick: (e) => e.stopPropagation() }, ctx && /* @__PURE__ */ React.createElement("div", { style: S.pathContext }, ctx), diag.helping.length > 0 && /* @__PURE__ */ React.createElement("div", { style: S.diagSection }, /* @__PURE__ */ React.createElement("div", { style: S.diagHeader }, "\u2713 working"), diag.helping.map((h, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: S.diagItem }, h))), diag.blocking.length > 0 && /* @__PURE__ */ React.createElement("div", { style: S.diagSection }, /* @__PURE__ */ React.createElement("div", { style: { ...S.diagHeader, color: "#a83a1a" } }, "\u2717 blocking"), diag.blocking.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: S.diagItem }, b))), diag.next.length > 0 && /* @__PURE__ */ React.createElement("div", { style: S.diagSection }, /* @__PURE__ */ React.createElement("div", { style: { ...S.diagHeader, color: "#8a6a3a" } }, "\u2192 next move"), diag.next.map((n, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: S.diagItem }, n))))
      );
    })), state.turn >= 3 && state.revealedPaths.length < 3 && /* @__PURE__ */ React.createElement("div", { style: S.discoveryPanel }, /* @__PURE__ */ React.createElement("div", { style: S.discoveryTitle }, state.revealedPaths.length === 0 ? "No path triggered yet" : "Other paths within reach"), /* @__PURE__ */ React.createElement("div", { style: S.discoveryNote }, state.revealedPaths.length === 0 ? "Three different ways to read this economy. Each scores differently. Reveal one by satisfying its triggers." : "Different policy mix would reveal other trajectories."), Object.keys(PATHS).filter((pk) => !state.revealedPaths.includes(pk)).map((pk) => {
      const p = PATHS[pk];
      const prox = pathProximity(pk, state);
      return /* @__PURE__ */ React.createElement("div", { key: pk, style: { ...S.discoveryCard, borderColor: p.color, opacity: 0.85 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.discoveryCardTitle, color: p.color } }, p.name, /* @__PURE__ */ React.createElement("span", { style: S.discoveryRatio }, prox.okCount, "/", prox.total, " triggers met")), /* @__PURE__ */ React.createElement("div", { style: S.discoveryChecks }, prox.checks.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { ...S.discoveryCheck, color: c.ok ? "#5a8a3f" : "#7a6a4a" } }, /* @__PURE__ */ React.createElement("span", { style: S.discoveryCheckMark }, c.ok ? "\u2713" : "\xB7"), /* @__PURE__ */ React.createElement("span", { style: S.discoveryCheckLabel }, c.label), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.discoveryCheckCur }, c.current)))));
    })), /* @__PURE__ */ React.createElement("div", { style: S.statusStrip }, /* @__PURE__ */ React.createElement(Stat, { label: "Turn", value: `${state.turn} / ${MAX_TURNS}` }), /* @__PURE__ */ React.createElement(Stat, { label: "Treasury", value: state.treasury.toFixed(0) }), /* @__PURE__ */ React.createElement(Stat, { label: "Value", value: turnPreview.totalValue.toFixed(0) })), state.turn >= 2 && /* @__PURE__ */ React.createElement("div", { style: S.urbanPanel }, /* @__PURE__ */ React.createElement("div", { style: S.urbanHeader }, /* @__PURE__ */ React.createElement("span", { style: S.urbanLabel }, "Urban / Rural split"), /* @__PURE__ */ React.createElement("span", { style: { ...S.urbanStatus, color: urbanStatus.color } }, urbanStatus.label)), /* @__PURE__ */ React.createElement("div", { style: S.urbanTrack }, /* @__PURE__ */ React.createElement("div", { style: { ...S.urbanRural, width: `${100 - urbanPct}%` } }, /* @__PURE__ */ React.createElement("span", { style: S.urbanSegLabel }, "rural ", /* @__PURE__ */ React.createElement("span", { className: "num" }, (100 - urbanPct).toFixed(0), "%"))), /* @__PURE__ */ React.createElement("div", { style: { ...S.urbanCity, width: `${urbanPct}%` } }, /* @__PURE__ */ React.createElement("span", { style: S.urbanSegLabel }, "urban ", /* @__PURE__ */ React.createElement("span", { className: "num" }, urbanPct.toFixed(0), "%")))), Math.abs(turnPreview.targetUrban - state.urbanShare) > 0.05 && /* @__PURE__ */ React.createElement("div", { style: S.driftHint }, "Drifting toward ", (turnPreview.targetUrban * 100).toFixed(0), "% urban based on sector mix")), state.turn >= 1 && /* @__PURE__ */ React.createElement("div", { style: { ...S.investorPanel, borderLeft: `4px solid ${turnPreview.currentPhase.color}` } }, /* @__PURE__ */ React.createElement("div", { style: S.urbanHeader }, /* @__PURE__ */ React.createElement("span", { style: S.urbanLabel }, "Economic cycle"), /* @__PURE__ */ React.createElement("span", { style: { ...S.urbanStatus, color: turnPreview.currentPhase.color } }, turnPreview.currentPhase.name)), /* @__PURE__ */ React.createElement("div", { style: S.cycleTrack }, [0, 1, 2, 3, 4, 5].map((i) => {
      const phase = CYCLE_PHASES[i];
      const active = i === turnPreview.cyclePhase;
      const next = i === turnPreview.nextCyclePhase;
      return /* @__PURE__ */ React.createElement("div", { key: i, style: {
        flex: 1,
        height: 8,
        background: active ? phase.color : next ? `${phase.color}55` : "#ead5ab",
        marginRight: i < 5 ? 2 : 0,
        borderRadius: 2
      }, title: phase.name });
    })), /* @__PURE__ */ React.createElement("div", { style: S.cycleMeta }, showNotes && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#5a4e3a", fontStyle: "italic" } }, turnPreview.currentPhase.narrative), /* @__PURE__ */ React.createElement("div", { style: S.cycleAlignment }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#7a6a4a" } }, "Policy alignment:"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { fontSize: 14, fontWeight: 700, color: turnPreview.cycleAlignment >= 0.6 ? "#5a8a3f" : turnPreview.cycleAlignment >= 0.3 ? "#c98a3a" : "#a83a1a", marginLeft: 6 } }, (turnPreview.cycleAlignment * 100).toFixed(0), "%"))), /* @__PURE__ */ React.createElement("div", { style: S.cycleHints }, "Ideal tax: ", /* @__PURE__ */ React.createElement("strong", null, (turnPreview.currentPhase.idealTax * 100).toFixed(0), "%"), " (you: ", (state.taxRate * 100).toFixed(0), "%). Ideal rebalancing: ", /* @__PURE__ */ React.createElement("strong", null, (turnPreview.currentPhase.idealRebal * 100).toFixed(0), "%"), " (you: ", (state.rebalancingInvest * 100).toFixed(0), "%). Mismatch reduces capacity growth.")), state.turn >= 1 && /* @__PURE__ */ React.createElement("div", { style: S.investorPanel }, /* @__PURE__ */ React.createElement("div", { style: S.urbanHeader }, /* @__PURE__ */ React.createElement("span", { style: S.urbanLabel }, "Outside investor interest"), /* @__PURE__ */ React.createElement("span", { style: { ...S.urbanStatus, color: investorStatus.color } }, investorStatus.label)), /* @__PURE__ */ React.createElement("div", { style: S.investorTrack }, /* @__PURE__ */ React.createElement("div", { style: { width: `${turnPreview.investorInterest * 100}%`, height: "100%", background: investorStatus.color, borderRadius: 2, transition: "width 0.3s" } })), /* @__PURE__ */ React.createElement("div", { style: S.investorMeta }, /* @__PURE__ */ React.createElement("span", null, "Capital inflow: ", /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.marketInflow > 0 ? "#5a8a3f" : "#7a6a4a", fontWeight: 600 } }, "+", turnPreview.marketInflow.toFixed(1)), " /turn"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowInvestorWhy(!showInvestorWhy), style: S.whyBtn }, showInvestorWhy ? "hide" : "why?")), showInvestorWhy && /* @__PURE__ */ React.createElement("div", { style: S.investorWhyBox }, /* @__PURE__ */ React.createElement("div", { style: S.investorWhyTitle }, "What outside investors are watching:"), /* @__PURE__ */ React.createElement("div", { style: S.investorWhyRow }, /* @__PURE__ */ React.createElement("span", null, "Rule of law (level ", state.vowels.ruleOfLaw, ")"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.ruleOfLawComponent > 0.2 ? "#5a8a3f" : "#7a6a4a" } }, "+", (turnPreview.ruleOfLawComponent * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.investorWhyRow }, /* @__PURE__ */ React.createElement("span", null, "Port infrastructure (level ", state.vowels.port, ")"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.portComponent > 0.08 ? "#5a8a3f" : "#7a6a4a" } }, "+", (turnPreview.portComponent * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.investorWhyRow }, /* @__PURE__ */ React.createElement("span", null, "Low taxes (", (state.taxRate * 100).toFixed(0), "%)"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.lowTaxBonus > 0.15 ? "#5a8a3f" : "#7a6a4a" } }, "+", (turnPreview.lowTaxBonus * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.investorWhyRow }, /* @__PURE__ */ React.createElement("span", null, "Low wages (", (state.wageBargain * 100).toFixed(0), "%)"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.lowWageBonus > 0.1 ? "#5a8a3f" : "#7a6a4a" } }, "+", (turnPreview.lowWageBonus * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.investorWhyNote }, "Outside investors look for stable institutions (rule of law), export infrastructure (port), and high returns (low taxes + low wages). Inflow scales with how much of your economy is extractive. Market path doubles inflow once triggered."))), state.turn >= 1 && /* @__PURE__ */ React.createElement("div", { style: S.foodPanel }, /* @__PURE__ */ React.createElement("div", { style: S.foodHeader }, /* @__PURE__ */ React.createElement("span", { style: S.urbanLabel }, "Food security"), /* @__PURE__ */ React.createElement("span", { style: { ...S.foodStatus, color: foodStatus.color } }, foodStatus.label)), /* @__PURE__ */ React.createElement("div", { style: S.foodMetrics }, /* @__PURE__ */ React.createElement("div", { style: S.foodMetric }, /* @__PURE__ */ React.createElement("span", { style: S.foodMetricLabel }, "produced"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.foodMetricVal }, turnPreview.foodProduced.toFixed(0))), /* @__PURE__ */ React.createElement("div", { style: S.foodMetric }, /* @__PURE__ */ React.createElement("span", { style: S.foodMetricLabel }, "needed"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.foodMetricVal }, turnPreview.foodNeed)), turnPreview.foodShortfall > 0 && /* @__PURE__ */ React.createElement("div", { style: S.foodMetric }, /* @__PURE__ */ React.createElement("span", { style: S.foodMetricLabel }, "import cost"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.foodMetricVal, color: turnPreview.treasuryCanCoverFood ? "#c98a3a" : "#a83a1a" } }, turnPreview.foodImportCost.toFixed(0)))), state.healthPenalty > 0.05 && /* @__PURE__ */ React.createElement("div", { style: S.healthCostBox }, /* @__PURE__ */ React.createElement("div", { style: S.healthCostHeader }, "\u26A0 Worker illness costing you ", /* @__PURE__ */ React.createElement("span", { className: "num" }, (turnPreview.totalValue * state.healthPenalty * 0.3 / (1 - state.healthPenalty * 0.3)).toFixed(0)), " value/turn"), /* @__PURE__ */ React.createElement("div", { style: S.healthCostBreakdown }, "Current health penalty: ", /* @__PURE__ */ React.createElement("span", { style: { color: "#a83a1a", fontWeight: 700 } }, "\u2212", (state.healthPenalty * 30).toFixed(0), "%"), " productivity on every sector.", state.vowels.health < 2 && /* @__PURE__ */ React.createElement("span", null, " Build ", /* @__PURE__ */ React.createElement("strong", null, "Health to level 2"), " to allow recovery when food is imported. Build ", /* @__PURE__ */ React.createElement("strong", null, "Health 3+"), " for faster recovery and resistance to future food shocks."), state.vowels.health === 2 && /* @__PURE__ */ React.createElement("span", null, " Health 2 allows slow recovery (5%/turn) when food is covered. Health 3+ would recover 10%/turn."), state.vowels.health >= 3 && /* @__PURE__ */ React.createElement("span", null, " Health ", state.vowels.health, " is recovering 10%/turn when food is covered. Producing surplus food would heal even faster."))), turnPreview.foodShortfall > 0 && !turnPreview.treasuryCanCoverFood && /* @__PURE__ */ React.createElement("div", { style: S.foodWarning }, "\u26A0 Treasury can't cover food imports. Worker health declining ", (0.15 * (1 - (state.vowels.health >= 3 ? 0.5 : state.vowels.health >= 2 ? 0.25 : 0)) * 100).toFixed(0), "%/turn."), turnPreview.foodShortfall > turnPreview.foodNeed * 0.4 && /* @__PURE__ */ React.createElement("div", { style: S.foodWarning }, "\u26A0 Heavy food dependency. Consider increasing crops or agritech allocation.")), /* @__PURE__ */ React.createElement("div", { style: S.tabs }, /* @__PURE__ */ React.createElement(TabBtn, { active: tab === "sectors", onClick: () => setTab("sectors") }, "Sectors"), /* @__PURE__ */ React.createElement(TabBtn, { active: tab === "workers", onClick: () => setTab("workers") }, "Policy"), /* @__PURE__ */ React.createElement(TabBtn, { active: tab === "public", onClick: () => setTab("public") }, "Build"), /* @__PURE__ */ React.createElement(TabBtn, { active: tab === "unlocks", onClick: () => setTab("unlocks") }, "Unlocks ", nextUnlocks.filter(([, v]) => v.ready).length > 0 && /* @__PURE__ */ React.createElement("span", { style: S.badge }, "!")), /* @__PURE__ */ React.createElement(TabBtn, { active: tab === "debug", onClick: () => setTab("debug") }, "Log")), tab === "sectors" && /* @__PURE__ */ React.createElement("section", { style: S.panel }, /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Labor allocation"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "100% of workforce. Moving one redistributes others."), /* @__PURE__ */ React.createElement("div", { style: S.allocStackTrack }, activeSectors.map((s) => {
      const pct = (state.allocation[s] || 0) * 100;
      if (pct < 0.5) return null;
      return /* @__PURE__ */ React.createElement("div", { key: s, style: { ...S.allocStackSeg, width: `${pct}%`, background: SECTORS[s].color } }, pct > 8 && /* @__PURE__ */ React.createElement("span", { style: S.allocStackLabel }, pct.toFixed(0), "%"));
    })), /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Sectors"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "Biome multiplier in green favors local strengths."), activeSectors.map((s) => {
      const r = turnPreview.sectorResults[s];
      const sect = SECTORS[s];
      if (!r) return null;
      const widthPct = Math.min(100, r.value / maxValue * 100);
      const wagePct = r.wageShare * 100;
      return /* @__PURE__ */ React.createElement("div", { key: s, style: S.sectorBlock }, /* @__PURE__ */ React.createElement("div", { style: S.sectorTop }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.sectorName, color: sect.color } }, sect.name, r.shocked && /* @__PURE__ */ React.createElement("span", { style: S.shockTag }, "\u26A1"), r.biomeMult > 1.1 && /* @__PURE__ */ React.createElement("span", { style: S.bonusTag }, "+", ((r.biomeMult - 1) * 100).toFixed(0), "%"), r.biomeMult < 0.9 && r.biomeMult > 0 && /* @__PURE__ */ React.createElement("span", { style: S.penaltyTag }, ((r.biomeMult - 1) * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.sectorBlurb }, sect.blurb)), /* @__PURE__ */ React.createElement("div", { style: S.sectorRight }, /* @__PURE__ */ React.createElement("div", { className: "num", style: S.bigNum }, r.value.toFixed(0)), /* @__PURE__ */ React.createElement("div", { style: S.tinyLabel }, "value"))), /* @__PURE__ */ React.createElement("div", { style: S.barTrack }, /* @__PURE__ */ React.createElement("div", { className: "bar", style: {
        width: `${widthPct}%`,
        background: `linear-gradient(90deg, ${sect.color} 0 ${wagePct}%, ${shade(sect.color, -30)} ${wagePct}% 100%)`,
        height: 22,
        borderRadius: 3
      } })), /* @__PURE__ */ React.createElement("div", { style: S.sectorMeta }, /* @__PURE__ */ React.createElement(Pill, { label: "workers", val: r.labor.toFixed(0) }), /* @__PURE__ */ React.createElement(Pill, { label: "wages", val: r.wages.toFixed(0) }), /* @__PURE__ */ React.createElement(Pill, { label: "owners", val: r.owners.toFixed(0) }), /* @__PURE__ */ React.createElement(Pill, { label: "cap", val: `${(r.capacity * 100).toFixed(0)}%` })), r.binding && /* @__PURE__ */ React.createElement("div", { style: S.binding }, "\u26A0 binding: ", VOWELS[r.binding].name), r.transitionPenalty > 0.1 && /* @__PURE__ */ React.createElement("div", { style: S.warning }, "\u{1F504} labor transition: ", (r.transitionPenalty * 100).toFixed(0), "% productivity loss (recovering)"), (r.maturity || 0) > 30 && /* @__PURE__ */ React.createElement("div", { style: S.maturityBox }, /* @__PURE__ */ React.createElement("div", { style: S.maturityHeader }, /* @__PURE__ */ React.createElement("span", { style: S.maturityLabel }, "Maturity"), /* @__PURE__ */ React.createElement("span", { className: "num", style: {
        fontSize: 12,
        fontWeight: 600,
        color: r.maturity >= 80 ? "#a83a1a" : r.maturity >= 60 ? "#c98a3a" : "#7a6a4a"
      } }, r.maturity.toFixed(0), "/100")), /* @__PURE__ */ React.createElement("div", { style: S.maturityTrack }, /* @__PURE__ */ React.createElement("div", { style: {
        width: `${r.maturity}%`,
        height: "100%",
        background: r.maturity >= 80 ? "#a83a1a" : r.maturity >= 60 ? "#c98a3a" : "#5a8a3f",
        borderRadius: 2
      } })), r.maturity >= 60 && r.maturity < 80 && /* @__PURE__ */ React.createElement("div", { style: S.maturityNote }, "Sector slowing (", (r.maturityPenalty * 100).toFixed(0), "% reduced). ", MODERNIZATION_CHAIN[s] ? `Begin transitioning to ${SECTORS[MODERNIZATION_CHAIN[s]].name}.` : "Consider new sector mix."), r.maturity >= 80 && /* @__PURE__ */ React.createElement("div", { style: { ...S.maturityNote, color: "#a83a1a", fontWeight: 600 } }, "\u26A0 Capacity decaying (", (r.maturityPenalty * 100).toFixed(0), "% loss). ", MODERNIZATION_CHAIN[s] ? `Reallocate workers to ${SECTORS[MODERNIZATION_CHAIN[s]].name}.` : "Diversify.")), /* @__PURE__ */ React.createElement("div", { style: S.allocBox }, /* @__PURE__ */ React.createElement("div", { style: S.allocHeader }, /* @__PURE__ */ React.createElement("span", { style: S.allocLabel }, "Workforce share")), /* @__PURE__ */ React.createElement(
        Stepper,
        {
          value: `${((state.allocation[s] ?? 0) * 100).toFixed(0)}%`,
          onDec: () => setAlloc(s, (state.allocation[s] || 0) - 0.05),
          onInc: () => setAlloc(s, (state.allocation[s] || 0) + 0.05),
          decDisabled: (state.allocation[s] || 0) <= 0,
          incDisabled: (state.allocation[s] || 0) >= 1,
          hints: getSectorHints(s),
          revealedPaths: state.revealedPaths,
          showHints
        }
      )));
    })), tab === "workers" && /* @__PURE__ */ React.createElement("section", { style: S.panel }, /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Knowhow ladder"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "Workers move up only with schools + health."), RUNG_LABELS.map((label, i) => {
      const count = state.workforce[i];
      const widthPct = Math.min(100, count / state.population * 100);
      return /* @__PURE__ */ React.createElement("div", { key: label, style: S.rungRow }, /* @__PURE__ */ React.createElement("div", { style: S.rungLabel }, label), /* @__PURE__ */ React.createElement("div", { style: S.rungTrack }, /* @__PURE__ */ React.createElement("div", { className: "bar", style: { width: `${widthPct}%`, height: 18, background: rungColor(i), borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { className: "num", style: S.rungCount }, count.toFixed(0)));
    }), /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Policy levers"), /* @__PURE__ */ React.createElement("div", { style: S.leverBlock }, /* @__PURE__ */ React.createElement("div", { style: S.leverLabel }, /* @__PURE__ */ React.createElement("span", null, "Wage bargaining strength")), /* @__PURE__ */ React.createElement(
      Stepper,
      {
        value: `${(state.wageBargain * 100).toFixed(0)}%`,
        onDec: () => setState((s) => ({ ...s, wageBargain: Math.max(0, Math.round((s.wageBargain - 0.05) * 100) / 100) })),
        onInc: () => setState((s) => ({ ...s, wageBargain: Math.min(1, Math.round((s.wageBargain + 0.05) * 100) / 100) })),
        decDisabled: state.wageBargain <= 0,
        incDisabled: state.wageBargain >= 1,
        hints: getLeverHints("wageBargain", state.wageBargain),
        revealedPaths: state.revealedPaths,
        showHints
      }
    ), /* @__PURE__ */ React.createElement("div", { style: S.zoneStrip }, /* @__PURE__ */ React.createElement("div", { style: { ...S.zone, flex: 2, background: "#fce8db" } }, "extract"), /* @__PURE__ */ React.createElement("div", { style: { ...S.zone, flex: 2.5, background: "#fef3d8" } }, "under"), /* @__PURE__ */ React.createElement("div", { style: { ...S.zone, flex: 2, background: "#e2efd8" } }, "sweet"), /* @__PURE__ */ React.createElement("div", { style: { ...S.zone, flex: 2, background: "#fef3d8" } }, "over"), /* @__PURE__ */ React.createElement("div", { style: { ...S.zone, flex: 1.5, background: "#fce8db" } }, "flight")), /* @__PURE__ */ React.createElement("div", { style: { ...S.zoneLabel, color: wageBargainColor } }, wageBargainLabel), /* @__PURE__ */ React.createElement("div", { style: S.causalBox }, /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Median worker earns"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.causalVal }, turnPreview.medianWelfare.toFixed(0), " ", /* @__PURE__ */ React.createElement("span", { style: S.causalUnit }, "/turn"))), /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Gini (inequality)"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.causalVal, color: turnPreview.gini > 0.45 ? "#a83a1a" : turnPreview.gini < 0.32 ? "#5a8a3f" : "#c98a3a" } }, turnPreview.gini.toFixed(2), " ", /* @__PURE__ */ React.createElement("span", { style: S.causalUnit }, giniContext(turnPreview.gini)))), /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Worker share of value"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.causalVal }, turnPreview.totalValue > 0 ? (turnPreview.netWages / turnPreview.totalValue * 100).toFixed(0) : 0, "%"))), turnPreview.marginalContributions && /* @__PURE__ */ React.createElement("div", { style: S.contribBox }, /* @__PURE__ */ React.createElement("div", { style: S.contribHeader }, "Current contribution vs neutral (50%)"), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Wages received"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: turnPreview.marginalContributions.wageBargain.delta.wages >= 0 ? "#5a8a3f" : "#a83a1a" } }, turnPreview.marginalContributions.wageBargain.delta.wages >= 0 ? "+" : "", turnPreview.marginalContributions.wageBargain.delta.wages.toFixed(1), "/turn")), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Total production"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: turnPreview.marginalContributions.wageBargain.delta.value >= 0 ? "#5a8a3f" : "#a83a1a" } }, turnPreview.marginalContributions.wageBargain.delta.value >= 0 ? "+" : "", turnPreview.marginalContributions.wageBargain.delta.value.toFixed(1), "/turn")), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Median worker pay"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: turnPreview.marginalContributions.wageBargain.delta.medianWelfare >= 0 ? "#5a8a3f" : "#a83a1a" } }, turnPreview.marginalContributions.wageBargain.delta.medianWelfare >= 0 ? "+" : "", turnPreview.marginalContributions.wageBargain.delta.medianWelfare.toFixed(1), "/turn")))), /* @__PURE__ */ React.createElement("div", { style: S.leverBlock }, /* @__PURE__ */ React.createElement("div", { style: S.leverLabel }, /* @__PURE__ */ React.createElement("span", null, "Tax rate")), /* @__PURE__ */ React.createElement(
      Stepper,
      {
        value: `${(state.taxRate * 100).toFixed(0)}%`,
        onDec: () => setState((s) => ({ ...s, taxRate: Math.max(0, Math.round((s.taxRate - 0.02) * 100) / 100) })),
        onInc: () => setState((s) => ({ ...s, taxRate: Math.min(0.4, Math.round((s.taxRate + 0.02) * 100) / 100) })),
        decDisabled: state.taxRate <= 0,
        incDisabled: state.taxRate >= 0.4,
        hints: getLeverHints("taxRate", state.taxRate),
        revealedPaths: state.revealedPaths,
        showHints
      }
    ), /* @__PURE__ */ React.createElement("div", { style: S.causalBox }, /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Treasury inflow / turn"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.causalVal }, "+", turnPreview.taxes.toFixed(0))), /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Real-world comparison"), /* @__PURE__ */ React.createElement("span", { style: S.causalUnit }, state.taxRate < 0.1 ? "Tax haven / Gulf state" : state.taxRate < 0.2 ? "US / Switzerland" : state.taxRate < 0.3 ? "UK / Germany" : "Nordic-style"))), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.leverNote }, "Funds treasury. No taxes, no vowels."), turnPreview.marginalContributions && /* @__PURE__ */ React.createElement("div", { style: S.contribBox }, /* @__PURE__ */ React.createElement("div", { style: S.contribHeader }, "Current contribution vs 0% baseline"), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Treasury inflow"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: "#5a8a3f" } }, "+", turnPreview.taxes.toFixed(1), "/turn")), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Effect on production"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: turnPreview.marginalContributions.taxRate.delta.value >= 0 ? "#5a8a3f" : "#a83a1a" } }, turnPreview.marginalContributions.taxRate.delta.value >= 0 ? "+" : "", turnPreview.marginalContributions.taxRate.delta.value.toFixed(1), "/turn")))), /* @__PURE__ */ React.createElement("div", { style: S.leverBlock }, /* @__PURE__ */ React.createElement("div", { style: S.leverLabel }, /* @__PURE__ */ React.createElement("span", null, "Urban/rural rebalancing")), /* @__PURE__ */ React.createElement(
      Stepper,
      {
        value: `${(state.rebalancingInvest * 100).toFixed(0)}%`,
        onDec: () => setState((s) => ({ ...s, rebalancingInvest: Math.max(0, Math.round((s.rebalancingInvest - 0.1) * 10) / 10) })),
        onInc: () => setState((s) => ({ ...s, rebalancingInvest: Math.min(1, Math.round((s.rebalancingInvest + 0.1) * 10) / 10) })),
        decDisabled: state.rebalancingInvest <= 0,
        incDisabled: state.rebalancingInvest >= 1
      }
    ), /* @__PURE__ */ React.createElement("div", { style: S.causalBox }, /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Current urban share"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.causalVal }, (state.urbanShare * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Where sectors pull it"), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.causalVal }, (turnPreview.targetUrban * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Net drift next turn"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.causalVal, color: Math.abs(turnPreview.newUrbanShare - state.urbanShare) > 0.02 ? "#c98a3a" : "#5a8a3f" } }, turnPreview.newUrbanShare > state.urbanShare ? "+" : "", ((turnPreview.newUrbanShare - state.urbanShare) * 100).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { style: S.causalRow }, /* @__PURE__ */ React.createElement("span", { style: S.causalLabel }, "Cost from treasury"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.causalVal, color: "#a83a1a" } }, "\u2212", (state.rebalancingInvest * 8).toFixed(1), "/turn"))), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.leverNote }, "Investing here slows the drift toward where your sector mix would naturally push urban share. Useful when sectors pull urban share too high (housing crisis past 70%) or too low (rural brain drain below 30%)."), turnPreview.marginalContributions && state.rebalancingInvest > 0 && /* @__PURE__ */ React.createElement("div", { style: S.contribBox }, /* @__PURE__ */ React.createElement("div", { style: S.contribHeader }, "What this lever is doing now"), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Urban drift reduction"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: "#5a8a3f" } }, Math.abs(turnPreview.marginalContributions.rebalancing.delta.urbanDrift) > 1e-3 ? `${(turnPreview.marginalContributions.rebalancing.delta.urbanDrift * 100).toFixed(2)}%/turn` : "none")), /* @__PURE__ */ React.createElement("div", { style: S.contribRow }, /* @__PURE__ */ React.createElement("span", { style: S.contribLabel }, "Treasury cost"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.contribVal, color: "#a83a1a" } }, "\u2212", (state.rebalancingInvest * 8).toFixed(1), "/turn")))), /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Where value went"), /* @__PURE__ */ React.createElement(Distro, { label: "Workers (net)", value: turnPreview.netWages, max: turnPreview.totalValue, color: "#3f7a8a" }), /* @__PURE__ */ React.createElement(Distro, { label: "Owners (net)", value: turnPreview.netOwners, max: turnPreview.totalValue, color: "#8a3f5a" }), /* @__PURE__ */ React.createElement(Distro, { label: "State (tax)", value: turnPreview.taxes, max: turnPreview.totalValue, color: "#7e8b3a" }), /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Structural effects"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "How sector mix and ownership patterns affect everything else."), /* @__PURE__ */ React.createElement("div", { style: S.effectCard }, /* @__PURE__ */ React.createElement("div", { style: S.effectHeader }, "Social contract"), /* @__PURE__ */ React.createElement("div", { style: S.contractTrack }, /* @__PURE__ */ React.createElement("div", { style: S.contractMidLine }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      left: `${(state.socialContract + 1) / 2 * 100}%`,
      top: -3,
      width: 14,
      height: 14,
      background: "#2a2218",
      borderRadius: 7,
      transform: "translateX(-7px)",
      border: "2px solid #fdf6e3"
    } }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      left: `${(turnPreview.policyStance + 1) / 2 * 100}%`,
      top: -3,
      width: 10,
      height: 10,
      background: "#8a3f1a",
      borderRadius: 5,
      transform: "translateX(-5px)",
      opacity: 0.7
    } })), /* @__PURE__ */ React.createElement("div", { style: S.contractLabels }, /* @__PURE__ */ React.createElement("span", null, "\u2190 Solidaristic"), /* @__PURE__ */ React.createElement("span", { style: { color: "#5a4e3a", fontSize: 10 } }, state.socialContract.toFixed(2)), /* @__PURE__ */ React.createElement("span", null, "Extractive \u2192")), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.effectNote }, "\u25CF Established contract: ", /* @__PURE__ */ React.createElement("strong", null, state.socialContract < -0.5 ? "Commons settlement" : state.socialContract < -0.15 ? "Mixed-leaning commons" : state.socialContract < 0.15 ? "Mixed economy" : state.socialContract < 0.5 ? "Mixed-leaning market" : "Market settlement"), ". \u25CF Current policy direction: ", /* @__PURE__ */ React.createElement("strong", null, turnPreview.policyStance < -0.5 ? "Strong commons" : turnPreview.policyStance < -0.15 ? "Commons-leaning" : turnPreview.policyStance < 0.15 ? "Mixed" : turnPreview.policyStance < 0.5 ? "Market-leaning" : "Strong market"), ". ", turnPreview.contractPenaltyDescription || "Policy aligned with contract; no penalties."), turnPreview.capitalFlight > 0.05 && /* @__PURE__ */ React.createElement("div", { style: S.contractWarning }, "\u26A0 Capital flight: foreign investment cut by ", (turnPreview.capitalFlight * 100).toFixed(0), "%. Investors abandon solidaristic pivots."), turnPreview.workerExit > 0.05 && /* @__PURE__ */ React.createElement("div", { style: S.contractWarning }, "\u26A0 Worker exit: local sectors lose ", (turnPreview.workerExit * 100).toFixed(0), "% productivity. Workers resist market pivots from established commons.")), (turnPreview.housingCrisis > 0.02 || turnPreview.ruralDrain > 0.02) && /* @__PURE__ */ React.createElement("div", { style: { ...S.effectCard, borderColor: "#c98a3a" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.effectHeader, color: "#a83a1a" } }, "\u26A0 Urban/rural imbalance"), turnPreview.housingCrisis > 0.02 && /* @__PURE__ */ React.createElement("div", { style: S.effectRow }, /* @__PURE__ */ React.createElement("span", null, "Housing crisis on urban sectors"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: "#a83a1a", fontWeight: 600 } }, "\u2212", (turnPreview.housingCrisis * 100).toFixed(0), "%")), turnPreview.ruralDrain > 0.02 && /* @__PURE__ */ React.createElement("div", { style: S.effectRow }, /* @__PURE__ */ React.createElement("span", null, "Rural brain drain reducing training"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: "#a83a1a", fontWeight: 600 } }, "\u2212", (turnPreview.ruralDrain * 100).toFixed(0), "%")), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.effectNote }, turnPreview.housingCrisis > 0.02 && "Cities overheating: rent eats wages, services and finance sectors lose productivity. Build housing-friendly policies (rural rebalancing, lower urbanization).", turnPreview.ruralDrain > 0.02 && "Countryside depopulating: skilled workers leaving for cities elsewhere, training collapsing. Shift labor toward rural-pull sectors (crops, regenerative).")), (turnPreview.marketInflow > 0 || turnPreview.commonsInflow > 0) && /* @__PURE__ */ React.createElement("div", { style: S.effectCard }, /* @__PURE__ */ React.createElement("div", { style: S.effectHeader }, "External capital inflows"), turnPreview.marketInflow > 0 && /* @__PURE__ */ React.createElement("div", { style: S.effectRow }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4C8} Foreign investment"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: "#5a8a3f", fontWeight: 600 } }, "+", turnPreview.marketInflow.toFixed(1), " ", /* @__PURE__ */ React.createElement("span", { style: S.causalUnit }, "/turn"))), turnPreview.commonsInflow > 0 && /* @__PURE__ */ React.createElement("div", { style: S.effectRow }, /* @__PURE__ */ React.createElement("span", null, "\u{1F91D} Development aid"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: "#5a8a3f", fontWeight: 600 } }, "+", turnPreview.commonsInflow.toFixed(1), " ", /* @__PURE__ */ React.createElement("span", { style: S.causalUnit }, "/turn"))), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.effectNote }, turnPreview.marketInflow > 0 && "Outside capital flows toward stable, extractive economies (high rule of law + extractive sectors).", turnPreview.commonsInflow > 0 && turnPreview.marketInflow === 0 && "Development partners support health-and-education-led local economies.")), turnPreview.dutchDiseasePenalty > 0.02 && /* @__PURE__ */ React.createElement("div", { style: { ...S.effectCard, borderColor: "#c98a3a" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.effectHeader, color: "#a83a1a" } }, "\u26A0 Resource curse active"), /* @__PURE__ */ React.createElement("div", { style: S.effectRow }, /* @__PURE__ */ React.createElement("span", null, "Local sectors output reduced by"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: "#a83a1a", fontWeight: 600 } }, "\u2212", (turnPreview.dutchDiseasePenalty * 100).toFixed(0), "%")), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.effectNote }, "Extractive sectors at ", (turnPreview.extractiveShare * 100).toFixed(0), "% are crowding out local economies. High-wage extractive jobs pull talent, drive up costs, and hollow out crops, services, and cooperatives. This is the boom-town pathology.")), turnPreview.communityAbsorption > 0.05 && /* @__PURE__ */ React.createElement("div", { style: { ...S.effectCard, borderColor: "#3f8a7a" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.effectHeader, color: "#3f8a7a" } }, "\u{1F6E1} Community shock buffer"), /* @__PURE__ */ React.createElement("div", { style: S.effectRow }, /* @__PURE__ */ React.createElement("span", null, "Shocks weakened by"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: "#5a8a3f", fontWeight: 600 } }, "\u2212", (turnPreview.communityAbsorption * 100).toFixed(0), "%")), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.effectNote }, (turnPreview.localAllocShare * 100).toFixed(0), "% of labor in local/worker-owned sectors. Strong commons absorb shocks \u2014 Mondrag\xF3n retained all workers through 2008. Worker sectors take an additional 30% less shock damage.")), state.revealedPaths.includes("commons") && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Equity"), /* @__PURE__ */ React.createElement("div", { style: S.equityExplainer }, /* @__PURE__ */ React.createElement("strong", null, "Gini coefficient"), " measures wage inequality: 0 = everyone earns the same, 1 = one person has it all. Real world: Denmark 0.27, Germany 0.32, US 0.41, Brazil 0.52.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("strong", null, "Median welfare"), " is what a typical worker earns. Welfare \xD7 (1 \u2212 Gini) is the composite that rewards both lifting the median AND keeping the spread tight."), /* @__PURE__ */ React.createElement("div", { style: S.metricRow }, /* @__PURE__ */ React.createElement("span", null, "Gini coefficient"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.gini <= 0.35 ? "#5a8a3f" : turnPreview.gini <= 0.45 ? "#c98a3a" : "#a83a1a", fontWeight: 600 } }, turnPreview.gini.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: S.metricRow }, /* @__PURE__ */ React.createElement("span", null, "Median welfare"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.medianWelfare >= 60 ? "#5a8a3f" : turnPreview.medianWelfare >= 40 ? "#c98a3a" : "#a83a1a", fontWeight: 600 } }, turnPreview.medianWelfare.toFixed(0))), /* @__PURE__ */ React.createElement("div", { style: S.metricRow }, /* @__PURE__ */ React.createElement("span", null, "Welfare \xD7 Equity (commons score)"), /* @__PURE__ */ React.createElement("span", { className: "num", style: { color: turnPreview.welfareEquity >= 50 ? "#5a8a3f" : "#c98a3a", fontWeight: 600 } }, turnPreview.welfareEquity.toFixed(0))))), tab === "public" && /* @__PURE__ */ React.createElement("section", { style: S.panel }, /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Public goods (vowels)"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "Costs vary by terrain. Past level 3, returns diminish. Higher levels cost more to maintain."), /* @__PURE__ */ React.createElement("div", { style: {
      ...S.investorPanel,
      background: turnPreview.maintenanceShortfall > 0 ? "#fce8db" : "#fef8e8",
      borderColor: turnPreview.maintenanceShortfall > 0 ? "#a83a1a" : "#d8c4a0"
    } }, /* @__PURE__ */ React.createElement("div", { style: S.urbanHeader }, /* @__PURE__ */ React.createElement("span", { style: S.urbanLabel }, "Infrastructure maintenance"), /* @__PURE__ */ React.createElement("span", { className: "num", style: {
      fontSize: 14,
      fontWeight: 700,
      color: turnPreview.maintenanceShortfall > 0 ? "#a83a1a" : "#5a4e3a"
    } }, turnPreview.maintenancePaid.toFixed(0), " / ", turnPreview.totalMaintenanceCost.toFixed(0), " per turn")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a4e3a", marginTop: 4, lineHeight: 1.4 } }, turnPreview.maintenanceShortfall > 0 ? `\u26A0 Shortfall of ${turnPreview.maintenanceShortfall.toFixed(0)} treasury. After 3 turns underfunded, infrastructure decays.` : `Treasury covers all maintenance. Tax (${turnPreview.taxes.toFixed(0)}/turn) is funding upkeep.`)), Object.keys(VOWELS).map((k) => {
      const v = VOWELS[k];
      const level = state.vowels[k];
      const cost = vowelCost(k, level, state.biome);
      const affordable = state.treasury >= cost;
      const biomeMult = biomeData.vowelCostMult[k] || 1;
      const vHints = getVowelHints(k);
      const maintenance = vowelMaintenance(k, level, state.biome);
      const arrears = (state.maintenanceArrears || {})[k] || 0;
      const funded = turnPreview.fundedVowels && turnPreview.fundedVowels[k];
      return /* @__PURE__ */ React.createElement("div", { key: k, style: S.vowelCard }, /* @__PURE__ */ React.createElement("div", { style: S.vowelTop }, /* @__PURE__ */ React.createElement("div", { style: S.vowelName }, v.name, biomeMult < 0.95 && /* @__PURE__ */ React.createElement("span", { style: S.bonusTag }, "cheap"), biomeMult > 1.2 && /* @__PURE__ */ React.createElement("span", { style: S.penaltyTag }, "costly")), /* @__PURE__ */ React.createElement("div", { style: S.vowelLevelTag }, /* @__PURE__ */ React.createElement("span", { className: "num" }, "lvl ", level))), maintenance > 0 && /* @__PURE__ */ React.createElement("div", { style: S.maintenanceRow }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: arrears >= 2 ? "#a83a1a" : arrears >= 1 ? "#c98a3a" : "#7a6a4a" } }, "Upkeep: ", /* @__PURE__ */ React.createElement("span", { className: "num" }, maintenance, "/turn"), !funded && arrears > 0 && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontWeight: 700, color: arrears >= 2 ? "#a83a1a" : "#c98a3a" } }, "\u26A0 underfunded ", arrears, "/3 turns"))), /* @__PURE__ */ React.createElement("div", { style: S.vowelDotsRow }, Array.from({ length: Math.max(6, level + 2) }).map((_, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: {
        ...S.dot,
        background: i < level ? i < 3 ? "#8a3f1a" : "#5a3f8a" : "transparent",
        borderColor: i < 3 ? "#8a3f1a" : "#5a3f8a"
      } }))), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.vowelWhy }, v.why), (() => {
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
        return /* @__PURE__ */ React.createElement("div", { style: S.buildingEffects }, showNotes && /* @__PURE__ */ React.createElement("div", { style: S.buildingNow }, /* @__PURE__ */ React.createElement("strong", null, "Now:"), " ", eff.current), contrib && (contrib.valueLoss > 0.5 || contrib.valueLossOne > 0.5) && /* @__PURE__ */ React.createElement("div", { style: S.contribInline }, /* @__PURE__ */ React.createElement("strong", null, "This is generating:"), " ", contrib.valueLoss > 0.5 && `${contrib.valueLoss.toFixed(0)} total value/turn (vs lvl 1)`, contrib.valueLossOne > 0.5 && `, ${contrib.valueLossOne.toFixed(0)} from this level alone`), contrib && contrib.valueLoss < 0.5 && contrib.valueLossOne < 0.5 && level > 1 && /* @__PURE__ */ React.createElement("div", { style: { ...S.contribInline, color: "#c98a3a" } }, /* @__PURE__ */ React.createElement("strong", null, "Currently underutilized:"), " no active sector needs this level. Saves ", contrib.maintenanceSaved, "/turn maintenance if reduced."), isPhantom && /* @__PURE__ */ React.createElement("div", { style: { ...S.buildingNext, color: "#a83a1a", fontWeight: 600 } }, "\u26A0 Level ", level, " is phantom: effective only at lvl ", effLevel, ". Build prerequisites first."), affordable && !nextPrereqUnmet && /* @__PURE__ */ React.createElement("div", { style: S.buildingNext }, /* @__PURE__ */ React.createElement("strong", null, "If you build:"), " ", eff.next, (() => {
          const newMaintenance = vowelMaintenance(k, level + 1, state.biome);
          const maintenanceIncrease = newMaintenance - maintenance;
          return maintenanceIncrease > 0 ? /* @__PURE__ */ React.createElement("span", { style: { color: "#a83a1a", fontWeight: 600 } }, " +", maintenanceIncrease, "/turn upkeep.") : null;
        })()), affordable && nextPrereqUnmet && /* @__PURE__ */ React.createElement("div", { style: { ...S.buildingNext, color: "#c98a3a" } }, "\u26A0 Building lvl ", nextLevel, " requires ", nextPrereqUnmet, " first. Otherwise it's wasted."));
      })(), showHints && vHints.up.filter((p) => state.revealedPaths.includes(p)).length > 0 && /* @__PURE__ */ React.createElement("div", { style: S.vowelHints }, "Favored by: ", vHints.up.filter((p) => state.revealedPaths.includes(p)).map((p) => /* @__PURE__ */ React.createElement("span", { key: p, style: { ...S.hintArrow, background: PATHS[p].color, marginLeft: 4 } }, PATHS[p].name))), /* @__PURE__ */ React.createElement("div", { style: S.vowelBottom }, /* @__PURE__ */ React.createElement("span", { style: S.vowelEffective }, "effective: ", /* @__PURE__ */ React.createElement("span", { className: "num" }, vowelEffective(level).toFixed(1))), /* @__PURE__ */ React.createElement("button", { onClick: () => buyVowel(k), disabled: !affordable, style: {
        ...S.buildBtn,
        background: affordable ? "#8a3f1a" : "#d8c4a0",
        color: affordable ? "#fdf6e3" : "#7a6a4a"
      } }, "build \xB7 ", /* @__PURE__ */ React.createElement("span", { className: "num" }, cost))));
    }), /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("div", { style: S.logBox }, /* @__PURE__ */ React.createElement("div", { style: S.logTitle }, "Recent moves"), state.log.map((line, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { ...S.logLine, opacity: 1 - i * 0.12 } }, line)))), tab === "unlocks" && /* @__PURE__ */ React.createElement("section", { style: S.panel }, /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Adjacent possible"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "Next reachable sectors. Higher tiers hidden until earlier reach."), nextUnlocks.length === 0 && /* @__PURE__ */ React.createElement("div", { style: S.emptyState }, "All visible sectors unlocked."), nextUnlocks.map(([sectorKey, check]) => {
      const sect = SECTORS[sectorKey];
      const ready = check.ready;
      return /* @__PURE__ */ React.createElement("div", { key: sectorKey, style: {
        ...S.unlockCard,
        borderColor: ready ? "#5a8a3f" : "#d8c4a0",
        background: ready ? "#f0f5e0" : "#fdf6e3"
      } }, /* @__PURE__ */ React.createElement("div", { style: S.unlockHeader }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...S.unlockName, color: sect.color } }, sect.name), /* @__PURE__ */ React.createElement("div", { style: S.unlockBlurb }, sect.blurb)), /* @__PURE__ */ React.createElement("div", { style: S.tierBadge }, "tier ", check.tier)), /* @__PURE__ */ React.createElement("div", { style: S.unlockChecks }, check.checks.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: S.checkRow }, /* @__PURE__ */ React.createElement("span", { style: { ...S.checkMark, color: c.ok ? "#5a8a3f" : "#a83a1a" } }, c.ok ? "\u2713" : "\xB7"), /* @__PURE__ */ React.createElement("span", { style: S.checkLabel }, c.label), /* @__PURE__ */ React.createElement("span", { className: "num", style: { ...S.checkCurrent, color: c.ok ? "#5a8a3f" : "#7a6a4a" } }, c.current)))), /* @__PURE__ */ React.createElement("button", { onClick: () => tryUnlock(sectorKey), disabled: !ready, style: {
        ...S.unlockBtn,
        background: ready ? "#5a8a3f" : "#d8c4a0",
        color: ready ? "#fdf6e3" : "#7a6a4a"
      } }, ready ? "\u2726 Unlock now" : "Requirements not met"));
    }), /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Achievements"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "Side quests naming what you've built. Some require sustained conditions, some are pathologies to avoid."), /* @__PURE__ */ React.createElement("div", { style: S.achievementSummary }, /* @__PURE__ */ React.createElement("span", { className: "num" }, (state.achievements || []).length), " of ", Object.keys(ACHIEVEMENTS).length, " earned"), Object.entries(ACHIEVEMENTS).map(([aid, a]) => {
      const earned = (state.achievements || []).includes(aid);
      return /* @__PURE__ */ React.createElement("div", { key: aid, style: {
        ...S.achievementListItem,
        opacity: earned ? 1 : 0.55,
        borderColor: earned ? a.tone === "cautionary" ? "#c98a3a" : "#5a8a3f" : "#d8c4a0"
      } }, /* @__PURE__ */ React.createElement("div", { style: S.achievementListHeader }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, earned ? a.tone === "cautionary" ? "\u26A0" : "\u2726" : "\u25CB"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 13, color: earned ? a.tone === "cautionary" ? "#a83a1a" : "#3a4a25" : "#7a6a4a" } }, a.name)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#5a4e3a", marginTop: 4, marginLeft: 22 } }, a.description), earned && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#7a6a4a", fontStyle: "italic", marginTop: 4, marginLeft: 22 } }, a.realWorld));
    }), state.firstMilestone && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.divider }), /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Configuration lock"), /* @__PURE__ */ React.createElement("div", { style: {
      ...S.unlockCard,
      borderColor: "#8a3f1a",
      background: "#fef3d8"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#8a3f1a", marginBottom: 6 } }, "First milestone reached: ", state.firstMilestone === "capability" ? "Capability-led" : state.firstMilestone === "commons" ? "Commons-led" : "Market-led"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#3a3225", lineHeight: 1.5 } }, state.firstMilestone === "capability" && "Your developmental state has structural commitments. Tax floor 18% (no austerity). Investor interest capped at 60% (foreign capital sees you as expensive). Pursuing market path now requires breaking your institutional foundation.", state.firstMilestone === "commons" && "Your social contract is solidaristic. Wage floor 45% (workers have organized). Capital flight triggers more easily on any market pivot. The Mondrag\xF3n path is now your political identity.", state.firstMilestone === "market" && "Capital concentration is structurally locked in. Commons score capped at 30. Worker-owned sectors take 30% productivity penalty (their political space is foreclosed). The accumulation has costs you cannot reverse.")))), tab === "debug" && /* @__PURE__ */ React.createElement("section", { style: S.panel }, /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Debug log"), showNotes && /* @__PURE__ */ React.createElement("div", { style: S.note }, "Full game state turn-by-turn. Copy and share for tuning feedback."), /* @__PURE__ */ React.createElement(DebugLogPanel, { debugLog: state.debugLog || [] })), /* @__PURE__ */ React.createElement("div", { style: S.stickyBar }, /* @__PURE__ */ React.createElement("button", { onClick: advanceTurn, disabled: !!state.gameOver, style: {
      ...S.advanceBtn,
      background: state.turn >= MAX_TURNS - 3 && !state.gameOver ? "#a83a1a" : "#2a2218"
    } }, state.gameOver ? "Game over" : state.turn >= MAX_TURNS - 3 ? `Advance turn (${MAX_TURNS - state.turn} left)` : "Advance turn \u2192"), /* @__PURE__ */ React.createElement("button", { onClick: reset, style: S.resetBtn }, "change biome")), /* @__PURE__ */ React.createElement("section", { style: S.reflectionBox }, /* @__PURE__ */ React.createElement("h2", { style: S.h2 }, "Reflection"), /* @__PURE__ */ React.createElement("div", { style: S.note }, "How did this place shape your choices? What did the terrain make easy or impossible?"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: reflection,
        onChange: (e) => setReflection(e.target.value),
        placeholder: "Your read of the system...",
        style: S.textarea
      }
    )), /* @__PURE__ */ React.createElement("footer", { style: S.footer }, "Geography is not destiny but it is friction. Hausmann would say capabilities can overcome it. Scott would say the terrain remembers."));
  }
  function BiomeSelect({ onSelect }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, globalCSS), /* @__PURE__ */ React.createElement("div", { style: S.biomeWrap }, /* @__PURE__ */ React.createElement("div", { style: S.eyebrow }, "Choose your place"), /* @__PURE__ */ React.createElement("h1", { style: S.h1 }, "Where do you begin?"), /* @__PURE__ */ React.createElement("div", { style: S.sub }, "The terrain doesn't decide the story, but it shapes what's easy, what's expensive, and what's never going to happen here."), /* @__PURE__ */ React.createElement("div", { style: S.pathPrimer }, /* @__PURE__ */ React.createElement("div", { style: S.pathPrimerTitle }, "Three paths will reveal themselves through your choices"), Object.entries(PATHS).map(([k, p]) => /* @__PURE__ */ React.createElement("div", { key: k, style: S.pathPrimerCard }, /* @__PURE__ */ React.createElement("div", { style: { ...S.pathPrimerName, color: p.color } }, p.name), /* @__PURE__ */ React.createElement("div", { style: S.pathPrimerBlurb }, p.blurb), /* @__PURE__ */ React.createElement("div", { style: S.pathPrimerTrigger }, "To trigger: ", p.triggerLabel))), /* @__PURE__ */ React.createElement("div", { style: S.pathPrimerNote }, "20 turns. At the end, scored against all three. No single winner.")), Object.keys(BIOMES).map((k) => {
      const b = BIOMES[k];
      return /* @__PURE__ */ React.createElement("button", { key: k, onClick: () => onSelect(k), style: { ...S.biomeCard, borderColor: b.color } }, /* @__PURE__ */ React.createElement("div", { style: S.biomeTop }, /* @__PURE__ */ React.createElement("span", { style: S.biomeIcon }, b.icon), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, textAlign: "left" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.biomeName, color: b.color } }, b.name), /* @__PURE__ */ React.createElement("div", { style: S.biomeChar }, b.character))), /* @__PURE__ */ React.createElement("div", { style: S.biomeBlurb }, b.blurb), /* @__PURE__ */ React.createElement("div", { style: S.biomeAdvantages }, /* @__PURE__ */ React.createElement("div", { style: S.biomeAdvCol }, /* @__PURE__ */ React.createElement("div", { style: S.biomeAdvLabel }, "Advantaged"), Object.entries(b.sectorMult).filter(([s, v]) => v >= 1.3).map(([s, v]) => /* @__PURE__ */ React.createElement("div", { key: s, style: { ...S.biomeAdvItem, color: SECTORS[s].color } }, "\u2191 ", SECTORS[s].name, " ", /* @__PURE__ */ React.createElement("span", { className: "num" }, "\xD7", v.toFixed(1))))), /* @__PURE__ */ React.createElement("div", { style: S.biomeAdvCol }, /* @__PURE__ */ React.createElement("div", { style: S.biomeAdvLabel }, "Limited"), Object.entries(b.sectorMult).filter(([s, v]) => v <= 0.7 && v > 0).map(([s, v]) => /* @__PURE__ */ React.createElement("div", { key: s, style: { ...S.biomeAdvItem, color: "#7a6a4a" } }, "\u2193 ", SECTORS[s].name, " ", /* @__PURE__ */ React.createElement("span", { className: "num" }, "\xD7", v.toFixed(1)))), Object.entries(b.sectorAvailable).filter(([s, v]) => v === false).map(([s]) => /* @__PURE__ */ React.createElement("div", { key: s, style: { ...S.biomeAdvItem, color: "#a83a1a" } }, "\u2715 ", SECTORS[s].name, " unavailable")))), /* @__PURE__ */ React.createElement("div", { style: S.biomeShocks }, /* @__PURE__ */ React.createElement("span", { style: S.biomeShockLabel }, "Common shocks:"), " ", Object.entries(b.shockBias).filter(([s, v]) => v >= 1.5).map(([s]) => SHOCKS[s].name).join(", ")));
    })));
  }
  function Stat({ label, value }) {
    return /* @__PURE__ */ React.createElement("div", { style: S.stat }, /* @__PURE__ */ React.createElement("div", { style: S.statLabel }, label), /* @__PURE__ */ React.createElement("div", { className: "num", style: S.statValue }, value));
  }
  function Pill({ label, val }) {
    return /* @__PURE__ */ React.createElement("div", { style: S.pill }, /* @__PURE__ */ React.createElement("span", { style: S.pillLabel }, label), /* @__PURE__ */ React.createElement("span", { className: "num", style: S.pillVal }, val));
  }
  function TabBtn({ active, onClick, children }) {
    return /* @__PURE__ */ React.createElement("button", { onClick, style: { ...S.tabBtn, background: active ? "#2a2218" : "transparent", color: active ? "#f5ead5" : "#5a4e3a", borderColor: active ? "#2a2218" : "#d8c4a0" } }, children);
  }
  function Distro({ label, value, max, color }) {
    const pct = max > 0 ? value / max * 100 : 0;
    return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "#3a3225" } }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { className: "num" }, value.toFixed(0))), /* @__PURE__ */ React.createElement("div", { style: { height: 12, background: "#ead5ab", borderRadius: 2, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { className: "bar", style: { width: `${pct}%`, height: "100%", background: color } })));
  }
  function pathProximity(pathKey, state) {
    const checks = [];
    if (pathKey === "capability") {
      checks.push({ label: `R&D \u2265 3`, current: state.vowels.rd, target: 3, ok: state.vowels.rd >= 3 });
      checks.push({ label: `Schools \u2265 3`, current: state.vowels.schools, target: 3, ok: state.vowels.schools >= 3 });
      checks.push({ label: `Tax \u2265 20%`, current: `${(state.taxRate * 100).toFixed(0)}%`, target: "20%", ok: state.taxRate >= 0.2 });
    }
    if (pathKey === "commons") {
      const localShare = (state.allocation.services || 0) + (state.allocation.cooperatives || 0) + (state.allocation.ecotourism || 0);
      checks.push({ label: `Wages \u2265 55%`, current: `${(state.wageBargain * 100).toFixed(0)}%`, target: "55%", ok: state.wageBargain >= 0.55 });
      checks.push({ label: `Local sectors \u2265 30%`, current: `${(localShare * 100).toFixed(0)}%`, target: "30%", ok: localShare >= 0.3 });
      checks.push({ label: `Health \u2265 2`, current: state.vowels.health, target: 2, ok: state.vowels.health >= 2 });
    }
    if (pathKey === "market") {
      const extShare = (state.allocation.mining || 0) + (state.allocation.tourism || 0) + (state.allocation.finance || 0);
      checks.push({ label: `Tax \u2264 12%`, current: `${(state.taxRate * 100).toFixed(0)}%`, target: "12%", ok: state.taxRate <= 0.12 });
      checks.push({ label: `Extractive \u2265 35%`, current: `${(extShare * 100).toFixed(0)}%`, target: "35%", ok: extShare >= 0.35 });
      checks.push({ label: `Wages \u2264 40%`, current: `${(state.wageBargain * 100).toFixed(0)}%`, target: "40%", ok: state.wageBargain <= 0.4 });
    }
    const okCount = checks.filter((c) => c.ok).length;
    return { checks, okCount, total: checks.length, ratio: okCount / checks.length };
  }
  function rungColor(i) {
    return ["#b8a87c", "#8a9a5a", "#3f7a8a", "#8a3f5a"][i];
  }
  function buildingEffects(key, level) {
    const effects = {
      roads: {
        0: "Crops and tourism limited (need roads 1).",
        1: "Crops and tourism active. Manufacturing limited (need roads 2).",
        2: "Manufacturing and finance enabled. Logistics smoother.",
        3: "Mining and specialized at full effectiveness. Infrastructure for advanced sectors.",
        4: "Research and regenerative get logistics boost. Diminishing returns past here."
      },
      port: {
        0: "No exports. Tourism and finance limited.",
        1: "Basic trade. Light tourism. Food imports start.",
        2: "Manufacturing exports. Cheap food imports. Foreign capital can flow.",
        3: "Finance & finance reaches full potential. Maximum trade leverage.",
        4: "Hub-port economy. Massive trade flows. Diminishing returns."
      },
      schools: {
        0: "No worker training. Workforce stuck unskilled.",
        1: "Slow training to semi-skilled. Crops, services run.",
        2: "Faster training. Mining, agritech, ecotourism unlocked.",
        3: "Skilled workers train fast. Manufacturing, specialized, finance unlocked.",
        4: "+15% training speed. Research enabled. High-complexity sectors reach full output.",
        5: "+30% training speed. Reduces rural brain drain."
      },
      health: {
        0: "Workers can't accumulate skill. Training halved.",
        1: "Baseline. Food crises cause unrecoverable penalty.",
        2: "Health 2: penalty recovers 5%/turn when food covered. 25% protection against new penalty.",
        3: "Health 3: 10%/turn recovery, 50% protection. Better workforce stability.",
        4: "Health 4: full shock protection on health-related shocks (drought).",
        5: "Health 5: workforce demographic stability, retirement rate reduced."
      },
      rd: {
        0: "No high-complexity sectors. Capability path blocked.",
        1: "Manufacturing unlocked. Agritech possible.",
        2: "Specialized manufacturing unlocked. Some sectors run efficient.",
        3: "Capability path triggers (with tax+schools). Research enabled. Regenerative possible.",
        4: "+10% productivity on tier 2+ sectors. Frontier R&D.",
        5: "+20% productivity on tier 2+ sectors. Diminishing returns past 5.",
        6: "Pure prestige; cost-benefit collapses past 5."
      },
      ruleOfLaw: {
        0: "No outside investment possible. Finance blocked.",
        1: "Basic property rights. Mining/tourism can operate.",
        2: "Foreign capital starts flowing. Investor interest gains 17%.",
        3: "Capital flows stable. Finance unlocks. Investor interest gains 26%.",
        4: "Investor interest at 35% from rule of law. Market inflows maximized.",
        5: "Diminishing returns past here."
      }
    };
    const e = effects[key] || {};
    const current = e[level] || "No documented effect at this level.";
    const next = e[level + 1] || "No further upgrade modeled.";
    return { current, next };
  }
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
      const hasT2 = Object.keys(state.unlocked).some((k) => SECTORS[k]?.tier === 2);
      if (hasT2) helping.push("Tier 2 sector unlocked");
      else next.push("Unlock a Tier 2 sector (manufacturing or specialized)");
      if (t.complexityScore < 220) next.push(`Allocate more workers to high-complexity sectors (current: ${t.complexityScore.toFixed(0)}/220)`);
    }
    if (pathKey === "commons") {
      if (state.wageBargain >= 0.55) helping.push(`Wage bargain at ${(state.wageBargain * 100).toFixed(0)}%`);
      else blocking.push(`Wage bargain at ${(state.wageBargain * 100).toFixed(0)}% (need 55%+)`);
      if (state.vowels.health >= 2) helping.push("Health funded");
      else blocking.push(`Health at level ${state.vowels.health} (need 2+)`);
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
      if (state.taxRate <= 0.1) helping.push(`Low tax at ${(state.taxRate * 100).toFixed(0)}%`);
      else blocking.push(`Tax at ${(state.taxRate * 100).toFixed(0)}% (target \u226410%)`);
      if (state.wageBargain <= 0.35) helping.push(`Wages low at ${(state.wageBargain * 100).toFixed(0)}%`);
      else blocking.push(`Wages at ${(state.wageBargain * 100).toFixed(0)}% (target \u226435%)`);
      const extractiveShare = (state.allocation.mining || 0) + (state.allocation.tourism || 0) + (state.allocation.finance || 0);
      if (extractiveShare >= 0.4) helping.push(`${(extractiveShare * 100).toFixed(0)}% in extractive sectors`);
      else blocking.push(`Only ${(extractiveShare * 100).toFixed(0)}% in mining/tourism/finance (target 40%+)`);
      if (state.vowels.ruleOfLaw >= 2) helping.push("Rule of law funded (attracts outside capital)");
      else next.push(`Rule of law at level ${state.vowels.ruleOfLaw} (need 2+ for stable capital inflows)`);
      if (t.accumulatedCapital < 1500) next.push(`Need ${(1500 - t.accumulatedCapital).toFixed(0)} more accumulated capital`);
    }
    return { helping, blocking, next };
  }
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
      return "Mondrag\xF3n-style cooperative deep commons.";
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
    let r = (num >> 16) + percent, g = (num >> 8 & 255) + percent, b = (num & 255) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
  }
  function getLeverHints(lever, currentVal) {
    switch (lever) {
      case "wageBargain":
        return { up: ["commons"], down: ["market"], neutral: currentVal >= 0.45 && currentVal <= 0.65 ? ["capability"] : [] };
      case "taxRate":
        return { up: ["capability", "commons"], down: ["market"], neutral: [] };
      default:
        return { up: [], down: [], neutral: [] };
    }
  }
  function getSectorHints(sectorKey) {
    const sect = SECTORS[sectorKey];
    const hints = { up: [], down: [] };
    if (sect.complexity >= 4) hints.up.push("capability");
    if (sect.complexity <= 1 && sectorKey !== "services") hints.down.push("capability");
    if (sect.ownerType === "worker" || sect.ownerType === "local") {
      if (sect.wageCeiling >= 0.8) hints.up.push("commons");
    }
    if (sect.ownerType === "outside" && sect.wageFloor < 0.4) hints.down.push("commons");
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
    return /* @__PURE__ */ React.createElement("div", { style: S.stepperRow }, /* @__PURE__ */ React.createElement("button", { onClick: onDec, disabled: decDisabled, style: S.stepperBtn }, "\u2212"), /* @__PURE__ */ React.createElement("div", { style: S.stepperDisplay }, /* @__PURE__ */ React.createElement("span", { className: "num", style: S.stepperValue }, value), showHints && hints && /* @__PURE__ */ React.createElement("div", { style: S.hintInline }, /* @__PURE__ */ React.createElement("div", { style: S.hintCol }, hints.down && hints.down.filter((p) => revealedPaths?.includes(p)).map((p) => /* @__PURE__ */ React.createElement("span", { key: p, style: { ...S.hintArrow, background: PATHS[p].color } }, "\u2190 ", p[0].toUpperCase()))), /* @__PURE__ */ React.createElement("div", { style: S.hintCol }, hints.up && hints.up.filter((p) => revealedPaths?.includes(p)).map((p) => /* @__PURE__ */ React.createElement("span", { key: p, style: { ...S.hintArrow, background: PATHS[p].color } }, p[0].toUpperCase(), " \u2192"))))), /* @__PURE__ */ React.createElement("button", { onClick: onInc, disabled: incDisabled, style: S.stepperBtn }, "+"));
  }
  function DebugLogPanel({ debugLog }) {
    const [copied, setCopied] = useState(false);
    const fullText = debugLog.join("\n\n");
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      } catch (e) {
        const ta = document.getElementById("debug-log-textarea");
        if (ta) {
          ta.select();
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 2e3);
        }
      }
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.debugActions }, /* @__PURE__ */ React.createElement("button", { onClick: handleCopy, style: {
      ...S.debugCopyBtn,
      background: copied ? "#5a8a3f" : "#8a3f1a"
    } }, copied ? "\u2713 copied" : "copy full log"), /* @__PURE__ */ React.createElement("span", { style: S.debugMeta }, debugLog.length, " entries \xB7 ", fullText.length, " chars")), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        id: "debug-log-textarea",
        value: fullText,
        readOnly: true,
        style: S.debugTextarea,
        onClick: (e) => e.target.select()
      }
    ), /* @__PURE__ */ React.createElement("div", { style: S.debugHint }, "Tap inside the box to select all, or use the copy button. Paste this to Sean for tuning feedback."));
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
        setCopied(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: S.modalOverlay, onClick: onClose }, /* @__PURE__ */ React.createElement("div", { style: S.modal, className: "reveal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: S.modalCloseX, "aria-label": "Close" }, "\u2715"), reveal.type === "path" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.modalEyebrow }, "Path emerging"), /* @__PURE__ */ React.createElement("div", { style: { ...S.modalTitle, color: PATHS[reveal.payload].color } }, PATHS[reveal.payload].name), /* @__PURE__ */ React.createElement("div", { style: S.modalBody }, PATHS[reveal.payload].blurb), /* @__PURE__ */ React.createElement("div", { style: S.modalMeta }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, /* @__PURE__ */ React.createElement("strong", null, "Trigger:"), " ", PATHS[reveal.payload].triggerLabel), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, /* @__PURE__ */ React.createElement("strong", null, "Metric:"), " ", PATHS[reveal.payload].metric), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6, fontStyle: "italic", fontSize: 12 } }, PATHS[reveal.payload].metricExplainer), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", null, "Milestone:"), " ", PATHS[reveal.payload].milestone)), reveal.payload === "capability" && /* @__PURE__ */ React.createElement("div", { style: S.historyBlock }, /* @__PURE__ */ React.createElement("div", { style: S.historyHeader }, "How others walked this path"), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "South Korea (1962-1997):"), " Park Chung-hee's developmental state. Public investment in steel, shipbuilding, and electronics. State-directed bank loans to chaebol conglomerates. Education as national priority. Result: per capita income from $100 to $14,000. Cost: authoritarian period, 1997 financial crisis when chaebol over-leveraged."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Singapore (1965-present):"), " Lee Kuan Yew's state capitalism. EDB recruited multinationals selectively. Forced savings via CPF. Public housing for 80%. Top global ranks in education and complexity. Cost: tightly managed politics, limited free speech."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Tensions to watch:"), ` Capability requires patience and state capacity. The "middle income trap" hits when easy gains are exhausted but institutions aren't sophisticated enough for frontier innovation. Brazil and Argentina got stuck here.`)), reveal.payload === "commons" && /* @__PURE__ */ React.createElement("div", { style: S.historyBlock }, /* @__PURE__ */ React.createElement("div", { style: S.historyHeader }, "How others walked this path"), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Mondrag\xF3n Corporation (Basque Country, 1956-present):"), " Started by a priest, Jos\xE9 Mar\xEDa Arizmendiarrieta, after the Spanish Civil War. Today 81,000 worker-owners across 100+ cooperatives. Caja Laboral (worker-owned bank) finances expansion. Salary ratios capped at 1:9 (vs 1:350 in US firms). Survived 2008 with no layoffs \u2014 wages cut instead. Tension: foreign subsidiaries are not cooperatives."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Emilia-Romagna (Italy):"), " 8,000+ cooperatives covering 30% of GDP. Strong public services, regional banking. Average income above national average, inequality below. Built over a century of patient institution-building."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Tensions to watch:"), " Commons economies scale slowly and struggle to raise outside capital (since returns are capped). They're vulnerable to capture when nearby market economies poach talent with higher salaries. Maintaining the commons requires constant institutional renewal.")), reveal.payload === "market" && /* @__PURE__ */ React.createElement("div", { style: S.historyBlock }, /* @__PURE__ */ React.createElement("div", { style: S.historyHeader }, "How others walked this path"), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Chile under Pinochet (1973-1990):"), ' The "Chicago Boys" implemented neoliberal reforms \u2014 privatized state firms, slashed taxes, dismantled labor protections. Foreign capital flowed in. GDP growth was strong but inequality spiked to the highest in OECD. The political cost: thousands killed, decades of disputed legitimacy. Inequality persists today and triggered the 2019 protests.'), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Saudi Arabia / Gulf states:"), " Rentier model. Oil revenue + low taxes + imported labor. State accumulates massive sovereign wealth, but local population isn't productive \u2014 most work is done by migrants. Vision 2030 is trying to diversify before oil runs out. Norway's sovereign wealth fund is the rare exception that managed extraction without curse."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, /* @__PURE__ */ React.createElement("strong", null, "Tensions to watch:"), " Market path produces accumulated capital fast but is brittle. Commodity crashes hit hard (1986 oil glut, 2014 oil collapse). Capital flight is always one shock away. Without strong institutions, extraction often ends with elite capture and hollowed-out local economies.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: S.modalBtn }, "Continue")), reveal.type === "unlock" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.modalEyebrow }, "Sector unlocked"), /* @__PURE__ */ React.createElement("div", { style: { ...S.modalTitle, color: SECTORS[reveal.payload].color } }, SECTORS[reveal.payload].name), /* @__PURE__ */ React.createElement("div", { style: S.modalBody }, SECTORS[reveal.payload].blurb), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: S.modalBtn }, "Continue")), reveal.type === "shock" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...S.modalEyebrow, color: "#a83a1a" } }, "\u26A1 Shock event"), /* @__PURE__ */ React.createElement("div", { style: { ...S.modalTitle, color: "#a83a1a" } }, SHOCKS[reveal.payload].name), /* @__PURE__ */ React.createElement("div", { style: S.modalBody }, SHOCKS[reveal.payload].blurb), /* @__PURE__ */ React.createElement("div", { style: S.modalMeta }, "Affected sectors lose ", (SHOCKS[reveal.payload].severity * 100).toFixed(0), "% for 2 turns."), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: S.modalBtn }, "Brace")), reveal.type === "milestone" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.modalEyebrow }, "\u2726 Milestone reached"), /* @__PURE__ */ React.createElement("div", { style: { ...S.modalTitle, color: PATHS[reveal.payload].color } }, PATHS[reveal.payload].name), /* @__PURE__ */ React.createElement("div", { style: S.modalBody }, PATHS[reveal.payload].milestone), reveal.payload === "capability" && /* @__PURE__ */ React.createElement("div", { style: S.historyBlock }, /* @__PURE__ */ React.createElement("div", { style: S.historyHeader }, "What economies do after this point"), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, "You've reached the complexity of Thailand, Mexico, or Czech Republic. Mid-complexity economies face a choice: keep pushing into advanced manufacturing and R&D (Korea, Taiwan, Singapore), or stagnate (Brazil, Argentina, Malaysia have all been stuck near this level for decades)."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, 'The "middle income trap" is real. Easy gains from cheap labor and tech transfer run out. Next-stage growth requires institutional reform, frontier R&D, and political stability \u2014 much harder than the catch-up phase.')), reveal.payload === "commons" && /* @__PURE__ */ React.createElement("div", { style: S.historyBlock }, /* @__PURE__ */ React.createElement("div", { style: S.historyHeader }, "What economies do after this point"), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, "You're operating like Nordic social democracies or strong cooperative networks. The challenge ahead: maintaining the commons as the economy grows. Sweden's model held until financial deregulation in the 1990s. Denmark's flexicurity adapts to shocks."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, "The political work never ends. Every generation must re-commit to the social contract or it erodes. The Mondrag\xF3n cooperatives constantly innovate their governance to prevent capture.")), reveal.payload === "market" && /* @__PURE__ */ React.createElement("div", { style: S.historyBlock }, /* @__PURE__ */ React.createElement("div", { style: S.historyHeader }, "What economies do after this point"), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, "You've accumulated significant capital. The question is what you do with it. Norway built a sovereign wealth fund and saved for the future. The Gulf states are now scrambling to diversify away from oil before reserves drop. Most resource economies haven't managed this transition."), /* @__PURE__ */ React.createElement("div", { style: S.historyItem }, "Risk now: capital flight, commodity crashes, and political instability from inequality. The accumulated wealth is real but fragile. Without institutional investment (rule of law, education, infrastructure), it can evaporate fast.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: S.modalBtn }, "Continue")), reveal.type === "failure" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...S.modalEyebrow, color: "#a83a1a" } }, "Game over"), /* @__PURE__ */ React.createElement("div", { style: { ...S.modalTitle, color: "#a83a1a" } }, FAILURE_MODES[reveal.payload].name), /* @__PURE__ */ React.createElement("div", { style: S.modalBody }, FAILURE_MODES[reveal.payload].description), /* @__PURE__ */ React.createElement("div", { style: S.modalLogRow }, /* @__PURE__ */ React.createElement("button", { onClick: copyLog, style: {
      ...S.modalSecondaryBtn,
      background: copied ? "#5a8a3f" : "#8a3f1a",
      color: "#fdf6e3"
    } }, copied ? "\u2713 log copied" : "\u{1F4CB} copy log"), /* @__PURE__ */ React.createElement("button", { onClick: onViewLog, style: S.modalSecondaryBtn }, "view log")), /* @__PURE__ */ React.createElement("button", { onClick: reset, style: S.modalBtn }, "Try again")), reveal.type === "complete" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: S.modalEyebrow }, "20 turns. Final scorecard."), /* @__PURE__ */ React.createElement("div", { style: { ...S.modalTitle, color: "#2a2218" } }, "How did your story score?"), /* @__PURE__ */ React.createElement("div", { style: S.modalBody }, "No single winner. Three different judgments of the same economy."), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, Object.entries(reveal.payload).map(([pk, s]) => {
      const p = PATHS[pk];
      const pct = Math.min(100, s.score / s.target * 100);
      return /* @__PURE__ */ React.createElement("div", { key: pk, style: { ...S.finalCard, borderColor: p.color } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.finalName, color: p.color } }, s.hit ? "\u2726 " : "", p.name, s.hit && /* @__PURE__ */ React.createElement("span", { style: S.finalHit }, "milestone reached")), /* @__PURE__ */ React.createElement("div", { style: S.finalMetric }, p.metric), /* @__PURE__ */ React.createElement("div", { style: S.pathBar }, /* @__PURE__ */ React.createElement("div", { style: { width: `${pct}%`, height: "100%", background: p.color, borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { style: S.finalScore }, /* @__PURE__ */ React.createElement("span", { className: "num" }, s.score.toFixed(0)), " / ", /* @__PURE__ */ React.createElement("span", { className: "num" }, s.target), /* @__PURE__ */ React.createElement("span", { style: S.finalPct }, "(", pct.toFixed(0), "%)")));
    })), /* @__PURE__ */ React.createElement("div", { style: S.modalLogRow }, /* @__PURE__ */ React.createElement("button", { onClick: copyLog, style: {
      ...S.modalSecondaryBtn,
      background: copied ? "#5a8a3f" : "#8a3f1a",
      color: "#fdf6e3"
    } }, copied ? "\u2713 log copied" : "\u{1F4CB} copy log"), /* @__PURE__ */ React.createElement("button", { onClick: onViewLog, style: S.modalSecondaryBtn }, "view log")), /* @__PURE__ */ React.createElement("button", { onClick: reset, style: S.modalBtn }, "Try another place"))));
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
      color: "#2a2218",
      padding: "20px 14px 100px",
      maxWidth: 640,
      margin: "0 auto"
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
      display: "block",
      width: "100%",
      textAlign: "left",
      background: "#fdf6e3",
      border: "2px solid",
      borderRadius: 6,
      padding: "16px 16px",
      marginTop: 14,
      fontFamily: "inherit",
      cursor: "pointer"
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
      width: "100%",
      minHeight: 320,
      padding: 10,
      border: "1px solid #d8c4a0",
      borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      background: "#fef8e8",
      color: "#2a2218",
      lineHeight: 1.4,
      resize: "vertical",
      whiteSpace: "pre",
      overflowX: "auto"
    },
    debugHint: { fontSize: 11, color: "#7a6a4a", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }
  };
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(CommunitySim, null));
})();
