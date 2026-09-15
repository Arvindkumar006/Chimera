import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CombatPhase, OpponentPersona, OpponentState, ThreatLevel } from '@chimera/shared';
import { Colors, Spacing, BorderRadius } from '../theme';

interface TacticalHUDProps {
  persona: OpponentPersona;
  state: OpponentState;
  phase: CombatPhase;
  threatLevel: ThreatLevel;
  turnCount: number;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  persona,
  state,
  phase,
  threatLevel,
  turnCount,
}) => {
  const getPhaseBadgeColor = () => {
    switch (phase) {
      case 'OPENING':
        return Colors.cyan;
      case 'PRESSURE':
        return Colors.amber;
      case 'CRITICAL_MOMENT':
        return Colors.red;
      case 'CONCLUDED':
        return Colors.emerald;
      default:
        return Colors.cyan;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Meta Bar */}
      <View style={styles.topRow}>
        <View style={styles.opponentInfo}>
          <Text style={styles.opponentName}>{persona.name.toUpperCase()}</Text>
          <Text style={styles.archetype}>{persona.archetype}</Text>
        </View>

        <View style={styles.badges}>
          <View style={[styles.badge, { borderColor: getPhaseBadgeColor() }]}>
            <Text style={[styles.badgeText, { color: getPhaseBadgeColor() }]}>
              {phase.replace('_', ' ')}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: Colors.border }]}>
            <Text style={styles.turnBadgeText}>TURN {turnCount}</Text>
          </View>
        </View>
      </View>

      {/* Opponent Internal State Gauges */}
      <View style={styles.gaugesContainer}>
        {/* Trust Gauge */}
        <View style={styles.gaugeItem}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>TRUST</Text>
            <Text style={[styles.gaugeValue, { color: Colors.cyan }]}>{state.trust}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${state.trust}%`, backgroundColor: Colors.cyan },
              ]}
            />
          </View>
        </View>

        {/* Frustration Gauge */}
        <View style={styles.gaugeItem}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>TILT / FRUSTRATION</Text>
            <Text style={[styles.gaugeValue, { color: Colors.red }]}>{state.frustration}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${state.frustration}%`, backgroundColor: Colors.red },
              ]}
            />
          </View>
        </View>

        {/* Pressure Gauge */}
        <View style={styles.gaugeItem}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>PRESSURE</Text>
            <Text style={[styles.gaugeValue, { color: Colors.amber }]}>{state.pressure}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${state.pressure}%`, backgroundColor: Colors.amber },
              ]}
            />
          </View>
        </View>

        {/* Cooperation Gauge */}
        <View style={styles.gaugeItem}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>COOPERATION</Text>
            <Text style={[styles.gaugeValue, { color: Colors.emerald }]}>{state.cooperation}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${state.cooperation}%`, backgroundColor: Colors.emerald },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  opponentInfo: {
    flex: 1,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  archetype: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: Colors.surfaceElevated,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  turnBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  gaugesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gaugeItem: {
    flex: 1,
    minWidth: '45%',
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  gaugeValue: {
    fontSize: 10,
    fontWeight: '800',
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
