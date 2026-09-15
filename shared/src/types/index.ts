/**
 * Chimera Combat — Core Domain Types
 * The Flight Simulator for Difficult Conversations
 */

export interface OpponentState {
  trust: number;        // 0 - 100: Degree of belief in user credibility
  frustration: number;  // 0 - 100: Emotional tilt and impatience
  cooperation: number;  // 0 - 100: Willingness to find mutual ground
  pressure: number;     // 0 - 100: Urgency and conversational duress
  resistance: number;   // 0 - 100: Reluctance to concede core objective
  respect: number;      // 0 - 100: Professional esteem for user boundary
}

export type CombatPhase = 'OPENING' | 'PRESSURE' | 'CRITICAL_MOMENT' | 'CONCLUDED';

export type ThreatLevel = 'normal' | 'hard' | 'nightmare';

export type EvaluationDimension =
  | 'clarity'
  | 'assertiveness'
  | 'empathy'
  | 'composure'
  | 'strategy'
  | 'boundarySetting'
  | 'goalProgress'
  | 'escalationControl';

export interface OpponentPersona {
  id: string;
  name: string;
  archetype: string;
  description: string;
  traits: string[];
  triggers: string[];
  weaknesses: string[];
  escalationPolicy: {
    lowThreshold: number;     // frustration/pressure threshold
    highThreshold: number;
    preferredTactics: string[];
    ultimatumStyle: string;
  };
  baseState: OpponentState;
}

export interface Scenario {
  id: string;
  title: string;
  category: 'career' | 'management' | 'social';
  opponentPersonaId: string;
  contextBriefing: string;
  userObjective: string;
  opponentObjective: string;
  threatLevel: ThreatLevel;
  initialOpening: string;
  criticalMomentTriggerTurn: number;
  criticalMomentPrompt: string;
  dimensionWeights: Record<EvaluationDimension, number>; // Weights sum to 1.0
  relevantDimensions: EvaluationDimension[];
}

export interface TranscriptTurn {
  turnIndex: number;
  speaker: 'user' | 'opponent';
  content: string;
  stateSnapshot: OpponentState;
  stateDelta?: Partial<OpponentState>;
  phase: CombatPhase;
  isCriticalMoment?: boolean;
  timestamp: number;
}

export interface CombatSession {
  sessionId: string;
  userId: string;
  scenarioId: string;
  threatLevel: ThreatLevel;
  currentPhase: CombatPhase;
  turnCount: number;
  state: OpponentState;
  turns: TranscriptTurn[];
  isCriticalMomentReached: boolean;
  status: 'active' | 'concluded' | 'evaluating' | 'evaluated';
  createdAt: number;
  endedAt?: number;
}

export interface Tier1ExtractedFeatures {
  objectiveAchieved: boolean;
  evidenceCitationsCount: number;
  hedgingInstancesCount: number;
  defensiveLanguageCount: number;
  boundaryMaintained: boolean;
  composureMaintained: boolean;
  criticalMomentHandledEffectively: boolean;
  strengthsObserved: [string, string];
  weaknessObserved: string;
  criticalMistake: {
    turnNumber: number;
    userQuote: string;
    whyItFailed: string;
  };
  betterMove: {
    tacticalPrinciple: string;
    suggestedResponse: string;
  };
  rawDimensionObservations: Partial<Record<EvaluationDimension, {
    score1To5: number;
    observedEvidence: string;
  }>>;
}

export interface CombatEvaluation {
  sessionId: string;
  combatScore: number; // 0 - 100 (Deterministic)
  dimensions: Record<EvaluationDimension, number>; // 0 - 100
  strengths: [string, string];
  weakness: string;
  criticalMistake: {
    turnNumber: number;
    userQuote: string;
    whyItFailed: string;
  };
  betterMove: {
    tacticalPrinciple: string;
    suggestedResponse: string;
  };
  tier1Features: Tier1ExtractedFeatures;
  createdAt: number;
}

export interface RematchComparison {
  originalSessionId: string;
  rematchSessionId: string;
  previousScore: number;
  newScore: number;
  scoreDelta: number; // e.g. +12
  isImproved: boolean;
}
