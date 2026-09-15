import {
  OpponentPersona,
  OpponentState,
  Scenario,
  Tier1ExtractedFeatures,
  TranscriptTurn,
} from '@chimera/shared';
import {
  RhetoricalAnalysisSchema,
  Tier1ExtractedFeaturesSchema,
} from '@chimera/shared';

export interface OpponentTurnResponse {
  replyText: string;
  tacticsIdentified: string[];
  containsEvidence: boolean;
  containsHedging: boolean;
  containsAggression: boolean;
  containsApology: boolean;
  containsFirmBoundary: boolean;
  detectedContradiction?: string | null;
  stateDelta: {
    trust: number;
    frustration: number;
    cooperation: number;
    pressure: number;
    resistance: number;
    respect: number;
  };
  internalTacticalThought: string;
  source?: 'REAL_AI' | 'HEURISTIC_FALLBACK';
  isCriticalMomentTriggered: boolean;
}

async function fetchWithRetry(url: string, options: any, maxRetries = 2): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || res.status === 503) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError || new Error('Network request failed after retries');
}

export class AIProviderGateway {
  private apiKey: string;
  private apiEndpoint: string;
  private modelName: string;
  private providerName: string;

  constructor() {
    // Dynamic provider resolution based on environment
    if (process.env.GROQ_API_KEY) {
      this.providerName = 'groq';
      this.apiKey = process.env.GROQ_API_KEY;
      this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      this.modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    } else if (process.env.OPENAI_API_KEY) {
      this.providerName = 'openai';
      this.apiKey = process.env.OPENAI_API_KEY;
      this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      this.modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    } else if (process.env.GEMINI_API_KEY) {
      this.providerName = 'gemini';
      this.apiKey = process.env.GEMINI_API_KEY;
      this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    } else {
      // Local development / fallback keyless mode
      this.providerName = 'heuristic-engine';
      this.apiKey = 'local-fallback';
      this.apiEndpoint = '';
      this.modelName = 'heuristic-engine';
    }
  }

  /**
   * Diagnostics reporting provider and model without leaking API keys
   */
  public getDiagnostics(): { provider: string; model: string; status: 'ready' | 'heuristic-resilience' } {
    const isReal = this.providerName !== 'heuristic-engine' && this.apiKey !== 'local-fallback';
    return {
      provider: this.providerName,
      model: this.modelName,
      status: isReal ? 'ready' : 'heuristic-resilience',
    };
  }

