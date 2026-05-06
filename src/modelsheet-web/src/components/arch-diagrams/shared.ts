/**
 * Shared types for architecture diagram components.
 */

export interface DiagramParams {
  numLayers?:          number
  numHeads?:           number
  numKvHeads?:         number
  hiddenSize?:         number
  contextLength?:      number
  vocabSize?:          number
  intermediateSize?:   number
  numExperts?:         number
  numSharedExperts?:   number
  numExpertsPerToken?: number
  fit?:                boolean
}
