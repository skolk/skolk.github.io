
import React, { useState, useMemo, useEffect } from "react";

// =====================================================================
// THE FACILITATOR
// Two communities. One mediator. Iterated game theory under shocks.
// =====================================================================

const VERSION = "v5";
const VERSION_NOTES = "v5: copy-log button at bottom for sharing playtest state";

// ============ COMMUNITIES ============
// Each community is an agent with state, priors, and decision rules.

const STARTING_RURAL = {
  name: "Greenhollow",
  kind: "rural",
  color: "#7e8b3a",
  accent: "#5a8a3f",
  icon: "🌾",
  // Capacities
  food: 100,        // produces food
  materials: 80,    // produces water, timber, ecosystem services
  population: 1200,
  cohesion: 70,     // social fabric
  // Needs from the other side
  capital: 20,      // low: starved of investment
  healthAccess: 35, // low: clinics are thin
  marketAccess: 40, // low: hard to sell what they grow
  knowledgeIn: 30,  // low: brain drain
  // Disposition
  trust: 40,        // trust toward the urban side
  voice: 50,        // feeling of being heard
  patience: 70,     // willingness to wait for a deal to pay off
  memory: 80,       // long memory of broken promises
  // Cultural priors (display-only modifiers on dialogue)
  priors: ["long memory", "values autonomy", "distrusts being extracted from"],
};

const STARTING_URBAN = {
  name: "Bastion",
  kind: "urban",
  color: "#3f7a8a",
  accent: "#3a5f7a",
  icon: "🏙",
  // Capacities
  capital: 100,
  manufactured: 80,
  services: 90,
  knowledge: 85,
  population: 8000,
  cohesion: 60,
  // Needs from the other side
  food: 45,
  materials: 35,
  ecosystem: 30,    // carbon, water buffering, biodiversity
  labor: 40,
  // Disposition
  trust: 45,
  voice: 60,        // urban tends to feel its voice is the default voice
  patience: 35,     // shorter time horizon
  memory: 35,       // forgets agreements quickly
  priors: ["short memory", "values efficiency", "treats rural as backwater or backdrop"],
};

// ============ INSTITUTIONS (Ostrom ladder) ============
// Each institution, once built, shifts the payoff matrix permanently.

const INSTITUTIONS = {
  watershed_council: {
    name: "Watershed Council",
    blurb: "Shared monitoring and rule-making for the river basin both sides depend on.",
    cost: { trust: 25, capital: 15, materials: 10 },
    requires: { trust: 50 },
    effects: {
      droughtMitigation: 0.4,
      stormMitigation: 0.3,
      cooperatePayoff: 3,
      defectPenalty: 2,
    },
    tier: 1,
    lineage: "Ostrom · Spanish huertas, Maine lobster gangs",
  },
  food_hub: {
    name: "Regional Food Hub",
    blurb: "Aggregation, processing, fair pricing. Connects rural surplus to urban kitchens.",
    cost: { trust: 20, capital: 25, materials: 8 },
    requires: { trust: 35 },
    effects: {
      foodFlowBonus: 1.4,
      marketAccessBonus: 25,
      tradeDisruptionMitigation: 0.4,
      cooperatePayoff: 3,
    },
    tier: 1,
    lineage: "Raj Patel · Cuban organopónicos · Hardwick VT",
  },
  knowledge_exchange: {
    name: "Knowledge Exchange",
    blurb: "Rural elders teach soil and water; urban engineers teach instrumentation. Both ways.",
    cost: { trust: 15, knowledge: 20 },
    requires: { trust: 40 },
    effects: {
      knowledgeFlow: 1.5,
      brainDrainMitigation: 0.5,
      voiceLift: 8,
    },
    tier: 1,
    lineage: "James Scott · Indy Johar · Donella Meadows",
  },
  regional_bank: {
    name: "Regional Bank",
    blurb: "Capital flows on patient terms. Rural land collateral valued by ecological function.",
    cost: { trust: 35, capital: 40 },
    requires: { trust: 60, institutions: 2 },
    effects: {
      capitalFlow: 1.6,
      financialPanicMitigation: 0.5,
      cooperatePayoff: 4,
    },
    tier: 2,
    lineage: "Hausmann · cooperative finance · land trusts",
  },
  health_circuit: {
    name: "Mobile Health Circuit",
    blurb: "Urban clinicians on rotation. Rural midwives and herbalists co-credentialed.",
    cost: { trust: 20, services: 25, capital: 10 },
    requires: { trust: 55 },
    effects: {
      healthAccessBonus: 35,
      cohesionBonus: 6,
    },
    tier: 2,
    lineage: "Esther Duflo · Cuban family medicine",
  },
  carbon_compact: {
    name: "Carbon &amp; Biodiversity Compact",
    blurb: "Urban pays rural for measured ecosystem services. Real payments, real audits.",
    cost: { trust: 40, capital: 30, knowledge: 15 },
    requires: { trust: 65, institutions: 3 },
    effects: {
      ecosystemFlow: 1.5,
      ruralCapitalFlow: 25,
      cooperatePayoff: 5,
      defectPenalty: 3,
    },
    tier: 3,
    lineage: "Astraeus framing · nature-based MRV · stewardship payments",
  },
};

// ============ SHOCKS ============
// Asymmetric. Each shock hits the two sides differently.

const SHOCKS = {
  drought: {
    name: "Drought",
    icon: "☀",
    blurb: "Rains fail. Wells thin. Crops at risk.",
    ruralHit: { food: -22, materials: -10, cohesion: -4 },
    urbanHit: { food: -6, services: -3 },
    mitigatedBy: "droughtMitigation",
    weight: 1.2,
  },
  financial_panic: {
    name: "Financial Panic",
    icon: "📉",
    blurb: "Credit freezes. Investors flee. Asset prices crater.",
    ruralHit: { marketAccess: -15, capital: -5 },
    urbanHit: { capital: -28, services: -10, cohesion: -5 },
    mitigatedBy: "financialPanicMitigation",
    weight: 1.0,
  },
  trade_disruption: {
    name: "Trade Disruption",
    icon: "⚓",
    blurb: "Supply chains break. Imports and exports both stall.",
    ruralHit: { marketAccess: -18, materials: -5 },
    urbanHit: { manufactured: -18, food: -8 },
    mitigatedBy: "tradeDisruptionMitigation",
    weight: 1.0,
  },
  storm: {
    name: "Storm Event",
    icon: "🌀",
    blurb: "A bad one. Flooding, wind, infrastructure damage.",
    ruralHit: { food: -10, materials: -15, cohesion: -3 },
    urbanHit: { manufactured: -8, services: -10, cohesion: -3 },
    mitigatedBy: "stormMitigation",
    weight: 0.9,
  },
  political_shock: {
    name: "Political Shock",
    icon: "⚖",
    blurb: "Election upset, scandal, legitimacy crisis. The side currently extracting more takes it harder.",
    ruralHit: { voice: -10, trust: -5 },
    urbanHit: { voice: -10, trust: -5 },
    mitigatedBy: null,
    weight: 0.8,
    asymmetric: true,
  },
  heatwave: {
    name: "Heatwave",
    icon: "🔥",
    blurb: "Persistent heat dome. Outdoor labor and the elderly suffer.",
    ruralHit: { food: -12, cohesion: -3 },
    urbanHit: { services: -8, cohesion: -6, manufactured: -4 },
    mitigatedBy: "droughtMitigation",
    weight: 0.9,
  },
  pest_outbreak: {
    name: "Pest Outbreak",
    icon: "🪲",
    blurb: "Crop pests or zoonotic disease. Knowledge networks are the cure.",
    ruralHit: { food: -18, cohesion: -2 },
    urbanHit: { food: -6 },
    mitigatedBy: "knowledgeFlow",
    weight: 0.8,
  },
};

// ============ FACILITATOR MOVES ============

const MOVES = {
  translate: {
    name: "Translate",
    blurb: "Help one side actually hear what the other is asking.",
    cost: { facilitatorEnergy: 1 },
    effects: { voiceBoth: 4, trustBoth: 2 },
    canSkip: true,
  },
  propose_trade: {
    name: "Propose a One-Turn Trade",
    blurb: "A direct exchange this turn. Easy to do, builds no lasting structure.",
    cost: { facilitatorEnergy: 2 },
    requires: { trust: 25 },
    sets: "trade_pending",
  },
  broker_agreement: {
    name: "Broker a Multi-Turn Agreement",
    blurb: "A binding exchange across several turns. Survives one shock.",
    cost: { facilitatorEnergy: 3 },
    requires: { trust: 40 },
    sets: "agreement_pending",
  },
  build_institution: {
    name: "Build a Shared Institution",
    blurb: "Slow. Expensive in trust capital. Compounds forever.",
    cost: { facilitatorEnergy: 4 },
    requires: { trust: 50 },
    sets: "institution_pending",
  },
  share_information: {
    name: "Open Information Flow",
    blurb: "Make the data visible to both. Reduces misunderstanding. Can backfire if weaponized.",
    cost: { facilitatorEnergy: 2 },
    effects: { knowledgeFlow: 1.1, voiceBoth: 3 },
  },
  mediate: {
    name: "Mediate the Current Dispute",
    blurb: "Only available when a grievance is live. Resolve it before it festers.",
    cost: { facilitatorEnergy: 3 },
    requires: { grievanceLive: true },
  },
};

// ============ DIALOGUE GENERATORS ============
// Each community speaks each turn. Lines blend state, shocks, and history.

// ============ PLAYTEST DUMP ============
// Builds a plain-text snapshot of game state for copy-paste sharing.

function buildPlaytestDump(state) {
  const lines = [];
  lines.push(`THE FACILITATOR — playtest log`);
  lines.push(`version: ${VERSION}`);
  lines.push(`scenario: ${SCENARIOS[state.scenarioKey].name}`);
  lines.push(`turn: ${state.turn}${state.gameOver ? ` (game over: ${state.gameOver.type} — ${state.gameOver.reason})` : ""}`);
  lines.push(``);

  const r = state.rural;
  const u = state.urban;
  lines.push(`GREENHOLLOW (rural)`);
  lines.push(`  food ${r.food.toFixed(0)}  materials ${r.materials.toFixed(0)}  cohesion ${r.cohesion.toFixed(0)}`);
  lines.push(`  capital ${r.capital.toFixed(0)}  market ${r.marketAccess.toFixed(0)}  health ${r.healthAccess.toFixed(0)}  knowledgeIn ${r.knowledgeIn.toFixed(0)}`);
  lines.push(`  trust→urban ${r.trust.toFixed(0)}  voice ${r.voice.toFixed(0)}  patience ${r.patience.toFixed(0)}  memory ${r.memory.toFixed(0)}`);
  lines.push(``);
  lines.push(`BASTION (urban)`);
  lines.push(`  capital ${u.capital.toFixed(0)}  manufactured ${u.manufactured.toFixed(0)}  services ${u.services.toFixed(0)}  cohesion ${u.cohesion.toFixed(0)}`);
  lines.push(`  food ${u.food.toFixed(0)}  materials ${u.materials.toFixed(0)}  ecosystem ${u.ecosystem.toFixed(0)}  labor ${u.labor.toFixed(0)}`);
  lines.push(`  trust→rural ${u.trust.toFixed(0)}  voice ${u.voice.toFixed(0)}  patience ${u.patience.toFixed(0)}  memory ${u.memory.toFixed(0)}`);
  lines.push(``);

  lines.push(`INSTITUTIONS BUILT (${state.institutions.length})`);
  if (state.institutions.length === 0) {
    lines.push(`  (none)`);
  } else {
    for (const k of state.institutions) {
      lines.push(`  - ${INSTITUTIONS[k].name} (tier ${INSTITUTIONS[k].tier})`);
    }
  }
  lines.push(``);

  lines.push(`ACTIVE AGREEMENTS (${state.activeAgreements.length})`);
  if (state.activeAgreements.length === 0) {
    lines.push(`  (none)`);
  } else {
    for (const a of state.activeAgreements) {
      lines.push(`  - ${a.deal.urbanGets.label} ↔ ${a.deal.ruralGets.label}, ${a.turnsLeft} turns left`);
    }
  }
  lines.push(``);

  lines.push(`SHOCK HISTORY`);
  if (state.shockHistory.length === 0) {
    lines.push(`  (none yet)`);
  } else {
    for (const sh of state.shockHistory) {
      lines.push(`  t${sh.turn}: ${SHOCKS[sh.shock].name}`);
    }
  }
  lines.push(``);

  lines.push(`STATE FLAGS`);
  lines.push(`  facilitatorEnergy: ${state.facilitatorEnergy}`);
  lines.push(`  grievanceLive: ${state.grievanceLive}`);
  lines.push(`  recentBetrayalBy: ${state.recentBetrayalBy || "none"}`);
  lines.push(``);

  lines.push(`TURN-BY-TURN LOG`);
  for (const entry of state.log) {
    const tone = entry.tone === "good" ? "+ " : entry.tone === "bad" ? "- " : "  ";
    lines.push(`  t${entry.turn} ${tone}${entry.text}`);
  }

  if (state.lastTurnSummary) {
    lines.push(``);
    lines.push(`LAST TURN DELTAS`);
    const dr = state.lastTurnSummary.deltas.rural;
    const du = state.lastTurnSummary.deltas.urban;
    lines.push(`  move: ${state.lastTurnSummary.move}`);
    lines.push(`  rural: trust ${dr.trust >= 0 ? "+" : ""}${dr.trust.toFixed(1)}, voice ${dr.voice >= 0 ? "+" : ""}${dr.voice.toFixed(1)}, cohesion ${dr.cohesion >= 0 ? "+" : ""}${dr.cohesion.toFixed(1)}, food ${dr.food >= 0 ? "+" : ""}${dr.food.toFixed(1)}`);
    lines.push(`  urban: trust ${du.trust >= 0 ? "+" : ""}${du.trust.toFixed(1)}, voice ${du.voice >= 0 ? "+" : ""}${du.voice.toFixed(1)}, cohesion ${du.cohesion >= 0 ? "+" : ""}${du.cohesion.toFixed(1)}, food ${du.food >= 0 ? "+" : ""}${du.food.toFixed(1)}`);
  }

  return lines.join("\n");
}