  /**
   * Generates the next in-character adaptive opponent turn with state delta
   */
  public async generateOpponentTurn(
    persona: OpponentPersona,
    scenario: Scenario,
    currentState: OpponentState,
    turnHistory: TranscriptTurn[],
    userMessage: string,
    isCriticalMomentTurn: boolean
  ): Promise<OpponentTurnResponse> {
    if (!this.apiEndpoint || this.apiKey === 'local-fallback') {
      return this.generateHeuristicTurn(persona, scenario, currentState, turnHistory, userMessage, isCriticalMomentTurn);
    }

    try {
      const systemPrompt = `You are playing the role of "${persona.name}" (${persona.archetype}) in a high-stakes conversational training battle.
Product: Chimera Combat — The Flight Simulator for Difficult Conversations.
Persona Traits: ${persona.traits.join(', ')}.
Persona Triggers: ${persona.triggers.join(', ')}.
Persona Weaknesses: ${persona.weaknesses.join(', ')}.
Scenario Context: ${scenario.contextBriefing}.
Opponent's Objective: ${scenario.opponentObjective}.
User's Objective: ${scenario.userObjective}.

Current Opponent State:
- Trust: ${currentState.trust}/100
- Frustration: ${currentState.frustration}/100
- Cooperation: ${currentState.cooperation}/100
- Pressure: ${currentState.pressure}/100
- Resistance: ${currentState.resistance}/100
- Respect: ${currentState.respect}/100

${isCriticalMomentTurn ? `CRITICAL MOMENT CLIMAX: You must deliver this battle's decisive challenge/ultimatum: "${scenario.criticalMomentPrompt}". Hold your ground firmly!` : ''}

Rules:
1. Stay strictly in character. Do NOT sound like an AI assistant or generic chatbot.
2. Be challenging, realistic, and pressure-inducing according to your persona archetype.
3. Reference prior statements or claims made by the user to hold them accountable.
4. Output JSON strictly matching this schema:
{
  "replyText": "your spoken dialogue response (2-4 sentences max, punchy, realistic)",
  "tacticsIdentified": ["evidence" | "hedging" | "aggression" | "apology" | "boundary"],
  "containsEvidence": boolean,
  "containsHedging": boolean,
  "containsAggression": boolean,
  "containsApology": boolean,
  "containsFirmBoundary": boolean,
  "detectedContradiction": string or null,
  "stateDelta": {
    "trust": number (-30 to +30),
    "frustration": number (-30 to +30),
    "cooperation": number (-30 to +30),
    "pressure": number (-30 to +30),
    "resistance": number (-30 to +30),
    "respect": number (-30 to +30)
  },
  "internalTacticalThought": "brief 1-sentence thought on why you responded this way",
  "isCriticalMomentTriggered": ${isCriticalMomentTurn}
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...turnHistory.map((t) => ({
          role: t.speaker === 'user' ? 'user' : 'assistant',
          content: t.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const res = await fetchWithRetry(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`AI API returned status ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const rawJson = data.choices?.[0]?.message?.content;
      if (!rawJson) throw new Error('No content returned from AI provider');

      const parsed = JSON.parse(rawJson);
      const validated = RhetoricalAnalysisSchema.safeParse(parsed);

      if (validated.success) {
        return {
          replyText: parsed.replyText || 'I am listening, but you have yet to convince me.',
          ...validated.data,
          source: 'REAL_AI',
        };
      } else {
        throw new Error(`AI API returned invalid schema: ${validated.error.message}`);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[AIProviderGateway] Critical: Real AI provider failed in production:', err);
        throw new Error(`AI_PROVIDER_UNAVAILABLE: ${err.message}`);
      }
      console.warn('[AIProviderGateway] Fallback to heuristic turn in non-production due to error:', err.message);
    }

    const heuristic = this.generateHeuristicTurn(persona, scenario, currentState, turnHistory, userMessage, isCriticalMomentTurn);
    return { ...heuristic, source: 'HEURISTIC_FALLBACK' };
  }

  /**
   * Tier 1 Feature & Evidence Extraction using Structured JSON Output
   */
  public async extractTier1Features(
    scenario: Scenario,
    transcript: TranscriptTurn[]
  ): Promise<Tier1ExtractedFeatures> {
    if (!this.apiEndpoint || this.apiKey === 'local-fallback') {
      return this.heuristicTier1Extraction(scenario, transcript);
    }

    try {
      const transcriptFormatted = transcript
        .map((t) => `Turn ${t.turnIndex} [${t.speaker.toUpperCase()}]: ${t.content}`)
        .join('\n');

      const prompt = `You are the Expert Combat Evaluator for Chimera Combat — The Flight Simulator for Difficult Conversations.
Analyze the following conversation between a User and their Opponent.
Scenario: ${scenario.title}
User Objective: ${scenario.userObjective}
Opponent Objective: ${scenario.opponentObjective}

TRANSCRIPT:
${transcriptFormatted}

Extract structured evidence into JSON strictly matching this schema:
{
  "objectiveAchieved": boolean (did the user secure their stated objective?),
  "evidenceCitationsCount": number (how many concrete metrics, numbers, or verified data points did user cite?),
  "hedgingInstancesCount": number (how many times did user use weak phrasing like "I think maybe", "I guess", "possibly"?),
  "defensiveLanguageCount": number (how many times did user become defensive, blame colleagues, or overly apologize?),
  "boundaryMaintained": boolean (did user hold their ground against unreasonable pressure?),
  "composureMaintained": boolean (did user remain calm, poised, and free of emotional tilt?),
  "criticalMomentHandledEffectively": boolean (did user effectively handle the critical challenge?),
  "strengthsObserved": ["Exact quote or observation 1", "Exact quote or observation 2"],
  "weaknessObserved": "The single most impactful tactical flaw in user's rhetoric",
  "criticalMistake": {
    "turnNumber": number (the turn where user made their biggest strategic error),
    "userQuote": "exact quote of what user said",
    "whyItFailed": "tactical explanation of why this damaged user leverage"
  },
  "betterMove": {
    "tacticalPrinciple": "Name of principle e.g. Contingent Commitment, Broken Record Boundary, Empathic Pivot",
    "suggestedResponse": "Exact rewrite of how the user SHOULD have responded at that critical mistake"
  }
}`;

      const res = await fetchWithRetry(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2, // Low temperature for high evaluation accuracy
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = data.choices?.[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          const validated = Tier1ExtractedFeaturesSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data as Tier1ExtractedFeatures;
          }
        }
      } else {
        throw new Error(`AI API returned status ${res.status}: ${await res.text()}`);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[AIProviderGateway] Critical: Real AI extraction failed in production:', err);
        throw new Error(`AI_PROVIDER_UNAVAILABLE: ${err.message}`);
      }
      console.warn('[AIProviderGateway] Tier 1 AI extraction fallback in non-production:', err.message);
    }

    return this.heuristicTier1Extraction(scenario, transcript);
  }

  /**
   * Deterministic, reliable heuristic opponent turn generator for offline/test environments
   */
  private generateHeuristicTurn(
    persona: OpponentPersona,
    scenario: Scenario,
    currentState: OpponentState,
    turnHistory: TranscriptTurn[],
    userMessage: string,
    isCriticalMomentTurn: boolean
  ): OpponentTurnResponse {
    const lower = userMessage.toLowerCase();
    const hasNumbers = /\d+/.test(userMessage);
    const hasHedging = /maybe|i guess|possibly|sort of|i think/i.test(lower);
    const hasBoundary = /no|cannot|will not|my priority|non-negotiable/i.test(lower);
    const hasApology = /sorry|my bad|apologize|forgive/i.test(lower);

    let replyText = '';
    const stateDelta = { trust: 0, frustration: 0, cooperation: 0, pressure: 0, resistance: 0, respect: 0 };

    if (isCriticalMomentTurn) {
      replyText = scenario.criticalMomentPrompt;
      stateDelta.pressure += 20;
      stateDelta.resistance += 15;
    } else if (hasNumbers && !hasHedging) {
      stateDelta.trust += 12;
      stateDelta.resistance -= 10;
      stateDelta.respect += 10;
      replyText = `You mentioned concrete deliverables. That is more compelling, but how does that address the immediate departmental constraints we are facing right now?`;
    } else if (hasHedging) {
      stateDelta.respect -= 10;
      stateDelta.pressure += 15;
      replyText = `You sound uncertain. If you are not completely convinced of your own position, why should I make concessions on our end?`;
    } else if (hasBoundary) {
      stateDelta.respect += 15;
      stateDelta.frustration += 5;
      stateDelta.cooperation += 5;
      replyText = `I hear your position clearly. However, we have mutual stakes here. What compromise are you putting on the table?`;
    } else if (hasApology) {
      stateDelta.respect -= 12;
      stateDelta.pressure += 10;
      replyText = `Apologies do not resolve the project delivery risk. I need to know specifically what actions you are taking right now.`;
    } else {
      replyText = `I understand your perspective, but that does not resolve the core problem: ${scenario.opponentObjective}. What is your tangible next step?`;
      stateDelta.pressure += 5;
    }

    return {
      replyText,
      tacticsIdentified: [hasNumbers ? 'evidence' : 'general', hasHedging ? 'hedging' : 'direct'],
      containsEvidence: hasNumbers,
      containsHedging: hasHedging,
      containsAggression: false,
      containsApology: hasApology,
      containsFirmBoundary: hasBoundary,
      detectedContradiction: null,
      stateDelta,
      internalTacticalThought: `Adjusted pressure based on user rhetoric (hedging: ${hasHedging}, evidence: ${hasNumbers}).`,
      isCriticalMomentTriggered: isCriticalMomentTurn,
    };
  }

  /**
   * Deterministic heuristic Tier 1 extractor
   */
  private heuristicTier1Extraction(
    scenario: Scenario,
    transcript: TranscriptTurn[]
  ): Tier1ExtractedFeatures {
    const userTurns = transcript.filter((t) => t.speaker === 'user');
    let evidenceCount = 0;
    let hedgingCount = 0;
    let defensiveCount = 0;
    let boundaryMaintained = false;

    for (const t of userTurns) {
      if (/\d+/.test(t.content)) evidenceCount++;
      if (/maybe|i guess|possibly|i think/i.test(t.content)) hedgingCount++;
      if (/sorry|my fault|apologize|not my fault/i.test(t.content)) defensiveCount++;
      if (/no|cannot|will not|boundary|firm/i.test(t.content)) boundaryMaintained = true;
    }

    const firstUserTurn = userTurns[0]?.content || 'Let us discuss the matter.';
    const mistakeTurn = userTurns.find((t) => /maybe|sorry|i guess/i.test(t.content)) || userTurns[0];

    return {
      objectiveAchieved: evidenceCount >= 1 && hedgingCount <= 2,
      evidenceCitationsCount: evidenceCount,
      hedgingInstancesCount: hedgingCount,
      defensiveLanguageCount: defensiveCount,
      boundaryMaintained,
      composureMaintained: defensiveCount <= 1,
      criticalMomentHandledEffectively: boundaryMaintained || evidenceCount >= 2,
      strengthsObserved: [
        `Maintained active conversational engagement across ${userTurns.length} turns`,
        evidenceCount > 0 ? `Successfully cited quantitative deliverables to support stance` : `Held professional demeanor under opponent pressure`,
      ],
      weaknessObserved: hedgingCount > 0 ? `Used hedging language that weakened conversational leverage` : `Did not pivot aggressively to close agreement`,
      criticalMistake: {
        turnNumber: mistakeTurn?.turnIndex || 2,
        userQuote: mistakeTurn?.content || firstUserTurn,
        whyItFailed: 'Conceded ground without securing a reciprocal commitment from the opponent.',
      },
      betterMove: {
        tacticalPrinciple: 'Contingent Framing',
        suggestedResponse: 'I understand your operational constraints. If we link this commitment to achieving our Q3 benchmarks, we can formalize the agreement today.',
      },
      rawDimensionObservations: {
        strategy: { score1To5: evidenceCount > 0 ? 4 : 3, observedEvidence: 'Anchored on core goals' },
        assertiveness: { score1To5: boundaryMaintained ? 4 : 3, observedEvidence: 'Tone consistency' },
        composure: { score1To5: defensiveCount === 0 ? 5 : 3, observedEvidence: 'Handled pushback' },
        clarity: { score1To5: hedgingCount === 0 ? 4 : 3, observedEvidence: 'Message brevity' },
        goalProgress: { score1To5: evidenceCount > 1 ? 4 : 3, observedEvidence: 'Progress toward target' },
      },
    };
  }
}
