import { z } from 'zod';

export const OpponentStateSchema = z.object({
  trust: z.number().min(0).max(100),
  frustration: z.number().min(0).max(100),
  cooperation: z.number().min(0).max(100),
  pressure: z.number().min(0).max(100),
  resistance: z.number().min(0).max(100),
  respect: z.number().min(0).max(100),
});

export const CombatPhaseSchema = z.enum(['OPENING', 'PRESSURE', 'CRITICAL_MOMENT', 'CONCLUDED']);

export const ThreatLevelSchema = z.enum(['normal', 'hard', 'nightmare']);

export const StartCombatRequestSchema = z.object({
  scenarioId: z.string().min(1),
  threatLevel: ThreatLevelSchema.default('normal'),
  userId: z.string().optional(),
});

export const UserTurnRequestSchema = z.object({
  sessionId: z.string().uuid(),
  userMessage: z.string().min(1).max(2000),
});

export const EvaluateCombatRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export const RematchRequestSchema = z.object({
  originalSessionId: z.string().uuid(),
});

// Strict Tier 1 Extraction Schema for LLM Evaluator
export const Tier1ExtractedFeaturesSchema = z.object({
  objectiveAchieved: z.boolean(),
  evidenceCitationsCount: z.number().int().min(0).max(50),
  hedgingInstancesCount: z.number().int().min(0).max(50),
  defensiveLanguageCount: z.number().int().min(0).max(50),
  boundaryMaintained: z.boolean(),
  composureMaintained: z.boolean(),
  criticalMomentHandledEffectively: z.boolean(),
  strengthsObserved: z.tuple([z.string().min(5), z.string().min(5)]),
  weaknessObserved: z.string().min(5),
  criticalMistake: z.object({
    turnNumber: z.number().int().min(1),
    userQuote: z.string().min(3),
    whyItFailed: z.string().min(5),
  }),
  betterMove: z.object({
    tacticalPrinciple: z.string().min(3),
    suggestedResponse: z.string().min(10),
  }),
  rawDimensionObservations: z.record(
    z.enum([
      'clarity',
      'assertiveness',
      'empathy',
      'composure',
      'strategy',
      'boundarySetting',
      'goalProgress',
      'escalationControl',
    ]),
    z.object({
      score1To5: z.number().min(1).max(5),
      observedEvidence: z.string(),
    })
  ).optional(),
});

// Opponent State Mutation / Rhetorical Move Schema
export const RhetoricalAnalysisSchema = z.object({
  tacticsIdentified: z.array(z.string()),
  containsEvidence: z.boolean(),
  containsHedging: z.boolean(),
  containsAggression: z.boolean(),
  containsApology: z.boolean(),
  containsFirmBoundary: z.boolean(),
  detectedContradiction: z.string().nullable().optional(),
  stateDelta: z.object({
    trust: z.number().min(-50).max(50).default(0),
    frustration: z.number().min(-50).max(50).default(0),
    cooperation: z.number().min(-50).max(50).default(0),
    pressure: z.number().min(-50).max(50).default(0),
    resistance: z.number().min(-50).max(50).default(0),
    respect: z.number().min(-50).max(50).default(0),
  }),
  internalTacticalThought: z.string(),
  isCriticalMomentTriggered: z.boolean().default(false),
});