function ruralVoice(state) {
  const r = state.rural;
  const u = state.urban;
  const lastShock = state.lastShock;
  const lines = { position: "", fear: "", ask: "" };

  // POSITION
  if (r.trust < 30) {
    lines.position = `We have been told before that working with ${u.name} will help us. We are still waiting for the help to arrive.`;
  } else if (r.trust > 70) {
    lines.position = `${u.name} has actually shown up when it mattered. We are willing to go further than we would have last year.`;
  } else if (r.marketAccess < 35) {
    lines.position = `What we grow does not reach a fair price. We are not asking for charity, we are asking for access.`;
  } else if (r.voice < 35) {
    lines.position = `Decisions about our land keep getting made in rooms we are not in.`;
  } else {
    lines.position = `The basics are working. The river runs. The fields are in. We are watching to see whether the next agreement holds.`;
  }

  // FEAR
  if (lastShock === "drought" || lastShock === "heatwave") {
    lines.fear = `Another dry year and we will have to sell land to ${u.name} or to someone worse.`;
  } else if (lastShock === "financial_panic") {
    lines.fear = `When the city panics, the credit we depend on disappears first.`;
  } else if (r.capital < 20) {
    lines.fear = `We are one bad turn from losing the farm. Patience is not infinite.`;
  } else if (r.healthAccess < 30) {
    lines.fear = `Our clinic is one person. If she leaves, we have nothing.`;
  } else {
    lines.fear = `That the deal you broker this turn will be forgotten in the city by next spring.`;
  }

  // ASK
  if (r.marketAccess < 40) lines.ask = `A fair price for what we already produce. Not a subsidy.`;
  else if (r.healthAccess < 40) lines.ask = `Clinicians on a real schedule. We will host them.`;
  else if (r.capital < 30) lines.ask = `Capital that does not demand we sell the land underneath it.`;
  else if (r.knowledgeIn < 40) lines.ask = `Our young people are leaving. Help us give them a reason to come back.`;
  else lines.ask = `Recognition. Pay us properly for the water and carbon our land already provides.`;

  return lines;
}

function urbanVoice(state) {
  const r = state.rural;
  const u = state.urban;
  const lastShock = state.lastShock;
  const lines = { position: "", fear: "", ask: "" };

  // POSITION
  if (u.trust < 30) {
    lines.position = `We have offered terms before and they were called extractive. We do not know what they want from us.`;
  } else if (u.trust > 70) {
    lines.position = `${r.name} has held up their end. Council is open to formal compacts our predecessors would have rejected.`;
  } else if (u.food < 20) {
    lines.position = `Our food security is thin. We need a reliable rural supply, on commercial terms or otherwise.`;
  } else if (u.capital < 50) {
    lines.position = `Our capital base is constrained. New commitments need to show returns inside our political cycle.`;
  } else {
    lines.position = `We are productive and we are paying for things. We expect that to be recognized.`;
  }

  // FEAR
  if (lastShock === "financial_panic") {
    lines.fear = `If this credit cycle keeps tightening we cannot keep our own services running, let alone subsidize anyone else.`;
  } else if (lastShock === "trade_disruption") {
    lines.fear = `Without imports we are exposed. We have to be sure the rural supply line holds.`;
  } else if (u.food < 25) {
    lines.fear = `A hungry city is an ungovernable city.`;
  } else if (u.cohesion < 50) {
    lines.fear = `Our voters will turn on any deal that looks like a transfer out of the city.`;
  } else {
    lines.fear = `That we sign something now and the rural side renegotiates the moment we are weak.`;
  }

  // ASK
  if (u.food < 25) lines.ask = `Guaranteed food volumes. We will pay, but we need the certainty.`;
  else if (u.materials < 30) lines.ask = `Building materials and water. We have growth to fund and we cannot import everything.`;
  else if (u.ecosystem < 35) lines.ask = `Verifiable carbon and watershed stewardship. We need it on a balance sheet.`;
  else if (u.labor < 45) lines.ask = `Workers willing to come into city jobs. Migration on fair terms.`;
  else lines.ask = `A predictable rural partner. Surprise renegotiations cost us more than the deal saves.`;

  return lines;
}

// ============ PAYOFF MATRIX ============
// Each turn we compute, given current state, what each cell of the 2x2 yields.
// Players: Rural and Urban. Choices: Cooperate or Defect with the current proposed deal.

function computePayoffMatrix(state, proposedDeal) {
  const r = state.rural;
  const u = state.urban;
  const instEffects = aggregateInstitutionEffects(state.institutions);
  const baseCoop = 5 + (instEffects.cooperatePayoff || 0);
  const baseDefectAgainstCoop = 8; // tempting in any single round
  const baseDefectBoth = -3 - (instEffects.defectPenalty || 0);
  const baseSucker = -5;

  // Modifiers based on the specific proposed deal
  const stakes = proposedDeal ? proposedDeal.stakes : 4;

  // Trust amplifies cooperation outcomes; distrust amplifies defection temptation
  const trustAvg = (r.trust + u.trust) / 200; // 0..1
  const coopBonus = trustAvg * 3;

  return {
    CC: { rural: baseCoop + coopBonus + stakes * 0.5, urban: baseCoop + coopBonus + stakes * 0.5, label: "Both cooperate" },
    CD: { rural: baseSucker - stakes * 0.3, urban: baseDefectAgainstCoop + stakes * 0.4, label: "Rural cooperates, Urban defects" },
    DC: { rural: baseDefectAgainstCoop + stakes * 0.4, urban: baseSucker - stakes * 0.3, label: "Urban cooperates, Rural defects" },
    DD: { rural: baseDefectBoth, urban: baseDefectBoth, label: "Both defect" },
  };
}

function aggregateInstitutionEffects(builtList) {
  const out = {};
  for (const key of builtList) {
    const eff = INSTITUTIONS[key].effects;
    for (const k of Object.keys(eff)) {
      out[k] = (out[k] || 0) + eff[k];
    }
  }
  return out;
}

// ============ NPC DECISION LOGIC ============
// Each community decides whether to cooperate or defect on the current proposal.
// Decision blends: trust, recent betrayal, current need, payoff matrix, institutions.

function ruralDecision(state, payoff) {
  const r = state.rural;
  let coopScore = 0;

  // Payoff difference: rural CC vs DC for rural
  coopScore += (payoff.CC.rural - payoff.DC.rural) * 0.4;

  // Trust shifts the perception
  coopScore += (r.trust - 50) * 0.12;

  // Patience makes long-term thinking easier
  coopScore += (r.patience - 50) * 0.08;

  // Recent betrayal triggers memory
  if (state.recentBetrayalBy === "urban") coopScore -= 12 * (r.memory / 100);

  // Voice: feeling unheard makes defection more likely
  coopScore += (r.voice - 50) * 0.1;

  // Desperation: if capacity is collapsing, cooperate to survive (wider band)
  if (r.food < 45) coopScore += 4;
  if (r.cohesion < 40) coopScore += 4;
  if (r.capital < 20) coopScore += 3;

  // Baseline willingness: a small positive bias to cooperate (we're meeting, after all)
  coopScore += 1.5;

  return coopScore > 0 ? "C" : "D";
}

function urbanDecision(state, payoff) {
  const u = state.urban;
  let coopScore = 0;

  coopScore += (payoff.CC.urban - payoff.DC.urban) * 0.4;
  coopScore += (u.trust - 50) * 0.12;
  coopScore += (u.patience - 50) * 0.08;
  if (state.recentBetrayalBy === "rural") coopScore -= 10 * (u.memory / 100);
  coopScore += (u.voice - 50) * 0.05;

  // Urban defects more readily when capital is squeezed
  if (u.capital < 30) coopScore -= 4;

  // Urban desperate for food
  if (u.food < 40) coopScore += 4;
  if (u.food < 25) coopScore += 4;
  if (u.cohesion < 40) coopScore += 3;

  // Baseline willingness
  coopScore += 1.5;

  return coopScore > 0 ? "C" : "D";
}

// ============ DEAL GENERATION ============

function generateProposedDeal(state, moveType) {
  const r = state.rural;
  const u = state.urban;

  // Figure out what each side currently most needs
  const ruralNeeds = [
    { key: "capital", gap: 50 - r.capital, label: "investment capital" },
    { key: "marketAccess", gap: 60 - r.marketAccess, label: "market access" },
    { key: "healthAccess", gap: 60 - r.healthAccess, label: "healthcare access" },
    { key: "knowledgeIn", gap: 60 - r.knowledgeIn, label: "knowledge inflow" },
  ].sort((a, b) => b.gap - a.gap);

  const urbanNeeds = [
    { key: "food", gap: 50 - u.food, label: "food supply" },
    { key: "materials", gap: 50 - u.materials, label: "materials and water" },
    { key: "ecosystem", gap: 50 - u.ecosystem, label: "ecosystem services" },
    { key: "labor", gap: 60 - u.labor, label: "labor inflow" },
  ].sort((a, b) => b.gap - a.gap);

  const ruralAsk = ruralNeeds[0];
  const urbanAsk = urbanNeeds[0];

  const stakeSize = moveType === "propose_trade" ? 3 : moveType === "broker_agreement" ? 6 : 9;

  return {
    moveType,
    ruralGives: urbanAsk,
    ruralGets: ruralAsk,
    urbanGives: ruralAsk,
    urbanGets: urbanAsk,
    stakes: stakeSize,
    summary: `${state.urban.name} provides ${ruralAsk.label}. ${state.rural.name} provides ${urbanAsk.label}.`,
    duration: moveType === "propose_trade" ? 1 : moveType === "broker_agreement" ? 3 : 999,
  };
}

// ============ SHOCK APPLICATION ============

