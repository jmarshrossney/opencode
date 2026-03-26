const E_BASE_WH = 0.0024

const WEIGHTS = {
  output: 1.0,
  reasoning: 1.0,
  input: 0.2,
  cache_read: 0.05,
  cache_write: 0.3,
}

const PUE: Record<string, number> = {
  anthropic: 1.1,
  openai: 1.12,
  openrouter: 1.12,
  google: 1.1,
  azure: 1.18,
  aws: 1.12,
  default: 1.67,
}

const CI_G_CO2_PER_WH: Record<string, number> = {
  "us-east-1": 0.286,
  "us-west-1": 0.322,
  "us-west-2": 0.237,
  "eu-west-1": 0.295,
  "eu-west-2": 0.233,
  "eu-central-1": 0.365,
  "eu-north-1": 0.228,
  "ap-northeast-1": 0.457,
  "ap-northeast-3": 0.457,
  "ap-southeast-1": 0.408,
  "ap-southeast-2": 0.7,
  default: 0.475,
}

const CO2E_PER_MILE_KG = 0.35

// Fixed energy cost per tool call (0.1 mWh = 0.0001 Wh)
// Placeholder value - Stage 2 will use actual tool execution time
const E_TOOL_WH = 0.0001

export interface EnergyInput {
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  providerID: string
  modelID: string
  region?: string
  timestamp: number
  toolCalls: number
}

export interface EnergyResult {
  energyWh: number
  carbonGCO2e: number
}

function getRegion(providerID: string, explicitRegion?: string): string {
  if (explicitRegion) return explicitRegion.split("-")[0] + "-" + explicitRegion.split("-")[1]
  if (providerID.includes("us")) return "us-east-1"
  if (providerID.includes("eu")) return "eu-west-1"
  if (providerID.includes("ap")) return "ap-northeast-1"
  return "default"
}

export function estimateEnergy(input: EnergyInput): EnergyResult {
  const weightedTokens =
    input.tokens.output * WEIGHTS.output +
    input.tokens.reasoning * WEIGHTS.reasoning +
    input.tokens.input * WEIGHTS.input +
    input.tokens.cache.read * WEIGHTS.cache_read +
    input.tokens.cache.write * WEIGHTS.cache_write

  const providerKey = Object.keys(PUE).find((k) => input.providerID.includes(k)) ?? "default"
  const pue = PUE[providerKey]

  const regionKey = getRegion(input.providerID, input.region)
  const ci = CI_G_CO2_PER_WH[regionKey] ?? CI_G_CO2_PER_WH.default

  const toolEnergy = input.toolCalls * E_TOOL_WH

  const energyWh = (weightedTokens * E_BASE_WH + toolEnergy) * pue
  const carbonGCO2e = energyWh * ci * 1000

  return { energyWh, carbonGCO2e }
}

// Convert carbon footprint to miles driven equivalence
// Based on EPA average passenger vehicle emissions: ~0.35 kg CO2e per mile
// Source: EPA "Emission Factors for Greenhouse Gas Inventories" (2024)
// This shows how many miles would need to be driven in an average car
// to produce the same amount of CO2e
export function carbonToMiles(carbonGCO2e: number): number {
  return carbonGCO2e / 1_000_000 / CO2E_PER_MILE_KG
}
