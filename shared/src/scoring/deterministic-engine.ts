import {
  CombatEvaluation,
  EvaluationDimension,
  Scenario,
  Tier1ExtractedFeatures,
} from '../types';

export class DeterministicScoringEngine {
  /**
   * Computes deterministic dimension scores and composite combat score
   * based on Tier 1 extracted evidence and scenario configuration.
   */
  public static computeEvaluation(
    sessionId: string,
    scenario: Scenario,
    tier1: Tier1ExtractedFeatures
  ): CombatEvaluation {
    const dimensions: Record<EvaluationDimension, number> = {
      clarity: 50,
      assertiveness: 50,
      empathy: 50,
      composure: 50,
      strategy: 50,
      boundarySetting: 50,
      goalProgress: 50,
      escalationControl: 50,
    };

    // Calculate each dimension according to mathematical rules
    for (const dim of Object.keys(dimensions) as EvaluationDimension[]) {
      let score = 50; // Neutral baseline

      // Incorporate 1-5 observation if present
      const obs = tier1.rawDimensionObservations?.[dim];
      if (obs) {
        // Map 1-5 scale to 20-100 base
        score = obs.score1To5 * 20;
      }

      // Mathematical bonuses & penalties based on verified objective features
      switch (dim) {
        case 'clarity':
          score -= tier1.hedgingInstancesCount * 7;
          score += Math.min(tier1.evidenceCitationsCount * 5, 20);
          break;

        case 'assertiveness':
          if (tier1.boundaryMaintained) score += 20;
          if (tier1.criticalMomentHandledEffectively) score += 15;
          score -= tier1.hedgingInstancesCount * 8;
          score -= tier1.defensiveLanguageCount * 6;
          break;

        case 'composure':
          if (tier1.composureMaintained) score += 25;
          score -= tier1.defensiveLanguageCount * 12;
          break;

        case 'boundarySetting':
          if (tier1.boundaryMaintained) {
            score += 30;
          } else {
            score -= 35; // Severe penalty for capitulating on explicit boundary
          }
          score -= tier1.hedgingInstancesCount * 5;
          break;

        case 'strategy':
          if (tier1.objectiveAchieved) score += 25;
          score += Math.min(tier1.evidenceCitationsCount * 8, 25);
          if (tier1.criticalMomentHandledEffectively) score += 15;
          break;

        case 'goalProgress':
          if (tier1.objectiveAchieved) {
            score += 35;
          } else {
            score -= 20;
          }
          if (tier1.criticalMomentHandledEffectively) score += 15;
          break;

        case 'empathy':
          if (tier1.defensiveLanguageCount === 0) score += 15;
          score -= tier1.defensiveLanguageCount * 10;
          break;

        case 'escalationControl':
          if (tier1.composureMaintained) score += 20;
          score -= tier1.defensiveLanguageCount * 15;
          break;
      }

      // Bound strictly to [0, 100]
      dimensions[dim] = Math.max(0, Math.min(100, Math.round(score)));
    }

    // Compute composite score using scenario-specific dimension weights
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [dim, weight] of Object.entries(scenario.dimensionWeights) as [EvaluationDimension, number][]) {
      if (weight > 0) {
        weightedSum += dimensions[dim] * weight;
        totalWeight += weight;
      }
    }

    // Normalize by actual total weight if not exactly 1.0
    const rawCombatScore = totalWeight > 0 ? weightedSum / totalWeight : 50;
    const finalCombatScore = Math.max(0, Math.min(100, Math.round(rawCombatScore)));

    return {
      sessionId,
      combatScore: finalCombatScore,
      dimensions,
      strengths: tier1.strengthsObserved,
      weakness: tier1.weaknessObserved,
      criticalMistake: tier1.criticalMistake,
      betterMove: tier1.betterMove,
      tier1Features: tier1,
      createdAt: Date.now(),
    };
  }
}