function applyShock(state, shockKey) {
  const shock = SHOCKS[shockKey];
  const inst = aggregateInstitutionEffects(state.institutions);
  const mitigation = shock.mitigatedBy ? Math.min(0.7, inst[shock.mitigatedBy] || 0) : 0;
  const damp = 1 - mitigation;

  const newRural = { ...state.rural };
  const newUrban = { ...state.urban };

  for (const k of Object.keys(shock.ruralHit)) {
    newRural[k] = Math.max(0, Math.min(100, newRural[k] + shock.ruralHit[k] * damp));
  }
  for (const k of Object.keys(shock.urbanHit)) {
    newUrban[k] = Math.max(0, Math.min(100, newUrban[k] + shock.urbanHit[k] * damp));
  }

  // Political shock asymmetry: hits whichever side has been extracting more
  if (shock.asymmetric) {
    const ruralBalance = computeExtraction(state, "urban_extracts_rural");
    const urbanBalance = computeExtraction(state, "rural_extracts_urban");
    if (ruralBalance > urbanBalance) {
      newUrban.trust = Math.max(0, newUrban.trust - 8);
      newUrban.voice = Math.max(0, newUrban.voice - 6);
    } else {
      newRural.trust = Math.max(0, newRural.trust - 8);
      newRural.voice = Math.max(0, newRural.voice - 6);
    }
  }

  return { rural: newRural, urban: newUrban, damp };
}

function computeExtraction(state, direction) {
  // Simple heuristic for who has been taking more from whom
  const history = state.history || [];
  let score = 0;
  for (const h of history.slice(-5)) {
    if (h.type === "deal" && h.ruralChoice === "D" && h.urbanChoice === "C" && direction === "rural_extracts_urban") score++;
    if (h.type === "deal" && h.urbanChoice === "D" && h.ruralChoice === "C" && direction === "urban_extracts_rural") score++;
  }
  return score;
}

// ============ DEAL OUTCOMES ============

function applyDealOutcome(state, deal, ruralChoice, urbanChoice) {
  const newRural = { ...state.rural };
  const newUrban = { ...state.urban };
  const events = [];

  if (ruralChoice === "C" && urbanChoice === "C") {
    // Both cooperate: real exchange happens
    if (deal.ruralGets.key in newRural) newRural[deal.ruralGets.key] = Math.min(100, newRural[deal.ruralGets.key] + deal.stakes * 1.5);
    if (deal.urbanGets.key in newUrban) newUrban[deal.urbanGets.key] = Math.min(100, newUrban[deal.urbanGets.key] + deal.stakes * 1.5);
    newRural.trust = Math.min(100, newRural.trust + 6);
    newUrban.trust = Math.min(100, newUrban.trust + 6);
    newRural.voice = Math.min(100, newRural.voice + 3);
    newUrban.voice = Math.min(100, newUrban.voice + 3);
    events.push({ tone: "good", text: `Deal honored on both sides. Trust climbed.` });
  } else if (ruralChoice === "C" && urbanChoice === "D") {
    // Rural cooperated, urban defected
    if (deal.urbanGets.key in newUrban) newUrban[deal.urbanGets.key] = Math.min(100, newUrban[deal.urbanGets.key] + deal.stakes * 1.2);
    newRural.trust = Math.max(0, newRural.trust - 18);
    newRural.voice = Math.max(0, newRural.voice - 10);
    newRural.cohesion = Math.max(0, newRural.cohesion - 4);
    events.push({ tone: "bad", text: `${state.urban.name} took what they needed and walked. ${state.rural.name} remembers.`, betrayer: "urban" });
  } else if (ruralChoice === "D" && urbanChoice === "C") {
    if (deal.ruralGets.key in newRural) newRural[deal.ruralGets.key] = Math.min(100, newRural[deal.ruralGets.key] + deal.stakes * 1.2);
    newUrban.trust = Math.max(0, newUrban.trust - 15);
    newUrban.voice = Math.max(0, newUrban.voice - 8);
    events.push({ tone: "bad", text: `${state.rural.name} took the inflow and didn't deliver. ${state.urban.name} is angry.`, betrayer: "rural" });
  } else {
    // Both defect
    newRural.trust = Math.max(0, newRural.trust - 6);
    newUrban.trust = Math.max(0, newUrban.trust - 6);
    newRural.cohesion = Math.max(0, newRural.cohesion - 2);
    newUrban.cohesion = Math.max(0, newUrban.cohesion - 2);
    events.push({ tone: "bad", text: `Neither side moved. The deal collapsed and both sides are a little more cynical.` });
  }

  return { rural: newRural, urban: newUrban, events };
}

// ============ SCENARIOS ============
// Different starting conditions to expose different dynamics.

const SCENARIOS = {
  equal: {
    name: "Even Ground",
    tagline: "Both sides have what they need to start. Trust is wary but workable.",
    detail: "Neither dominates. The classic coordination puzzle: can two roughly-equal partners build something durable before a shock breaks them apart?",
    glyph: "⚖",
    rural: {
      food: 100, materials: 80, cohesion: 70,
      capital: 20, healthAccess: 35, marketAccess: 40, knowledgeIn: 30,
      trust: 40, voice: 50, patience: 70, memory: 80,
    },
    urban: {
      capital: 100, manufactured: 80, services: 90, knowledge: 85, cohesion: 60,
      food: 45, materials: 35, ecosystem: 30, labor: 40,
      trust: 45, voice: 60, patience: 35, memory: 35,
    },
    opening: "Greenhollow and Bastion have neighbored each other for generations. Trade is occasional, mistrust is habitual, and neither side has invested in shared infrastructure. You are the first facilitator either has agreed to host.",
  },
  city_ascendant: {
    name: "City Ascendant",
    tagline: "Bastion thrives. Greenhollow is depleted and quietly resentful.",
    detail: "The urban side has accumulated capital, services, and knowledge for two generations. The rural side has been a supply zone. Trust on the rural side is very low, voice is even lower. This is the dominant pattern in most modern regions.",
    glyph: "🏙",
    rural: {
      food: 80, materials: 60, cohesion: 55,
      capital: 8, healthAccess: 18, marketAccess: 25, knowledgeIn: 15,
      trust: 22, voice: 25, patience: 60, memory: 90,
    },
    urban: {
      capital: 130, manufactured: 100, services: 100, knowledge: 100, cohesion: 75,
      food: 50, materials: 35, ecosystem: 20, labor: 55,
      trust: 55, voice: 80, patience: 30, memory: 25,
    },
    opening: "Bastion has done well. Its university is full, its hospitals are funded, its capital flows are robust. Greenhollow has done the opposite. Young people leave, the clinic runs one day a week, and most of the harvest is sold below cost to Bastion middlemen. You're here because a recent water dispute made the imbalance visible enough that someone in Bastion thought facilitation was cheaper than litigation.",
  },
  country_ascendant: {
    name: "Country Ascendant",
    tagline: "Greenhollow thrives. Bastion is fiscally stressed and hungry.",
    detail: "Decades of regenerative practice and intact ecosystems have given the rural side abundance and autonomy. The urban side is post-industrial, with stranded assets and a shrinking tax base. Trust on the urban side is low: they fear rural is hoarding. Rare in practice, common in post-collapse fiction.",
    glyph: "🌾",
    rural: {
      food: 130, materials: 110, cohesion: 85,
      capital: 50, healthAccess: 60, marketAccess: 55, knowledgeIn: 60,
      trust: 50, voice: 70, patience: 80, memory: 75,
    },
    urban: {
      capital: 55, manufactured: 55, services: 60, knowledge: 70, cohesion: 45,
      food: 32, materials: 22, ecosystem: 25, labor: 30,
      trust: 28, voice: 40, patience: 25, memory: 40,
    },
    opening: "Greenhollow has spent a generation rebuilding. Soil is deep, the river runs clean, the schools are full. Bastion has spent the same generation deindustrializing. Factories sit empty, the tax base has thinned, the food supply is thin. The mayor of Bastion finally agreed to host you because winter is coming and the city's reserves don't cover it.",
  },
  both_fraying: {
    name: "Both Fraying",
    tagline: "Polycrisis already underway. Neither side is healthy. Trust is the only thing keeping it from spiraling.",
    detail: "Compounding shocks have hit both sides. Capacity is low across the board. Cohesion is brittle. Trust is moderate but not durable, because both sides have a recent history of needing each other and failing to follow through. The hard mode.",
    glyph: "⚠",
    rural: {
      food: 60, materials: 50, cohesion: 45,
      capital: 12, healthAccess: 20, marketAccess: 25, knowledgeIn: 20,
      trust: 35, voice: 35, patience: 50, memory: 85,
    },
    urban: {
      capital: 50, manufactured: 50, services: 55, knowledge: 60, cohesion: 40,
      food: 35, materials: 25, ecosystem: 22, labor: 28,
      trust: 35, voice: 45, patience: 25, memory: 35,
    },
    opening: "It's been a hard five years for both. Drought, financial shocks, a pandemic that ran through both populations. Neither side has the slack to absorb another bad year alone. The current facilitator is here because there's no plan B.",
  },
};

function initialState(scenarioKey = "equal") {
  const scenario = SCENARIOS[scenarioKey];
  return {
    turn: 1,
    scenarioKey,
    rural: { ...STARTING_RURAL, ...scenario.rural },
    urban: { ...STARTING_URBAN, ...scenario.urban },
    institutions: [],
    facilitatorEnergy: 6,
    facilitatorReputation: 50,
    pendingDeal: null,
    pendingInstitution: null,
    activeAgreements: [], // multi-turn deals
    lastShock: null,
    shockHistory: [],
    history: [],
    log: [{ turn: 0, text: scenario.opening }],
    recentBetrayalBy: null,
    grievanceLive: false,
    gameOver: null,
    showMatrix: true,
  };
}

// ============ TURN RESOLUTION ============

