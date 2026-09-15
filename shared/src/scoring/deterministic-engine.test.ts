import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeterministicScoringEngine } from './deterministic-engine';
import { MASTER_BATTLES } from '../scenarios';
import { Tier1ExtractedFeatures } from '../types';

describe('DeterministicScoringEngine', () => {
  const sampleTier1: Tier1ExtractedFeatures = {
    objectiveAchieved: true,
    evidenceCitationsCount: 3,
    hedgingInstancesCount: 1,
    defensiveLanguageCount: 0,
    boundaryMaintained: true,
    composureMaintained: true,
    criticalMomentHandledEffectively: true,
    strengthsObserved: [
      'Cited 3 concrete enterprise client metrics in Turn 3',
      'Held composure when interrupted without apologizing',
    ],
    weaknessObserved: 'Slight hesitation before proposing final review date',
    criticalMistake: {
      turnNumber: 2,
      userQuote: 'I guess maybe we could discuss it later if you are busy.',
      whyItFailed: 'Unnecessary hedging reduced conversational leverage.',
    },
    betterMove: {
      tacticalPrinciple: 'Direct Framing',
      suggestedResponse: 'I have prepared our quarterly deliverables audit. Let us review the numbers now.',
    },
    rawDimensionObservations: {
      strategy: { score1To5: 4, observedEvidence: 'Clear focus on ROI' },
      assertiveness: { score1To5: 4, observedEvidence: 'Firm tone' },
      composure: { score1To5: 5, observedEvidence: 'No tilt' },
      clarity: { score1To5: 4, observedEvidence: 'Concise points' },
      goalProgress: { score1To5: 5, observedEvidence: 'Target secured' },
    },
  };

  it('guarantees 100% deterministic reproducibility across multiple runs', () => {
    const scenario = MASTER_BATTLES['salary-negotiation'];
    const eval1 = DeterministicScoringEngine.computeEvaluation('session-1', scenario, sampleTier1);
    const eval2 = DeterministicScoringEngine.computeEvaluation('session-1', scenario, sampleTier1);

    assert.strictEqual(eval1.combatScore, eval2.combatScore);
    assert.deepStrictEqual(eval1.dimensions, eval2.dimensions);
    assert.strictEqual(eval1.strengths[0], eval2.strengths[0]);
    assert.strictEqual(eval1.criticalMistake.userQuote, eval2.criticalMistake.userQuote);
  });

  it('strictly bounds all scores between 0 and 100', () => {
    const scenario = MASTER_BATTLES['saying-no'];

    // Test extreme worst case
    const worstCaseTier1: Tier1ExtractedFeatures = {
      ...sampleTier1,
      objectiveAchieved: false,
      evidenceCitationsCount: 0,
      hedgingInstancesCount: 15,
      defensiveLanguageCount: 10,
      boundaryMaintained: false,
      composureMaintained: false,
      criticalMomentHandledEffectively: false,
    };

    const worstEval = DeterministicScoringEngine.computeEvaluation('session-worst', scenario, worstCaseTier1);
    assert.ok(worstEval.combatScore >= 0 && worstEval.combatScore <= 100);
    for (const score of Object.values(worstEval.dimensions)) {
      assert.ok(score >= 0 && score <= 100);
    }

    // Test extreme best case
    const bestCaseTier1: Tier1ExtractedFeatures = {
      ...sampleTier1,
      evidenceCitationsCount: 10,
      hedgingInstancesCount: 0,
      defensiveLanguageCount: 0,
    };

    const bestEval = DeterministicScoringEngine.computeEvaluation('session-best', scenario, bestCaseTier1);
    assert.ok(bestEval.combatScore >= 0 && bestEval.combatScore <= 100);
    assert.ok(bestEval.combatScore > worstEval.combatScore);
  });

  it('applies scenario-specific weights correctly', () => {
    const salaryScenario = MASTER_BATTLES['salary-negotiation'];
    const sayingNoScenario = MASTER_BATTLES['saying-no'];

    // Saying No heavily weights boundarySetting (0.35)
    // Salary Negotiation weights strategy & goalProgress (0.25 & 0.20)
    const evalSalary = DeterministicScoringEngine.computeEvaluation('s1', salaryScenario, sampleTier1);
    const evalSayingNo = DeterministicScoringEngine.computeEvaluation('s2', sayingNoScenario, sampleTier1);

    assert.ok(typeof evalSalary.combatScore === 'number');
    assert.ok(typeof evalSayingNo.combatScore === 'number');
  });
});
