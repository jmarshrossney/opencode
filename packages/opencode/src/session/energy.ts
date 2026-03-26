export function estimateEnergy(input: {
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  providerID: string
  modelID: string
  timestamp: number
  toolCalls: number
}): number {
  const total =
    input.tokens.input +
    input.tokens.output +
    input.tokens.reasoning +
    input.tokens.cache.read +
    input.tokens.cache.write
  return total
}