function resolveTurn(state, facilitatorChoice) {
  let s = { ...state };
  const events = [];

  // Snapshot for "what just happened"
  const snapshot = {
    rural: { trust: s.rural.trust, voice: s.rural.voice, cohesion: s.rural.cohesion, food: s.rural.food, capital: s.rural.capital, materials: s.rural.materials, marketAccess: s.rural.marketAccess, healthAccess: s.rural.healthAccess },
    urban: { trust: s.urban.trust, voice: s.urban.voice, cohesion: s.urban.cohesion, food: s.urban.food, capital: s.urban.capital, materials: s.urban.materials, ecosystem: s.urban.ecosystem },
    move: facilitatorChoice,
    pendingDealMoveType: s.pendingDeal ? s.pendingDeal.moveType : null,
    pendingInstitutionKey: s.pendingInstitution,
    turn: s.turn,
  };

  // 1. Apply facilitator's chosen move (already partially applied during selection)
  if (facilitatorChoice === "translate") {
    // Translate gives bigger trust boost when trust is low (first-contact bonus)
    const rBoost = s.rural.trust < 40 ? 5 : 3;
    const uBoost = s.urban.trust < 40 ? 5 : 3;
    s.rural = { ...s.rural, voice: Math.min(100, s.rural.voice + 5), trust: Math.min(100, s.rural.trust + rBoost) };
    s.urban = { ...s.urban, voice: Math.min(100, s.urban.voice + 5), trust: Math.min(100, s.urban.trust + uBoost) };
    events.push({ tone: "neutral", text: `You translated. Each side felt heard.` });
  } else if (facilitatorChoice === "share_information") {
    s.rural = { ...s.rural, voice: Math.min(100, s.rural.voice + 4), trust: Math.min(100, s.rural.trust + 2) };
    s.urban = { ...s.urban, voice: Math.min(100, s.urban.voice + 4), trust: Math.min(100, s.urban.trust + 2) };
    events.push({ tone: "neutral", text: `You opened the data both ways. Both councils have more to work with.` });
  } else if (facilitatorChoice === "mediate") {
    if (s.grievanceLive) {
      s.rural = { ...s.rural, trust: Math.min(100, s.rural.trust + 10), voice: Math.min(100, s.rural.voice + 6) };
      s.urban = { ...s.urban, trust: Math.min(100, s.urban.trust + 10), voice: Math.min(100, s.urban.voice + 6) };
      s.grievanceLive = false;
      s.recentBetrayalBy = null;
      events.push({ tone: "good", text: `You mediated the open grievance. It is not erased, but it is resolved.` });
    }
  }

  // 2. Resolve any pending deal proposed THIS turn
  let dealOutcome = null;
  if (s.pendingDeal) {
    const payoff = computePayoffMatrix(s, s.pendingDeal);
    const rChoice = ruralDecision(s, payoff);
    const uChoice = urbanDecision(s, payoff);
    const outcome = applyDealOutcome(s, s.pendingDeal, rChoice, uChoice);
    s.rural = outcome.rural;
    s.urban = outcome.urban;
    events.push(...outcome.events);
    s.history = [...s.history, { turn: s.turn, type: "deal", ruralChoice: rChoice, urbanChoice: uChoice, deal: s.pendingDeal }];
    dealOutcome = { moveType: s.pendingDeal.moveType, ruralChoice: rChoice, urbanChoice: uChoice, ruralGets: s.pendingDeal.ruralGets, urbanGets: s.pendingDeal.urbanGets };

    const betrayal = outcome.events.find(e => e.betrayer);
    if (betrayal) {
      s.recentBetrayalBy = betrayal.betrayer;
      s.grievanceLive = true;
    }

    // Add active agreement if multi-turn and both cooperated
    if (s.pendingDeal.moveType === "broker_agreement" && rChoice === "C" && uChoice === "C") {
      s.activeAgreements = [...s.activeAgreements, { deal: s.pendingDeal, turnsLeft: s.pendingDeal.duration - 1 }];
    }
    s.pendingDeal = null;
  }

  // 3. Resolve pending institution build
  let institutionOutcome = null;
  if (s.pendingInstitution) {
    const inst = INSTITUTIONS[s.pendingInstitution];
    const payoff = computePayoffMatrix(s, { stakes: 8 });
    const rChoice = ruralDecision(s, payoff);
    const uChoice = urbanDecision(s, payoff);

    if (rChoice === "C" && uChoice === "C") {
      s.institutions = [...s.institutions, s.pendingInstitution];
      s.rural = {
        ...s.rural,
        trust: Math.min(100, s.rural.trust + 10),
        voice: Math.min(100, s.rural.voice + 8),
      };
      s.urban = {
        ...s.urban,
        trust: Math.min(100, s.urban.trust + 10),
        voice: Math.min(100, s.urban.voice + 8),
      };
      events.push({ tone: "good", text: `${inst.name} is built. Both councils participated in the founding.` });
      s.history = [...s.history, { turn: s.turn, type: "institution_built", which: s.pendingInstitution }];
      institutionOutcome = { key: s.pendingInstitution, name: inst.name, built: true };
    } else {
      s.rural = { ...s.rural, trust: Math.max(0, s.rural.trust - 4) };
      s.urban = { ...s.urban, trust: Math.max(0, s.urban.trust - 4) };
      events.push({ tone: "bad", text: `${inst.name} did not come together. One or both sides held back at the table.` });
      institutionOutcome = { key: s.pendingInstitution, name: inst.name, built: false, ruralChoice: rChoice, urbanChoice: uChoice };
    }
    s.pendingInstitution = null;
  }

  // 4. Apply ongoing benefits from active agreements (already-cooperating deals)
  s.activeAgreements = s.activeAgreements
    .map(a => {
      // Each turn, agreement provides ongoing exchange
      const newRural = { ...s.rural };
      const newUrban = { ...s.urban };
      if (a.deal.ruralGets.key in newRural) newRural[a.deal.ruralGets.key] = Math.min(100, newRural[a.deal.ruralGets.key] + a.deal.stakes * 0.6);
      if (a.deal.urbanGets.key in newUrban) newUrban[a.deal.urbanGets.key] = Math.min(100, newUrban[a.deal.urbanGets.key] + a.deal.stakes * 0.6);
      s.rural = newRural;
      s.urban = newUrban;
      return { ...a, turnsLeft: a.turnsLeft - 1 };
    })
    .filter(a => a.turnsLeft > 0);

  // 5. Apply institution standing benefits (slow tonic flows)
  const inst = aggregateInstitutionEffects(s.institutions);
  if (inst.healthAccessBonus) s.rural.healthAccess = Math.min(100, s.rural.healthAccess + 2);
  if (inst.marketAccessBonus) s.rural.marketAccess = Math.min(100, s.rural.marketAccess + 2);
  if (inst.brainDrainMitigation) s.rural.knowledgeIn = Math.min(100, s.rural.knowledgeIn + 1.5);
  if (inst.cohesionBonus) {
    s.rural.cohesion = Math.min(100, s.rural.cohesion + 1);
    s.urban.cohesion = Math.min(100, s.urban.cohesion + 1);
  }
  if (inst.foodFlowBonus) s.urban.food = Math.min(100, s.urban.food + 3);
  if (inst.ecosystemFlow) s.urban.ecosystem = Math.min(100, s.urban.ecosystem + 2);
  if (inst.capitalFlow) s.rural.capital = Math.min(100, s.rural.capital + 2);
  if (inst.ruralCapitalFlow) s.rural.capital = Math.min(100, s.rural.capital + 1.5);

  // 6. Apply natural drift (consumption, decay, demand, regen)
  s.urban.food = Math.max(0, s.urban.food - 2);
  s.urban.materials = Math.max(0, s.urban.materials - 2);
  s.urban.ecosystem = Math.max(0, s.urban.ecosystem - 1.5);
  s.rural.capital = Math.max(0, s.rural.capital - 1);
  s.rural.healthAccess = Math.max(0, s.rural.healthAccess - 0.5);
  s.rural.marketAccess = Math.max(0, s.rural.marketAccess - 0.5);
  // Rural produces food: small positive regen (capped at scenario start)
  s.rural.food = Math.min(140, s.rural.food + 2);
  // Rural produces materials: small positive regen
  s.rural.materials = Math.min(120, s.rural.materials + 1);

  // Trust decays slightly without action; memory keeps grievances warm
  s.rural.trust = Math.max(0, s.rural.trust - 0.5);
  s.urban.trust = Math.max(0, s.urban.trust - 1); // urban forgets faster

  // 7. Roll the shock
  const shockKey = rollShock(s);
  if (shockKey) {
    const result = applyShock(s, shockKey);
    s.rural = result.rural;
    s.urban = result.urban;
    s.lastShock = shockKey;
    s.shockHistory = [...s.shockHistory, { turn: s.turn, shock: shockKey }];
    const mitigated = result.damp < 1;
    events.push({
      tone: mitigated ? "neutral" : "bad",
      text: `Shock: ${SHOCKS[shockKey].name}. ${SHOCKS[shockKey].blurb}${mitigated ? ` (Institutions absorbed ${Math.round((1 - result.damp) * 100)}%.)` : ""}`,
    });
  }

  // 8. Replenish facilitator energy
  s.facilitatorEnergy = Math.min(8, s.facilitatorEnergy + 4);

  // 9. Advance turn
  s.turn += 1;

  // 10. Log events
  for (const e of events) {
    s.log = [...s.log, { turn: s.turn - 1, text: e.text, tone: e.tone }];
  }
  if (s.log.length > 40) s.log = s.log.slice(-40);

  // 11. Build the "what just happened" summary using snapshot vs current state
  s.lastTurnSummary = {
    turn: snapshot.turn,
    move: snapshot.move,
    dealOutcome,
    institutionOutcome,
    shock: s.lastShock !== state.lastShock ? s.lastShock : null,
    deltas: {
      rural: {
        trust: s.rural.trust - snapshot.rural.trust,
        voice: s.rural.voice - snapshot.rural.voice,
        cohesion: s.rural.cohesion - snapshot.rural.cohesion,
        food: s.rural.food - snapshot.rural.food,
        capital: s.rural.capital - snapshot.rural.capital,
        materials: s.rural.materials - snapshot.rural.materials,
        marketAccess: s.rural.marketAccess - snapshot.rural.marketAccess,
        healthAccess: s.rural.healthAccess - snapshot.rural.healthAccess,
      },
      urban: {
        trust: s.urban.trust - snapshot.urban.trust,
        voice: s.urban.voice - snapshot.urban.voice,
        cohesion: s.urban.cohesion - snapshot.urban.cohesion,
        food: s.urban.food - snapshot.urban.food,
        capital: s.urban.capital - snapshot.urban.capital,
        materials: s.urban.materials - snapshot.urban.materials,
        ecosystem: s.urban.ecosystem - snapshot.urban.ecosystem,
      },
    },
  };

  // 12. Check end conditions
  s.gameOver = checkEndConditions(s);

  return s;
}

