import { randomUUID } from 'crypto';
import {
  CombatEvaluation,
  CombatPhase,
  CombatSession,
  DeterministicScoringEngine,
  MASTER_BATTLES,
  OPPONENT_PERSONAS,
  OpponentState,
  RematchComparison,
  Scenario,
  ThreatLevel,
  TranscriptTurn,
} from '@chimera/shared';
import { AIProviderGateway } from '../ai/provider-adapter';

export class CombatEngine {
  private sessions: Map<string, CombatSession> = new Map();
  private evaluations: Map<string, CombatEvaluation> = new Map();
  private rematchPairs: Map<string, RematchComparison> = new Map();
  private aiGateway: AIProviderGateway;

  constructor(aiGateway?: AIProviderGateway) {
    this.aiGateway = aiGateway || new AIProviderGateway();
  }

  /**
   * Initializes a brand-new combat training battle session
   */
  public startSession(
    scenarioId: string,
    threatLevel: ThreatLevel = 'normal',
    userId: string = 'user-anonymous'
  ): CombatSession {
    const scenario = MASTER_BATTLES[scenarioId];
    if (!scenario) {
      throw new Error(`Scenario '${scenarioId}' not found`);
    }

    const persona = OPPONENT_PERSONAS[scenario.opponentPersonaId];
    if (!persona) {
      throw new Error(`Opponent Persona '${scenario.opponentPersonaId}' not found`);
    }

    const sessionId = randomUUID();
    const initialState: OpponentState = { ...persona.baseState };

    // Apply threat level modifiers
    if (threatLevel === 'hard') {
      initialState.resistance = Math.min(100, initialState.resistance + 15);
      initialState.pressure = Math.min(100, initialState.pressure + 15);
    } else if (threatLevel === 'nightmare') {
      initialState.resistance = 95;
      initialState.pressure = 90;
      initialState.frustration = 60;
      initialState.trust = 15;
    }

    const openingTurn: TranscriptTurn = {
      turnIndex: 1,
      speaker: 'opponent',
      content: scenario.initialOpening,
      stateSnapshot: { ...initialState },
      phase: 'OPENING',
      timestamp: Date.now(),
    };

    const session: CombatSession = {
      sessionId,
      userId,
      scenarioId,
      threatLevel,
      currentPhase: 'OPENING',
      turnCount: 1,
      state: initialState,
      turns: [openingTurn],
      isCriticalMomentReached: false,
      status: 'active',
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Processes a single conversational user response turn,
   * mutates the opponent internal state vector, and returns the next opponent action.
   */
  public async processTurn(
    sessionId: string,
    userMessage: string
  ): Promise<{ session: CombatSession; latestTurn: TranscriptTurn }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is already ${session.status}`);
    }

    const scenario = MASTER_BATTLES[session.scenarioId];
    const persona = OPPONENT_PERSONAS[scenario.opponentPersonaId];

    session.turnCount += 1;

    // Record user turn
    const userTurn: TranscriptTurn = {
      turnIndex: session.turnCount,
      speaker: 'user',
      content: userMessage,
      stateSnapshot: { ...session.state },
      phase: session.currentPhase,
      timestamp: Date.now(),
    };
    session.turns.push(userTurn);

    // Determine phase progression
    const isCriticalTurn =
      !session.isCriticalMomentReached &&
      session.turnCount >= scenario.criticalMomentTriggerTurn * 2;

    if (isCriticalTurn) {
      session.currentPhase = 'CRITICAL_MOMENT';
      session.isCriticalMomentReached = true;
    } else if (session.turnCount >= 3 && session.currentPhase === 'OPENING') {
      session.currentPhase = 'PRESSURE';
    }

    // Call AI provider to generate in-character adaptive response
    const opponentResult = await this.aiGateway.generateOpponentTurn(
      persona,
      scenario,
      session.state,
      session.turns,
      userMessage,
      isCriticalTurn
    );

    // Mutate state vector with strict bounds [0, 100]
    session.state.trust = Math.max(0, Math.min(100, session.state.trust + opponentResult.stateDelta.trust));
    session.state.frustration = Math.max(0, Math.min(100, session.state.frustration + opponentResult.stateDelta.frustration));
    session.state.cooperation = Math.max(0, Math.min(100, session.state.cooperation + opponentResult.stateDelta.cooperation));
    session.state.pressure = Math.max(0, Math.min(100, session.state.pressure + opponentResult.stateDelta.pressure));
    session.state.resistance = Math.max(0, Math.min(100, session.state.resistance + opponentResult.stateDelta.resistance));
    session.state.respect = Math.max(0, Math.min(100, session.state.respect + opponentResult.stateDelta.respect));

    session.turnCount += 1;

    const opponentTurn: TranscriptTurn = {
      turnIndex: session.turnCount,
      speaker: 'opponent',
      content: opponentResult.replyText,
      stateSnapshot: { ...session.state },
      stateDelta: opponentResult.stateDelta,
      phase: session.currentPhase,
      isCriticalMoment: isCriticalTurn,
      timestamp: Date.now(),
    };
    session.turns.push(opponentTurn);

    // Conclude after 6-8 exchanges once critical moment was reached
    if (session.isCriticalMomentReached && session.turnCount >= (scenario.criticalMomentTriggerTurn * 2 + 2)) {
      session.status = 'concluded';
      session.currentPhase = 'CONCLUDED';
      session.endedAt = Date.now();
    }

    return { session, latestTurn: opponentTurn };
  }

  /**
   * Two-Tier Evaluation Pipeline:
   * Tier 1: LLM extracts verifiable features & quoted evidence.
   * Tier 2: Deterministic engine calculates exact 0-100 composite & dimension scores.
   */
  public async evaluateSession(sessionId: string): Promise<CombatEvaluation> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    // Check if already evaluated
    const existing = this.evaluations.get(sessionId);
    if (existing) return existing;

    session.status = 'evaluating';
    const scenario = MASTER_BATTLES[session.scenarioId];

    // Tier 1: Extract features
    const tier1 = await this.aiGateway.extractTier1Features(scenario, session.turns);

    // LLM Quote Integrity Audit: ensure quote is verbatim from user transcript, reject/replace hallucinations
    if (tier1.criticalMistake?.userQuote) {
      const sanitized = verifyAndSanitizeTranscriptQuote(
        tier1.criticalMistake.userQuote,
        tier1.criticalMistake.turnNumber,
        session.turns
      );
      tier1.criticalMistake.userQuote = sanitized.verifiedQuote;
      tier1.criticalMistake.turnNumber = sanitized.verifiedTurnNumber;
    }

    // Tier 2: Deterministic calculation
    const evaluation = DeterministicScoringEngine.computeEvaluation(sessionId, scenario, tier1);

    session.status = 'evaluated';
    this.evaluations.set(sessionId, evaluation);
    return evaluation;
  }

  /**
   * Rematch: Launches immediate retry against the same opponent & scenario,
   * tracking previous score and calculating score delta.
   */
  public async startRematch(
    originalSessionId: string
  ): Promise<{ newSession: CombatSession; comparison: RematchComparison }> {
    const originalSession = this.sessions.get(originalSessionId);
    if (!originalSession) {
      throw new Error(`Original session '${originalSessionId}' not found`);
    }

    let originalEval = this.evaluations.get(originalSessionId);
    if (!originalEval) {
      originalEval = await this.evaluateSession(originalSessionId);
    }

    // Create fresh rematch session
    const newSession = this.startSession(
      originalSession.scenarioId,
      originalSession.threatLevel,
      originalSession.userId
    );

    const comparison: RematchComparison = {
      originalSessionId,
      rematchSessionId: newSession.sessionId,
      previousScore: originalEval.combatScore,
      newScore: 0, // Computed when rematch concludes
      scoreDelta: 0,
      isImproved: false,
    };

    this.rematchPairs.set(newSession.sessionId, comparison);
    return { newSession, comparison };
  }

  public getSession(sessionId: string): CombatSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getEvaluation(sessionId: string): CombatEvaluation | undefined {
    return this.evaluations.get(sessionId);
  }

  public getRematchComparison(rematchSessionId: string): RematchComparison | undefined {
    return this.rematchPairs.get(rematchSessionId);
  }

  public getAIDiagnostics() {
    return this.aiGateway.getDiagnostics();
  }
}

/**
 * Validates that an LLM-generated quote exists verbatim in the actual user transcript turns.
 * If fabricated or hallucinated, rejects and replaces it with verbatim user statement from the transcript.
 */
export function verifyAndSanitizeTranscriptQuote(
  claimedQuote: string,
  turnNumber: number,
  transcript: TranscriptTurn[]
): { verifiedQuote: string; verifiedTurnNumber: number; wasReplaced: boolean } {
  const userTurns = transcript.filter((t) => t.speaker === 'user');
  if (userTurns.length === 0) {
    return { verifiedQuote: '', verifiedTurnNumber: 1, wasReplaced: false };
  }

  // Check if claimedQuote exists verbatim in any user turn
  const matchingTurn = userTurns.find(
    (t) => claimedQuote && claimedQuote.trim().length > 0 && t.content.includes(claimedQuote.trim())
  );

  if (matchingTurn) {
    return {
      verifiedQuote: claimedQuote.trim(),
      verifiedTurnNumber: matchingTurn.turnIndex,
      wasReplaced: false,
    };
  }

  // Fabricated quote -> reject and replace with genuine user statement from transcript
  const targetTurn =
    userTurns.find((t) => t.turnIndex === turnNumber) ||
    userTurns.find((t) => /maybe|i guess|sorry|apologize|think/i.test(t.content)) ||
    userTurns[0];

  return {
    verifiedQuote: targetTurn.content,
    verifiedTurnNumber: targetTurn.turnIndex,
    wasReplaced: true,
  };
}
