import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CombatEvaluation, EvaluationDimension } from '@chimera/shared';
import { Colors, Spacing, BorderRadius } from '../theme';

interface AnalysisScreenProps {
  evaluation: CombatEvaluation;
  onRematch: () => void;
  onTryMomentAgain: () => void;
  onHome: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  evaluation,
  onRematch,
  onTryMomentAgain,
  onHome,
}) => {
  const getRankTitle = (score: number) => {
    if (score >= 90) return 'MASTER NEGOTIATOR';
    if (score >= 80) return 'EXECUTIVE STRATEGIST';
    if (score >= 70) return 'CALIBRATED PRACTITIONER';
    return 'DEVELOPING OPERATOR';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.emerald;
    if (score >= 65) return Colors.cyan;
    if (score >= 50) return Colors.amber;
    return Colors.red;
  };

  const activeDimensions = Object.entries(evaluation.dimensions).filter(
    ([_, val]) => val > 0
  ) as [EvaluationDimension, number][];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score Hero Header */}
      <View style={styles.scoreHero}>
        <Text style={styles.heroSub}>COMBAT AUDIT REPORT</Text>
        <Text style={[styles.scoreNumber, { color: getScoreColor(evaluation.combatScore) }]}>
          {evaluation.combatScore}
          <Text style={styles.scoreDenominator}> / 100</Text>
        </Text>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{getRankTitle(evaluation.combatScore)}</Text>
        </View>
      </View>

      {/* Primary Rematch CTA Bar */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.rematchButton} onPress={onRematch} activeOpacity={0.8}>
          <Text style={styles.rematchButtonText}>REMATCH NOW →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onTryMomentAgain}>
          <Text style={styles.secondaryButtonText}>TRY THIS MOMENT AGAIN</Text>
        </TouchableOpacity>
      </View>

      {/* 8-Dimension Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>DIMENSION AUDIT</Text>
        <View style={styles.dimensionList}>
          {activeDimensions.map(([dim, score]) => (
            <View key={dim} style={styles.dimensionItem}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionLabel}>
                  {dim.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </Text>
                <Text style={[styles.dimensionScore, { color: getScoreColor(score) }]}>
                  {score}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${score}%`, backgroundColor: getScoreColor(score) },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Strengths */}
      <View style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: Colors.emerald }]}>TACTICAL STRENGTHS</Text>
        {evaluation.strengths.map((str, idx) => (
          <View key={idx} style={styles.strengthRow}>
            <Text style={styles.bullet}>✓</Text>
            <Text style={styles.evidenceText}>{str}</Text>
          </View>
        ))}
      </View>

      {/* Critical Mistake */}
      <View style={[styles.sectionCard, styles.mistakeCard]}>
        <Text style={[styles.sectionTitle, { color: Colors.red }]}>
          CRITICAL MISTAKE (TURN {evaluation.criticalMistake.turnNumber})
        </Text>
        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>"{evaluation.criticalMistake.userQuote}"</Text>
        </View>
        <Text style={styles.mistakeReason}>{evaluation.criticalMistake.whyItFailed}</Text>
      </View>

      {/* Better Move */}
      <View style={[styles.sectionCard, styles.betterMoveCard]}>
        <View style={styles.principleHeader}>
          <Text style={styles.principleBadge}>
            TACTICAL PRINCIPLE: {evaluation.betterMove.tacticalPrinciple.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.betterMoveLabel}>RECOMMENDED RESPONSE:</Text>
        <View style={styles.betterMoveBox}>
          <Text style={styles.betterMoveText}>"{evaluation.betterMove.suggestedResponse}"</Text>
        </View>
      </View>

      {/* Return Home Button */}
      <TouchableOpacity style={styles.homeButton} onPress={onHome}>
        <Text style={styles.homeButtonText}>RETURN TO BATTLE SELECTOR</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  scoreHero: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroSub: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  scoreNumber: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreDenominator: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  rankBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.xs,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rematchButton: {
    flex: 1,
    backgroundColor: Colors.cyan,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rematchButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  mistakeCard: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: '#160F14',
  },
  betterMoveCard: {
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: '#0F1820',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  dimensionList: {
    gap: Spacing.sm,
  },
  dimensionItem: {
    gap: 2,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dimensionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dimensionScore: {
    fontSize: 11,
    fontWeight: '800',
  },
  track: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bullet: {
    color: Colors.emerald,
    fontWeight: '900',
    fontSize: 14,
  },
  evidenceText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  quoteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.red,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textPrimary,
  },
  mistakeReason: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  principleHeader: {
    marginBottom: 4,
  },
  principleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  betterMoveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  betterMoveBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.cyan,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  betterMoveText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  homeButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