function rollShock(state) {
  // No shock turn 1. After that, weighted random.
  if (state.turn === 1) return null;
  const keys = Object.keys(SHOCKS);
  // Skip if just had same shock
  const weights = keys.map(k => SHOCKS[k].weight * (state.lastShock === k ? 0.3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  // 25% chance of no shock on any given turn
  if (Math.random() < 0.35) return null;
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

function checkEndConditions(state) {
  const r = state.rural;
  const u = state.urban;
  if (r.cohesion <= 5 || r.food <= 10) {
    return { type: "loss", reason: "rural_collapse", text: `${r.name} has collapsed. Without rural function, the region cannot feed or sustain itself.` };
  }
  if (u.cohesion <= 5 || u.food <= 5) {
    return { type: "loss", reason: "urban_collapse", text: `${u.name} has fractured. A hungry city becomes ungovernable, and the consequences spread.` };
  }
  if (r.trust <= 5 && u.trust <= 5) {
    return { type: "loss", reason: "trust_zero", text: `Trust is gone on both sides. The relationship is severed. No facilitation can reach them now.` };
  }
  if (state.turn > 20) {
    const trustAvg = (r.trust + u.trust) / 2;
    const cohesionAvg = (r.cohesion + u.cohesion) / 2;
    const institutions = state.institutions.length;
    if (institutions >= 4 && trustAvg >= 65 && cohesionAvg >= 55) {
      return { type: "win", reason: "flourishing", text: `Both communities survived 20 turns and emerged more connected than they started. The region holds.` };
    }
    if (institutions >= 1 && trustAvg >= 40) {
      return { type: "partial", reason: "survived", text: `Both sides survived. Not flourishing, but the relationship is intact and can be built on.` };
    }
    return { type: "partial", reason: "endured", text: `The clock ran out. Both sides are still standing but the work is unfinished.` };
  }
  return null;
}

// ============ STYLES ============

const colors = {
  bg: "#d8dcb5",
  card: "#e8e7c4",
  cardEdge: "#a3a06b",
  ink: "#1e2812",
  inkSoft: "#4d5638",
  // Rural: warmer field-green, distinct from the sage base
  rural: "#7a8b2e",
  ruralAccent: "#5e8533",
  ruralBg: "#dde1a8",
  ruralDeep: "#3a4f1a",
  // Urban: dusk-blue, less corporate
  urban: "#4a7a92",
  urbanAccent: "#2f5670",
  urbanBg: "#c5d7dc",
  urbanDeep: "#1f3d54",
  // Facilitator: terracotta/clay, the warm pop against the moss
  facilitator: "#b56c3a",
  facilitatorDeep: "#7d3f1f",
  facilitatorBg: "#eccfa3",
  warn: "#c98a3a",
  bad: "#a23a1a",
  good: "#4d7a2a",
  divider: "#a8a979",
};

const S = {
  page: {
    padding: "12px 12px 60px",
    maxWidth: 640,
    margin: "0 auto",
    minHeight: "100vh",
    background: "#d8dcb5",
    backgroundImage:
      "radial-gradient(circle at 18% 12%, rgba(94, 133, 51, 0.14) 0px, transparent 50%)," +
      "radial-gradient(circle at 82% 88%, rgba(47, 86, 112, 0.10) 0px, transparent 50%)," +
      "radial-gradient(circle at 50% 50%, rgba(181, 108, 58, 0.06) 0px, transparent 60%)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#1e2812",
    position: "relative",
  },
  pageOuter: {
    background: "#d8dcb5",
    minHeight: "100vh",
    width: "100%",
  },
  header: { marginBottom: 16, paddingBottom: 14, position: "relative" },
  headerDivider: { height: 6, marginTop: 12, background: "transparent" },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: colors.facilitatorDeep, textTransform: "uppercase", marginBottom: 6, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 600 },
  h1: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, margin: "2px 0 6px", lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.02em", color: colors.ink },
  sub: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, color: colors.facilitatorDeep, lineHeight: 1.3, marginTop: 2 },
  turnRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: colors.inkSoft, padding: "10px 12px", background: "rgba(232, 231, 196, 0.55)", border: `1px dashed ${colors.cardEdge}`, borderRadius: 6, flexWrap: "wrap", gap: 8 },
  turnNum: { fontWeight: 600, color: colors.ink, fontSize: 14 },
  energyBlock: { display: "flex", alignItems: "center", gap: 5 },
  energyDot: { width: 10, height: 10, borderRadius: "50%", background: colors.facilitator, boxShadow: `0 1px 0 ${colors.facilitatorDeep}` },
  energyEmpty: { width: 10, height: 10, borderRadius: "50%", background: "transparent", border: `1.5px solid ${colors.facilitator}`, opacity: 0.4 },

  // Two-column councils
  councilsRow: { display: "flex", flexDirection: "column", gap: 12, margin: "14px 0" },
  council: {
    padding: 12,
    borderRadius: 10,
    border: `2px solid`,
    position: "relative",
    boxShadow: "2px 3px 0 rgba(0,0,0,0.06)",
  },
  councilHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px dashed rgba(0,0,0,0.15)` },
  councilIcon: { fontSize: 26 },
  councilName: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" },
  councilKind: { fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginLeft: "auto", color: colors.inkSoft, fontWeight: 600 },

  capacityRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 2 },
  capacityLabel: { color: colors.inkSoft, fontFamily: "Georgia, 'Times New Roman', serif" },
  capacityVal: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 700, fontSize: 13 },
  capacityBar: { height: 6, background: "rgba(0,0,0,0.07)", borderRadius: 3, marginBottom: 4, overflow: "hidden", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.08)" },
  capacityBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s cubic-bezier(.2,.7,.3,1)" },
  sectionLabel: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkSoft, fontWeight: 700, marginBottom: 5, marginTop: 10, display: "flex", alignItems: "center", gap: 5 },
  sectionLabelFirst: { marginTop: 0 },
  dotMark: { width: 4, height: 4, borderRadius: "50%", display: "inline-block" },

  // Voice block — speech bubble style
  voiceBlock: {
    background: "rgba(255, 254, 240, 0.7)",
    padding: "10px 12px 12px",
    borderRadius: 8,
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.ink,
    border: `1.5px solid rgba(58, 79, 26, 0.18)`,
    position: "relative",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  voiceLabel: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkSoft, marginBottom: 8, fontWeight: 700, fontFamily: "Georgia, 'Times New Roman', serif" },
  voiceLine: { marginBottom: 6, display: "flex", gap: 7, alignItems: "flex-start" },
  voiceLineGlyph: { flexShrink: 0, marginTop: 2, fontSize: 13 },

  // Matrix
  matrixSection: {
    background: colors.card,
    border: `2px solid ${colors.cardEdge}`,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    boxShadow: "2px 3px 0 rgba(0,0,0,0.06)",
    position: "relative",
  },
  matrixHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  matrixTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" },
  matrixSub: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, color: colors.facilitatorDeep },
  matrix: { display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 5, marginTop: 10, fontSize: 11 },
  matrixCorner: { padding: 4 },
  matrixColHeader: { padding: 6, textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Georgia, 'Times New Roman', serif" },
  matrixRowHeader: { padding: 6, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif" },
  matrixCell: {
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
    lineHeight: 1.3,
    border: "1.5px solid rgba(0,0,0,0.08)",
    transition: "all 0.3s ease",
  },
  matrixCellHighlight: {
    borderColor: colors.facilitator,
    boxShadow: `0 0 0 2px ${colors.facilitatorBg}`,
    transform: "translateY(-1px)",
  },
  matrixCellVal: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 700, fontSize: 15 },
  matrixCellLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 4, fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.3 },

  // Facilitator panel
  facilitatorPanel: {
    background: colors.facilitatorBg,
    border: `2px solid ${colors.facilitator}`,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    boxShadow: "2px 3px 0 rgba(125, 63, 31, 0.18)",
    position: "relative",
  },
  facilitatorTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, fontWeight: 700, color: colors.facilitatorDeep, marginBottom: 4, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 },
  facilitatorIntro: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, color: colors.facilitatorDeep, marginBottom: 10, lineHeight: 1.35 },

  moveBtn: {
    display: "block", width: "100%", textAlign: "left",
    padding: "11px 13px", marginBottom: 7,
    background: colors.card,
    border: `1.5px solid ${colors.cardEdge}`,
    borderRadius: 8,
    color: colors.ink, fontSize: 12, lineHeight: 1.4,
    fontFamily: "Georgia, 'Times New Roman', serif",
    transition: "all 0.2s ease",
    boxShadow: "1px 2px 0 rgba(0,0,0,0.05)",
  },
  moveBtnActive: {
    borderColor: colors.facilitator,
    background: "#f0d9ae",
    boxShadow: `0 0 0 2px ${colors.facilitatorBg}, 1px 2px 0 rgba(125,63,31,0.15)`,
    transform: "translateY(-1px)",
  },
  moveBtnTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" },
  moveBtnBlurb: { fontSize: 13, color: colors.inkSoft, lineHeight: 1.45 },
  moveBtnCost: { fontSize: 11, color: colors.facilitatorDeep, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 700, background: "rgba(181,108,58,0.15)", padding: "2px 7px", borderRadius: 10 },

  // Deal preview
  dealCard: {
    background: "rgba(252, 232, 200, 0.6)",
    border: `2px dashed ${colors.facilitator}`,
    padding: 12, borderRadius: 8, marginTop: 12,
    position: "relative",
  },
  dealTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.facilitatorDeep, marginBottom: 6 },
  dealLine: { fontSize: 15, lineHeight: 1.55, fontFamily: "Georgia, 'Times New Roman', serif" },

  // Institutions panel
  institutionsRow: {
    background: colors.card,
    border: `2px solid ${colors.cardEdge}`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    boxShadow: "2px 3px 0 rgba(0,0,0,0.06)",
  },
  institutionsHeader: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  institutionChip: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 10px", marginRight: 5, marginBottom: 5,
    fontSize: 12, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 600,
    background: "#d4d9a0",
    border: `1.5px solid ${colors.cardEdge}`,
    borderRadius: 20, color: colors.ink,
    boxShadow: "1px 1px 0 rgba(0,0,0,0.05)",
  },
  institutionChipEmpty: { fontSize: 13, color: colors.inkSoft, fontFamily: "Georgia, 'Times New Roman', serif" },

  // Choose institution
  institutionPick: {
    background: colors.card,
    border: `1.5px solid ${colors.cardEdge}`,
    padding: 10, marginBottom: 6,
    borderRadius: 8, fontSize: 11,
    transition: "all 0.2s ease",
    boxShadow: "1px 2px 0 rgba(0,0,0,0.04)",
  },
  institutionPickName: { fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 },
  institutionPickBlurb: { color: colors.inkSoft, lineHeight: 1.5, marginBottom: 6, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13 },
  institutionPickReq: { fontSize: 10, color: colors.facilitatorDeep, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" },

  // Resolve button
  resolveBtn: {
    width: "100%",
    padding: "14px 16px",
    background: colors.facilitator,
    color: "#fdf6e3",
    border: `2px solid ${colors.facilitatorDeep}`,
    borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginTop: 8,
    fontFamily: "Georgia, 'Times New Roman', serif",
    boxShadow: "2px 3px 0 rgba(125,63,31,0.35)",
    transition: "all 0.2s ease",
  },
  resolveBtnDisabled: { background: "#cbb18e", borderColor: "#a08661", boxShadow: "2px 3px 0 rgba(160,134,97,0.25)" },

  // Log
  logSection: { marginTop: 18, padding: 12, background: "rgba(232, 231, 196, 0.45)", borderRadius: 8, border: `1px dashed ${colors.cardEdge}` },
  logTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: colors.facilitatorDeep, marginBottom: 8 },
  logItem: { fontSize: 14, lineHeight: 1.55, padding: "7px 0", borderBottom: `1px dotted ${colors.divider}`, fontFamily: "Georgia, 'Times New Roman', serif", display: "flex", gap: 8, alignItems: "flex-start" },
  logTurn: { fontSize: 10, color: colors.inkSoft, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", flexShrink: 0, marginTop: 2, padding: "1px 5px", background: "rgba(0,0,0,0.04)", borderRadius: 3 },

  // Shock banner
  shockBanner: {
    background: "linear-gradient(135deg, #f6d18a, #efc06b)",
    border: `2px solid ${colors.warn}`,
    color: "#7d3f1f",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 14,
    textAlign: "center",
    fontWeight: 600,
    fontFamily: "Georgia, 'Times New Roman', serif",
    boxShadow: "2px 3px 0 rgba(201,138,58,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shockIcon: { fontSize: 22 },

  // End screen
  endScreen: { padding: 24, textAlign: "center" },
  endTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, marginBottom: 12, letterSpacing: "-0.02em", fontWeight: 700 },
  endText: { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, lineHeight: 1.5, color: colors.inkSoft, marginBottom: 24 },
  resetBtn: { padding: "12px 24px", background: colors.facilitator, color: "#fdf6e3", border: `2px solid ${colors.facilitatorDeep}`, borderRadius: 8, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, fontFamily: "Georgia, 'Times New Roman', serif", boxShadow: "2px 3px 0 rgba(125,63,31,0.35)" },

  // Intro
  intro: {
    background: colors.card,
    border: `2px solid ${colors.cardEdge}`,
    padding: 18, borderRadius: 10,
    marginBottom: 14, fontSize: 14, lineHeight: 1.6,
    fontFamily: "Georgia, 'Times New Roman', serif",
    boxShadow: "2px 3px 0 rgba(0,0,0,0.06)",
  },
  introP: { margin: "0 0 10px" },
  thinker: { fontSize: 12, color: colors.facilitatorDeep, fontStyle: "italic", fontFamily: "Georgia, 'Times New Roman', serif" },
};

// ============ ILLUSTRATIONS ============

function VillageScene({ color, accent, deep }) {
  return (
    <svg viewBox="0 0 120 50" width="100%" height="56" style={{ display: "block" }}>
      {/* Sun */}
      <circle cx="100" cy="12" r="6" fill="#f0c14a" opacity="0.75" />
      {/* Distant hills */}
      <path d="M 0 38 Q 25 28 50 32 T 120 30 L 120 50 L 0 50 Z" fill={deep} opacity="0.25" />
      {/* Field rows */}
      <path d="M 0 42 Q 30 40 60 42 T 120 41" stroke={accent} strokeWidth="0.6" fill="none" opacity="0.4" />
      <path d="M 0 45 Q 30 43 60 45 T 120 44" stroke={accent} strokeWidth="0.6" fill="none" opacity="0.4" />
      {/* Little house */}
      <g transform="translate(20, 28)">
        <path d="M 0 8 L 0 4 L 5 0 L 10 4 L 10 8 Z" fill="#b87a4a" stroke={deep} strokeWidth="0.5" />
        <rect x="3.5" y="4.5" width="3" height="3.5" fill="#5a3a1a" />
        <path d="M -1 4 L 5 -1 L 11 4" stroke={deep} strokeWidth="0.6" fill="none" />
      </g>
      {/* Tree */}
      <g transform="translate(45, 28)" className="sway">
        <rect x="2.5" y="6" width="1.2" height="4" fill="#6a4a2a" />
        <circle cx="3" cy="5" r="4" fill={accent} />
        <circle cx="5" cy="4" r="3" fill={color} />
        <circle cx="1.5" cy="4.5" r="2.8" fill={color} />
      </g>
      {/* Barn */}
      <g transform="translate(70, 26)">
        <rect x="0" y="4" width="12" height="8" fill="#a23a1a" opacity="0.85" stroke={deep} strokeWidth="0.5" />
        <path d="M -1 4 L 6 -1 L 13 4" fill="#7a2a10" stroke={deep} strokeWidth="0.5" />
        <line x1="6" y1="-1" x2="6" y2="12" stroke={deep} strokeWidth="0.3" />
      </g>
      {/* Wheat */}
      <g transform="translate(88, 38)">
        <line x1="0" y1="0" x2="0" y2="4" stroke={color} strokeWidth="0.5" />
        <line x1="2" y1="0" x2="2" y2="4" stroke={color} strokeWidth="0.5" />
        <line x1="4" y1="0" x2="4" y2="4" stroke={color} strokeWidth="0.5" />
        <circle cx="0" cy="0" r="0.8" fill="#d4a45a" />
        <circle cx="2" cy="0" r="0.8" fill="#d4a45a" />
        <circle cx="4" cy="0" r="0.8" fill="#d4a45a" />
      </g>
    </svg>
  );
}

function CityScene({ color, accent, deep }) {
  return (
    <svg viewBox="0 0 120 50" width="100%" height="56" style={{ display: "block" }}>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="citysky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbc89a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a8b4a8" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="50" fill="url(#citysky)" />
      {/* Distant low buildings */}
      <rect x="0" y="36" width="120" height="14" fill={deep} opacity="0.15" />
      {/* Skyline buildings */}
      <g fill={deep}>
        <rect x="8" y="24" width="9" height="20" />
        <rect x="20" y="18" width="11" height="26" />
        <rect x="34" y="14" width="8" height="30" />
        <rect x="45" y="22" width="10" height="22" />
        <rect x="58" y="10" width="9" height="34" />
        <rect x="70" y="16" width="12" height="28" />
        <rect x="85" y="20" width="9" height="24" />
        <rect x="97" y="14" width="10" height="30" />
        <rect x="110" y="22" width="8" height="22" />
      </g>
      {/* Highlights on buildings */}
      <g fill={accent} opacity="0.45">
        <rect x="20" y="18" width="11" height="3" />
        <rect x="34" y="14" width="8" height="3" />
        <rect x="58" y="10" width="9" height="3" />
        <rect x="97" y="14" width="10" height="3" />
      </g>
      {/* Lit windows */}
      <g fill="#f6d18a" opacity="0.85">
        <rect x="10" y="28" width="1.2" height="1.2" />
        <rect x="13" y="28" width="1.2" height="1.2" />
        <rect x="22" y="22" width="1.2" height="1.2" />
        <rect x="25" y="26" width="1.2" height="1.2" />
        <rect x="22" y="30" width="1.2" height="1.2" />
        <rect x="36" y="20" width="1.2" height="1.2" />
        <rect x="39" y="24" width="1.2" height="1.2" />
        <rect x="60" y="14" width="1.2" height="1.2" />
        <rect x="63" y="18" width="1.2" height="1.2" />
        <rect x="60" y="22" width="1.2" height="1.2" />
        <rect x="72" y="20" width="1.2" height="1.2" />
        <rect x="76" y="24" width="1.2" height="1.2" />
        <rect x="99" y="18" width="1.2" height="1.2" />
        <rect x="102" y="22" width="1.2" height="1.2" />
        <rect x="113" y="26" width="1.2" height="1.2" />
      </g>
      {/* Crane */}
      <g stroke={deep} strokeWidth="0.5" fill="none">
        <line x1="78" y1="8" x2="78" y2="22" />
        <line x1="74" y1="10" x2="88" y2="10" />
        <line x1="78" y1="8" x2="80" y2="9.5" />
        <line x1="82" y1="10" x2="82" y2="13" />
      </g>
    </svg>
  );
}

function Bridge() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0 14px", gap: 8 }}>
      <svg viewBox="0 0 200 26" width="100%" height="26" style={{ maxWidth: 300 }}>
        {/* Arched bridge between the two */}
        <path d="M 10 22 Q 100 -4 190 22" stroke={colors.facilitatorDeep} strokeWidth="1.2" fill="none" />
        <path d="M 10 22 Q 100 0 190 22" stroke={colors.facilitator} strokeWidth="0.8" fill="none" opacity="0.55" />
        {/* Pillars */}
        <line x1="10" y1="22" x2="10" y2="26" stroke={colors.facilitatorDeep} strokeWidth="1.5" />
        <line x1="190" y1="22" x2="190" y2="26" stroke={colors.facilitatorDeep} strokeWidth="1.5" />
        {/* Walker on bridge */}
        <circle cx="100" cy="5" r="1.5" fill={colors.facilitator} />
        <line x1="100" y1="6.5" x2="100" y2="10" stroke={colors.facilitator} strokeWidth="1" />
        {/* Decorative dots */}
        <circle cx="55" cy="12" r="0.8" fill={colors.facilitator} opacity="0.4" />
        <circle cx="145" cy="12" r="0.8" fill={colors.facilitator} opacity="0.4" />
      </svg>
    </div>
  );
}

function CompassMark() {
  return (
    <svg viewBox="0 0 30 30" width="22" height="22" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="15" cy="15" r="12" fill="none" stroke={colors.facilitatorDeep} strokeWidth="1.2" />
      <circle cx="15" cy="15" r="2" fill={colors.facilitatorDeep} />
      <path d="M 15 4 L 17 14 L 15 16 L 13 14 Z" fill={colors.facilitator} />
      <path d="M 15 26 L 13 16 L 15 14 L 17 16 Z" fill={colors.facilitatorBg} stroke={colors.facilitatorDeep} strokeWidth="0.5" />
    </svg>
  );
}


function CapacityBar({ label, value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div style={S.capacityRow}>
        <span style={S.capacityLabel}>{label}</span>
        <span style={S.capacityVal}>{value.toFixed(0)}</span>
      </div>
      <div style={S.capacityBar}>
        <div style={{ ...S.capacityBarFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function CouncilCard({ council, voice, isRural }) {
  const bg = isRural ? colors.ruralBg : colors.urbanBg;
  const border = isRural ? colors.rural : colors.urban;
  const accent = isRural ? colors.ruralAccent : colors.urbanAccent;
  const deep = isRural ? colors.ruralDeep : colors.urbanDeep;

  return (
    <div style={{ ...S.council, background: bg, borderColor: border }} className="fadein">
      {/* Scene illustration */}
      <div style={{ marginBottom: 8, marginLeft: -12, marginRight: -12, marginTop: -12, padding: "8px 12px 4px", background: "rgba(255,255,255,0.35)", borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
        {isRural ? <VillageScene color={border} accent={accent} deep={deep} /> : <CityScene color={border} accent={accent} deep={deep} />}
      </div>

      <div style={S.councilHeader}>
        <span style={S.councilIcon}>{council.icon}</span>
        <span style={{ ...S.councilName, color: deep }}>{council.name}</span>
        <span style={S.councilKind}>{council.kind}</span>
      </div>

      {/* What they have */}
      <div style={{ ...S.sectionLabel, ...S.sectionLabelFirst }}>
        <span style={{ ...S.dotMark, background: accent }} />
        What they have
      </div>
      {isRural ? (
        <>
          <CapacityBar label="Food production" value={council.food} color={accent} />
          <CapacityBar label="Materials &amp; water" value={council.materials} color={accent} />
          <CapacityBar label="Cohesion" value={council.cohesion} color={accent} />
        </>
      ) : (
        <>
          <CapacityBar label="Capital" value={council.capital} color={accent} />
          <CapacityBar label="Manufactured" value={council.manufactured} color={accent} />
          <CapacityBar label="Cohesion" value={council.cohesion} color={accent} />
        </>
      )}

      <div style={S.sectionLabel}>
        <span style={{ ...S.dotMark, background: colors.warn }} />
        What they need
      </div>
      {isRural ? (
        <>
          <CapacityBar label="Capital access" value={council.capital} color={colors.warn} />
          <CapacityBar label="Market access" value={council.marketAccess} color={colors.warn} />
          <CapacityBar label="Healthcare" value={council.healthAccess} color={colors.warn} />
        </>
      ) : (
        <>
          <CapacityBar label="Food security" value={council.food} color={colors.warn} />
          <CapacityBar label="Materials supply" value={council.materials} color={colors.warn} />
          <CapacityBar label="Ecosystem services" value={council.ecosystem} color={colors.warn} />
        </>
      )}

      <div style={S.sectionLabel}>
        <span style={{ ...S.dotMark, background: deep }} />
        Disposition
      </div>
      <CapacityBar label={`Trust → ${isRural ? "Urban" : "Rural"}`} value={council.trust} color={border} />
      <CapacityBar label="Feels heard" value={council.voice} color={border} />

      {voice && (
        <div style={S.voiceBlock}>
          <div style={S.voiceLabel}>{council.name} says...</div>
          <div style={S.voiceLine}>
            <span style={{ ...S.voiceLineGlyph, color: deep }}>◆</span>
            <span><strong style={{ color: deep, fontFamily: "Georgia, 'Times New Roman', serif" }}>Position.</strong> {voice.position}</span>
          </div>
          <div style={S.voiceLine}>
            <span style={{ ...S.voiceLineGlyph, color: colors.warn }}>⚠</span>
            <span><strong style={{ color: colors.warn, fontFamily: "Georgia, 'Times New Roman', serif" }}>Fear.</strong> {voice.fear}</span>
          </div>
          <div style={S.voiceLine}>
            <span style={{ ...S.voiceLineGlyph, color: colors.facilitatorDeep }}>✦</span>
            <span><strong style={{ color: colors.facilitatorDeep, fontFamily: "Georgia, 'Times New Roman', serif" }}>Ask.</strong> {voice.ask}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixCell({ value, isHighlight }) {
  return (
    <div style={{ ...S.matrixCell, background: isHighlight ? "#fce8c8" : "#eee9c4", ...(isHighlight ? S.matrixCellHighlight : {}) }}>
      <div style={S.matrixCellVal}>
        <span style={{ color: colors.ruralDeep }}>{value.rural >= 0 ? "+" : ""}{value.rural.toFixed(0)}</span>
        <span style={{ color: colors.inkSoft, margin: "0 4px" }}>/</span>
        <span style={{ color: colors.urbanDeep }}>{value.urban >= 0 ? "+" : ""}{value.urban.toFixed(0)}</span>
      </div>
      <div style={S.matrixCellLabel}>{value.label}</div>
    </div>
  );
}

function PayoffMatrix({ payoff, predictedR, predictedU }) {
  const predictedCell = `${predictedR}${predictedU}`;
  return (
    <div style={S.matrixSection}>
      <div style={S.matrixHeader}>
        <span style={S.matrixTitle}>Payoff this turn</span>
        <span style={S.matrixSub}>rural / urban</span>
      </div>
      <div style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 4, lineHeight: 1.5, fontFamily: "Georgia, 'Times New Roman', serif" }}>
        Each cell is what each side gains or loses. Their actual choice blends payoff with trust, memory, and how heard they feel.
        {predictedR && predictedU && (
          <> The bordered cell is what each side will likely pick.</>
        )}
      </div>
      <div style={S.matrix}>
        <div style={S.matrixCorner}></div>
        <div style={{ ...S.matrixColHeader, color: colors.urbanDeep }}>Urban<br/>cooperates</div>
        <div style={{ ...S.matrixColHeader, color: colors.urbanDeep }}>Urban<br/>defects</div>

        <div style={{ ...S.matrixRowHeader, color: colors.ruralDeep }}>Rural<br/>cooperates</div>
        <MatrixCell value={payoff.CC} isHighlight={predictedCell === "CC"} />
        <MatrixCell value={payoff.CD} isHighlight={predictedCell === "CD"} />

        <div style={{ ...S.matrixRowHeader, color: colors.ruralDeep }}>Rural<br/>defects</div>
        <MatrixCell value={payoff.DC} isHighlight={predictedCell === "DC"} />
        <MatrixCell value={payoff.DD} isHighlight={predictedCell === "DD"} />
      </div>
    </div>
  );
}

// ============ LAST TURN RECAP ============

function Delta({ value, threshold = 0.5 }) {
  if (Math.abs(value) < threshold) return null;
  const positive = value > 0;
  const color = positive ? colors.good : colors.bad;
  const sign = positive ? "+" : "";
  return (
    <span style={{
      fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
      fontWeight: 700,
      fontSize: 12,
      color,
      marginLeft: 6,
      padding: "1px 5px",
      borderRadius: 3,
      background: positive ? "rgba(77,122,42,0.12)" : "rgba(162,58,26,0.12)",
    }}>
      {sign}{value.toFixed(0)}
    </span>
  );
}

// ============ COPY LOG BUTTON ============
// Lets the player share a snapshot of game state for debugging.

function CopyLogButton({ state }) {
  const [status, setStatus] = useState("idle"); // idle | copied | failed | showing
  const [text, setText] = useState("");

  const handleClick = async () => {
    const dump = buildPlaytestDump(state);
    setText(dump);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dump);
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 2500);
        return;
      }
    } catch (e) {
      // fall through
    }
    // Fallback: show the textarea for manual select+copy
    setStatus("showing");
  };

  return (
    <div style={{ marginTop: 18, padding: 12, background: "rgba(232, 231, 196, 0.45)", borderRadius: 8, border: `1px dashed ${colors.cardEdge}` }}>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, fontWeight: 700, color: colors.facilitatorDeep, marginBottom: 8 }}>
        Share this playtest
      </div>
      <div style={{ fontSize: 13, color: colors.inkSoft, marginBottom: 10, lineHeight: 1.5, fontFamily: "Georgia, 'Times New Roman', serif" }}>
        Copies the full game state, institutions built, shocks weathered, and turn-by-turn log. Paste it back to Sean to share what you saw.
      </div>
      <button
        onClick={handleClick}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: status === "copied" ? colors.good : colors.facilitator,
          color: "#fdf6e3",
          border: `2px solid ${status === "copied" ? "#3a5a1a" : colors.facilitatorDeep}`,
          borderRadius: 8,
          fontSize: 14, fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: "Georgia, 'Times New Roman', serif",
          boxShadow: "2px 3px 0 rgba(125,63,31,0.25)",
          transition: "all 0.2s ease",
        }}
      >
        {status === "copied" ? "✓ Copied to clipboard" : status === "showing" ? "Select text below and copy" : "Copy playtest log"}
      </button>
      {status === "showing" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 6, fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Clipboard access didn't work — tap and hold below to select all, then copy.
          </div>
          <textarea
            readOnly
            value={text}
            onFocus={(e) => e.target.select()}
            style={{
              width: "100%",
              minHeight: 220,
              padding: 10,
              fontSize: 11,
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              border: `1.5px solid ${colors.cardEdge}`,
              borderRadius: 6,
              background: "#fdf8e7",
              color: colors.ink,
              resize: "vertical",
            }}
          />
        </div>
      )}
    </div>
  );
}

function LastTurnCard({ summary, scenarioName }) {
  if (!summary) return null;

  const MOVE_LABELS = {
    translate: "Translated between the councils",
    share_information: "Opened information both ways",
    mediate: "Mediated the live grievance",
    propose_trade: "Proposed a one-turn trade",
    broker_agreement: "Brokered a multi-turn agreement",
    build_institution: "Proposed building an institution",
  };

  const moveLabel = MOVE_LABELS[summary.move] || summary.move;
  const dr = summary.deltas.rural;
  const du = summary.deltas.urban;

  // What happened to the deal/institution
  let outcomeLine = null;
  if (summary.dealOutcome) {
    const { ruralChoice, urbanChoice, ruralGets, urbanGets } = summary.dealOutcome;
    if (ruralChoice === "C" && urbanChoice === "C") {
      outcomeLine = { tone: "good", text: `Both sides honored the deal. Rural got ${ruralGets.label}, urban got ${urbanGets.label}.` };
    } else if (ruralChoice === "D" && urbanChoice === "D") {
      outcomeLine = { tone: "bad", text: `Both sides defected. The deal collapsed and trust took a hit.` };
    } else if (ruralChoice === "C") {
      outcomeLine = { tone: "bad", text: `Rural held up their end. Urban defected and walked off with what they needed.` };
    } else {
      outcomeLine = { tone: "bad", text: `Urban held up their end. Rural took the inflow and didn't deliver.` };
    }
  } else if (summary.institutionOutcome) {
    if (summary.institutionOutcome.built) {
      outcomeLine = { tone: "good", text: `${summary.institutionOutcome.name} was founded — both councils signed on.` };
    } else {
      outcomeLine = { tone: "bad", text: `${summary.institutionOutcome.name} did not come together. One or both sides held back.` };
    }
  }

  const shockText = summary.shock ? `Then ${SHOCKS[summary.shock].name.toLowerCase()} hit: ${SHOCKS[summary.shock].blurb.toLowerCase()}` : null;

  const Stat = ({ label, deltaR, deltaU }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderTop: `1px dotted ${colors.divider}`, fontSize: 13 }}>
      <span style={{ color: colors.inkSoft, fontFamily: "Georgia, 'Times New Roman', serif" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center" }}>
        <span style={{ color: colors.ruralDeep, fontWeight: 600, fontSize: 12 }}>🌾</span>
        <Delta value={deltaR} />
        <span style={{ color: colors.urbanDeep, fontWeight: 600, fontSize: 12, marginLeft: 10 }}>🏙</span>
        <Delta value={deltaU} />
      </span>
    </div>
  );

  return (
    <div style={{
      background: "rgba(251, 247, 230, 0.9)",
      border: `2px solid ${colors.cardEdge}`,
      borderRadius: 10,
      padding: 14,
      marginBottom: 14,
      boxShadow: "2px 3px 0 rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.16em", color: colors.facilitatorDeep, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, fontFamily: "Georgia, 'Times New Roman', serif" }}>
        What just happened · turn {summary.turn}
      </div>

      <div style={{ fontSize: 15, marginBottom: 8, fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.45 }}>
        <strong style={{ color: colors.facilitatorDeep }}>You:</strong> {moveLabel}.
      </div>

      {outcomeLine && (
        <div style={{
          fontSize: 14,
          marginBottom: 8,
          padding: "8px 10px",
          background: outcomeLine.tone === "good" ? "rgba(77,122,42,0.10)" : "rgba(162,58,26,0.10)",
          borderLeft: `3px solid ${outcomeLine.tone === "good" ? colors.good : colors.bad}`,
          borderRadius: 4,
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.4,
        }}>
          {outcomeLine.text}
        </div>
      )}

      {shockText && (
        <div style={{
          fontSize: 14,
          marginBottom: 8,
          padding: "8px 10px",
          background: "rgba(201,138,58,0.12)",
          borderLeft: `3px solid ${colors.warn}`,
          borderRadius: 4,
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.4,
        }}>
          {shockText}
        </div>
      )}

      <div style={{ marginTop: 10, paddingTop: 4 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: colors.inkSoft, textTransform: "uppercase", fontWeight: 700, marginBottom: 2, fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Net change this turn
        </div>
        <Stat label="Trust" deltaR={dr.trust} deltaU={du.trust} />
        <Stat label="Voice (feels heard)" deltaR={dr.voice} deltaU={du.voice} />
        <Stat label="Cohesion" deltaR={dr.cohesion} deltaU={du.cohesion} />
        <Stat label="Food" deltaR={dr.food} deltaU={du.food} />
      </div>
    </div>
  );
}


function ScenarioPicker({ onStart }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.eyebrow}>A facilitator's game · iterated coordination · {VERSION}</div>
        <h1 style={S.h1}>The Facilitator</h1>
        <div style={S.sub}>two communities, one mediator, twenty turns of weather</div>
      </header>

      <Bridge />

      <div style={S.intro}>
        <p style={S.introP}>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, color: colors.facilitatorDeep, lineHeight: 1, display: "block", marginBottom: 6 }}>You arrive as a stranger.</span>
          You don't run either community. You sit between them. They've been warily neighboring each other for as long as anyone remembers, and you're here to see if that can change.
        </p>
        <p style={S.introP}>
          Each turn you act, a shock lands, and each side decides whether to cooperate or defect on whatever's on the table. They decide using the payoff matrix, but also trust, recent betrayal, and whether they feel heard. <span style={S.thinker}>Schelling · Ostrom · Axelrod</span>
        </p>
        <p style={S.introP}>
          Your tools: translation, trade, multi-turn agreements, shared institutions, mediation. Institutions are slow, expensive, and they change the matrix itself.
        </p>
      </div>

      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4, marginTop: 18, color: colors.ink }}>
        Choose a starting situation
      </div>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, color: colors.facilitatorDeep, marginBottom: 12 }}>
        each one tilts the game differently
      </div>

      {Object.entries(SCENARIOS).map(([key, sc]) => (
        <button
          key={key}
          onClick={() => onStart(key)}
          onMouseEnter={() => setHovered(key)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "14px 16px",
            marginBottom: 10,
            background: hovered === key ? "#f0d9ae" : colors.card,
            border: `2px solid ${hovered === key ? colors.facilitator : colors.cardEdge}`,
            borderRadius: 10,
            color: colors.ink,
            fontFamily: "Georgia, 'Times New Roman', serif",
            transition: "all 0.2s ease",
            boxShadow: hovered === key ? `0 0 0 2px ${colors.facilitatorBg}, 2px 3px 0 rgba(125,63,31,0.15)` : "2px 3px 0 rgba(0,0,0,0.06)",
            transform: hovered === key ? "translateY(-1px)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 26 }}>{sc.glyph}</span>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {sc.name}
            </span>
          </div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, color: colors.facilitatorDeep, marginBottom: 6, lineHeight: 1.3 }}>
            {sc.tagline}
          </div>
          <div style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.5 }}>
            {sc.detail}
          </div>
          <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(94, 133, 51, 0.08)", borderRadius: 6, fontSize: 11, color: colors.inkSoft }}>
            <span style={{ color: colors.ruralDeep, fontWeight: 700 }}>🌾 trust {sc.rural.trust}</span>
            <span style={{ margin: "0 8px", color: colors.divider }}>·</span>
            <span style={{ color: colors.urbanDeep, fontWeight: 700 }}>🏙 trust {sc.urban.trust}</span>
            <span style={{ margin: "0 8px", color: colors.divider }}>·</span>
            <span>capital rural {sc.rural.capital} / urban {sc.urban.capital}</span>
          </div>
        </button>
      ))}

      <p style={{ ...S.introP, padding: "10px 12px", background: "rgba(181,108,58,0.08)", borderRadius: 6, borderLeft: `3px solid ${colors.facilitator}`, marginTop: 14, fontSize: 13 }}>
        <strong style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: colors.facilitatorDeep }}>To win:</strong> 20 turns, both sides standing, trust climbing, four institutions or more.
        <br/><strong style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: colors.facilitatorDeep }}>To lose:</strong> either side collapses, or trust hits zero on both.
      </p>
    </div>
  );
}

function EndScreen({ result, state, onReset }) {
  const r = state.rural;
  const u = state.urban;
  const trustAvg = ((r.trust + u.trust) / 2).toFixed(0);
  const institutionsBuilt = state.institutions.length;

  let color = colors.warn;
  let glyph = "⌛";
  if (result.type === "win") { color = colors.good; glyph = "✦"; }
  if (result.type === "loss") { color = colors.bad; glyph = "✕"; }

  return (
    <div style={S.page}>
      <div style={S.endScreen}>
        <div style={{ fontSize: 48, marginBottom: 10, color }} className="stamp-in">{glyph}</div>
        <div style={{ ...S.eyebrow, color }}>{result.type === "win" ? "the work held" : result.type === "loss" ? "collapse" : "time ran out"}</div>
        <h1 style={{ ...S.endTitle, color }}>
          {result.type === "win" ? "The region holds." : result.type === "loss" ? "The relationship broke." : "Unfinished work."}
        </h1>
        <p style={S.endText}>{result.text}</p>

        <div style={{ background: colors.card, border: `2px solid ${colors.cardEdge}`, padding: 16, borderRadius: 10, textAlign: "left", marginBottom: 16, boxShadow: "2px 3px 0 rgba(0,0,0,0.06)" }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 10 }}>Final state</div>
          <div style={{ fontSize: 13, lineHeight: 1.9, fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <div>Turn reached: <strong className="num">{state.turn}</strong></div>
            <div>Trust average: <strong className="num">{trustAvg}/100</strong></div>
            <div>Institutions built: <strong className="num">{institutionsBuilt}</strong></div>
            <div>Shocks weathered: <strong className="num">{state.shockHistory.length}</strong></div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${colors.divider}` }}>
              <span style={{ color: colors.ruralDeep }}>🌾 {r.name}</span> cohesion <strong className="num">{r.cohesion.toFixed(0)}</strong> · food <strong className="num">{r.food.toFixed(0)}</strong>
            </div>
            <div>
              <span style={{ color: colors.urbanDeep }}>🏙 {u.name}</span> cohesion <strong className="num">{u.cohesion.toFixed(0)}</strong> · food <strong className="num">{u.food.toFixed(0)}</strong>
            </div>
          </div>
        </div>

        <div style={{ background: colors.facilitatorBg, border: `2px solid ${colors.facilitator}`, padding: 16, borderRadius: 10, textAlign: "left", marginBottom: 20, boxShadow: "2px 3px 0 rgba(125,63,31,0.18)" }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, fontWeight: 700, color: colors.facilitatorDeep, marginBottom: 10, letterSpacing: "-0.01em" }}>Reflection</div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.45, color: colors.facilitatorDeep }}>
            Which moves built durable trust versus produced one-turn gains? Did you build institutions early enough to absorb the shocks that came? When one side was speaking, did you hear what they were actually asking for?
          </div>
        </div>

        <button onClick={onReset} style={S.resetBtn}>Play again ›</button>

        <div style={{ marginTop: 20 }}>
          <CopyLogButton state={state} />
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============

function App() {
  const [state, setState] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [pickingInstitution, setPickingInstitution] = useState(false);

  if (!state) return <ScenarioPicker onStart={(key) => setState(initialState(key))} />;
  if (state.gameOver) return <EndScreen result={state.gameOver} state={state} onReset={() => { setState(null); setSelectedMove(null); }} />;

  const ruralLines = ruralVoice(state);
  const urbanLines = urbanVoice(state);

  // Build a tentative deal preview for the matrix
  const previewDealMoveType = (selectedMove === "propose_trade" || selectedMove === "broker_agreement" || selectedMove === "build_institution") ? selectedMove : null;
  const previewDeal = previewDealMoveType ? generateProposedDeal(state, previewDealMoveType) : { stakes: 4 };
  const payoff = computePayoffMatrix(state, previewDeal);

  // Predict choices (for highlighting matrix)
  let predictedR = null, predictedU = null;
  if (selectedMove === "propose_trade" || selectedMove === "broker_agreement" || (selectedMove && selectedMove.startsWith("build:"))) {
    predictedR = ruralDecision(state, payoff);
    predictedU = urbanDecision(state, payoff);
  }

  const canAfford = (move) => {
    const cost = MOVES[move]?.cost?.facilitatorEnergy || 0;
    if (state.facilitatorEnergy < cost) return false;
    const req = MOVES[move]?.requires;
    if (req) {
      if (req.trust && Math.min(state.rural.trust, state.urban.trust) < req.trust) return false;
      if (req.grievanceLive && !state.grievanceLive) return false;
    }
    return true;
  };

  const handleMoveSelect = (moveKey) => {
    setSelectedMove(moveKey);
    setPickingInstitution(moveKey === "build_institution");
  };

  const handleInstitutionPick = (instKey) => {
    const inst = INSTITUTIONS[instKey];
    // Check requires
    if (inst.requires) {
      if (inst.requires.trust && Math.min(state.rural.trust, state.urban.trust) < inst.requires.trust) return;
      if (inst.requires.institutions && state.institutions.length < inst.requires.institutions) return;
    }
    if (state.institutions.includes(instKey)) return;
    setSelectedMove(`build:${instKey}`);
    setPickingInstitution(false);
  };

  const handleResolve = () => {
    let next = { ...state };

    // Apply the move
    if (selectedMove === "propose_trade" || selectedMove === "broker_agreement") {
      const deal = generateProposedDeal(state, selectedMove);
      next.pendingDeal = deal;
      next.facilitatorEnergy -= MOVES[selectedMove].cost.facilitatorEnergy;
    } else if (selectedMove && selectedMove.startsWith("build:")) {
      const instKey = selectedMove.slice(6);
      next.pendingInstitution = instKey;
      next.facilitatorEnergy -= MOVES.build_institution.cost.facilitatorEnergy;
    } else if (selectedMove === "translate" || selectedMove === "share_information" || selectedMove === "mediate") {
      next.facilitatorEnergy -= MOVES[selectedMove].cost.facilitatorEnergy;
    }

    const resolved = resolveTurn(next, selectedMove);
    setState(resolved);
    setSelectedMove(null);
    setPickingInstitution(false);
  };

  const recentLog = state.log.slice(-6).reverse();

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={S.eyebrow}>
            {SCENARIOS[state.scenarioKey].glyph} {SCENARIOS[state.scenarioKey].name} · turn {state.turn} of 20 · {VERSION}
          </div>
          <CompassMark />
        </div>
        <h1 style={S.h1}>Between {state.rural.name} &amp; {state.urban.name}</h1>
        <div style={S.sub}>read them, translate, broker, build what changes the matrix</div>
        <div style={S.turnRow}>
          <span>
            trust <span style={{ color: colors.ruralDeep, fontWeight: 700 }}>🌾 <span className="num">{state.rural.trust.toFixed(0)}</span></span>
            <span style={{ margin: "0 6px", color: colors.divider }}>·</span>
            <span style={{ color: colors.urbanDeep, fontWeight: 700 }}>🏙 <span className="num">{state.urban.trust.toFixed(0)}</span></span>
          </span>
          <span style={S.energyBlock}>
            <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.facilitatorDeep, fontWeight: 700, marginRight: 4 }}>energy</span>
            {[...Array(8)].map((_, i) => (
              <span key={i} style={i < state.facilitatorEnergy ? S.energyDot : S.energyEmpty} />
            ))}
          </span>
        </div>
      </header>

      {state.lastTurnSummary && (
        <LastTurnCard summary={state.lastTurnSummary} />
      )}

      {/* Two councils */}
      <div style={S.councilsRow}>
        <CouncilCard council={state.rural} voice={ruralLines} isRural={true} />
        <CouncilCard council={state.urban} voice={urbanLines} isRural={false} />
      </div>

      {/* Institutions standing */}
      <div style={S.institutionsRow}>
        <div style={S.institutionsHeader}>
          <span>Shared institutions</span>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, color: colors.facilitatorDeep }}>
            {state.institutions.length === 0 ? "none yet" : `${state.institutions.length} built`}
          </span>
        </div>
        {state.institutions.length === 0 ? (
          <span style={S.institutionChipEmpty}>nothing shared yet — each shock will be faced alone</span>
        ) : (
          state.institutions.map(k => (
            <span key={k} style={S.institutionChip} className="stamp-in">
              <span style={{ color: colors.facilitator }}>✦</span> {INSTITUTIONS[k].name}
            </span>
          ))
        )}
        {state.activeAgreements.length > 0 && (
          <div style={{ marginTop: 8, color: colors.inkSoft, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15 }}>
            active agreements: {state.activeAgreements.map(a => `${a.turnsLeft} turns left`).join(" · ")}
          </div>
        )}
      </div>

      {/* Payoff matrix */}
      <PayoffMatrix payoff={payoff} predictedR={predictedR} predictedU={predictedU} />

      {/* Facilitator moves */}
      <div style={S.facilitatorPanel}>
        <div style={S.facilitatorTitle}>
          <CompassMark />
          <span>Your move this turn</span>
        </div>
        <div style={S.facilitatorIntro}>
          translation and information are cheap and shift voice without forcing a decision · trades and agreements put a real proposal on the table · building an institution is slow but permanent
        </div>

        {Object.entries(MOVES).map(([key, move]) => {
          if (key === "mediate" && !state.grievanceLive) return null;
          const affordable = canAfford(key);
          const active = selectedMove === key || (key === "build_institution" && selectedMove && selectedMove.startsWith("build:"));
          return (
            <button
              key={key}
              onClick={() => affordable && handleMoveSelect(key)}
              disabled={!affordable}
              style={{ ...S.moveBtn, ...(active ? S.moveBtnActive : {}) }}
            >
              <div style={S.moveBtnTitle}>
                <span>{move.name}</span>
                <span style={S.moveBtnCost}>{move.cost.facilitatorEnergy}⚡</span>
              </div>
              <div style={S.moveBtnBlurb}>{move.blurb}</div>
              {!affordable && move.requires?.trust && (
                <div style={{ fontSize: 10, color: colors.bad, marginTop: 4 }}>
                  Requires trust ≥ {move.requires.trust} on both sides
                </div>
              )}
            </button>
          );
        })}

        {pickingInstitution && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(252, 232, 200, 0.45)", border: `2px dashed ${colors.facilitator}`, borderRadius: 8 }}>
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, fontWeight: 700, color: colors.facilitatorDeep, marginBottom: 8, letterSpacing: "-0.01em" }}>
              ✦ Which institution to propose?
            </div>
            {Object.entries(INSTITUTIONS).map(([key, inst]) => {
              const built = state.institutions.includes(key);
              const trustOk = !inst.requires?.trust || Math.min(state.rural.trust, state.urban.trust) >= inst.requires.trust;
              const instOk = !inst.requires?.institutions || state.institutions.length >= inst.requires.institutions;
              const ok = trustOk && instOk && !built;
              const isSelected = selectedMove === `build:${key}`;
              return (
                <div
                  key={key}
                  onClick={() => ok && handleInstitutionPick(key)}
                  style={{
                    ...S.institutionPick,
                    cursor: ok ? "pointer" : "not-allowed",
                    opacity: ok ? 1 : 0.55,
                    borderColor: isSelected ? colors.facilitator : colors.cardEdge,
                    background: isSelected ? "#f0d9ae" : built ? "#d8d8b0" : colors.card,
                    boxShadow: isSelected ? `0 0 0 2px ${colors.facilitatorBg}, 1px 2px 0 rgba(125,63,31,0.15)` : "1px 2px 0 rgba(0,0,0,0.04)",
                    transform: isSelected ? "translateY(-1px)" : "none",
                  }}
                >
                  <div style={S.institutionPickName}>
                    {built && <span style={{ color: colors.good }}>✓</span>}
                    <span>{inst.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: colors.facilitatorDeep, fontWeight: 600, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", background: "rgba(181,108,58,0.12)", padding: "2px 6px", borderRadius: 10 }}>tier {inst.tier}</span>
                  </div>
                  <div style={S.institutionPickBlurb}>{inst.blurb}</div>
                  <div style={S.institutionPickReq}>
                    {built ? "✓ already built" : `requires trust ≥ ${inst.requires?.trust || 0}${inst.requires?.institutions ? `, ${inst.requires.institutions}+ institutions built` : ""}`}
                  </div>
                  <div style={{ fontSize: 11, color: colors.facilitatorDeep, fontStyle: "italic", marginTop: 4, fontFamily: "Georgia, 'Times New Roman', serif" }}>{inst.lineage}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Deal preview */}
        {previewDealMoveType && previewDeal.summary && (
          <div style={S.dealCard} className="fadein">
            <div style={S.dealTitle}>✦ Proposed exchange</div>
            <div style={S.dealLine}>{previewDeal.summary}</div>
            {predictedR && predictedU && (
              <div style={{ fontSize: 12, marginTop: 10, color: colors.inkSoft, lineHeight: 1.5, padding: "8px 10px", background: "rgba(255,255,255,0.5)", borderRadius: 6 }}>
                <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.facilitatorDeep, display: "block", marginBottom: 4 }}>likely outcome</span>
                <strong style={{ color: predictedR === "C" ? colors.good : colors.bad }}>🌾 {state.rural.name} {predictedR === "C" ? "cooperates" : "defects"}</strong>
                {" · "}
                <strong style={{ color: predictedU === "C" ? colors.good : colors.bad }}>🏙 {state.urban.name} {predictedU === "C" ? "cooperates" : "defects"}</strong>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleResolve}
          disabled={!selectedMove || (selectedMove === "build_institution")}
          style={{
            ...S.resolveBtn,
            ...((!selectedMove || selectedMove === "build_institution") ? S.resolveBtnDisabled : {}),
          }}
        >
          {selectedMove === "build_institution" ? "Pick one above" : selectedMove ? "Commit to this move ›" : "Select a move first"}
        </button>
      </div>

      {/* Log */}
      <div style={S.logSection}>
        <div style={S.logTitle}>Recent turns</div>
        {recentLog.map((entry, i) => (
          <div key={i} style={{
            ...S.logItem,
            color: entry.tone === "good" ? colors.good : entry.tone === "bad" ? colors.bad : colors.ink,
          }}>
            <span style={S.logTurn}>t{entry.turn}</span>
            {entry.text}
          </div>
        ))}
      </div>

      <CopyLogButton state={state} />
    </div>
  );
}

export default App;
