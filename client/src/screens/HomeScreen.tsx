import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MASTER_BATTLES, OPPONENT_PERSONAS, Scenario } from '@chimera/shared';
import { Colors, Spacing, BorderRadius } from '../theme';
import { PurchasesService } from '../services/purchases';
import { AnalyticsService } from '../services/analytics';
import { PaywallModal } from '../components/PaywallModal';

interface HomeScreenProps {
  onSelectScenario: (scenario: Scenario) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectScenario }) => {
  const [isPro, setIsPro] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    AnalyticsService.track('onboarding_completed');
    const unsubscribe = PurchasesService.subscribe((info) => {
      setIsPro(info.isPro);
    });
    setScenarios(Object.values(MASTER_BATTLES));
    return unsubscribe;
  }, []);

  const handleScenarioPress = (scenario: Scenario) => {
    const isFreeScenario = ['salary-negotiation', 'saying-no'].includes(scenario.id);
    if (isFreeScenario || isPro) {
      onSelectScenario(scenario);
    } else {
      setShowPaywall(true);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appTitle}>CHIMERA COMBAT</Text>
          <TouchableOpacity
            style={[styles.proBadge, isPro && styles.proBadgeActive]}
            onPress={() => setShowPaywall(true)}
          >
            <Text style={[styles.proBadgeText, isPro && styles.proBadgeTextActive]}>
              {isPro ? 'PRO ACTIVE' : 'UPGRADE PRO'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tagline}>The flight simulator for difficult conversations.</Text>
      </View>

      {/* Daily Combat 2-Minute Habit Card */}
      <TouchableOpacity
        style={styles.dailyCard}
        onPress={() => handleScenarioPress(MASTER_BATTLES['salary-negotiation'])}
        activeOpacity={0.8}
      >
        <View style={styles.dailyTop}>
          <View style={styles.dailyTag}>
            <Text style={styles.dailyTagText}>DAILY COMBAT</Text>
          </View>
          <Text style={styles.dailyTime}>⏱️ 2 MIN CHALLENGE</Text>
        </View>
        <Text style={styles.dailyTitle}>The Surprise Counter-Offer</Text>
        <Text style={styles.dailyDesc}>
          Your manager just declared: "If you're unhappy with your current salary, other companies are hiring." Defend your standing without escalating.
        </Text>
        <View style={styles.dailyCTA}>
          <Text style={styles.dailyCTAText}>ENTER COMBAT →</Text>
        </View>
      </TouchableOpacity>

      {/* Battle Scenarios Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MASTER BATTLES</Text>
        <Text style={styles.sectionSub}>Select an opponent to begin combat</Text>
      </View>

      <View style={styles.scenarioList}>
        {scenarios.map((scenario) => {
          const persona = OPPONENT_PERSONAS[scenario.opponentPersonaId];
          const isFree = ['salary-negotiation', 'saying-no'].includes(scenario.id);
          const isLocked = !isFree && !isPro;

          return (
            <TouchableOpacity
              key={scenario.id}
              style={[styles.scenarioCard, isLocked && styles.scenarioCardLocked]}
              onPress={() => handleScenarioPress(scenario)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{scenario.category.toUpperCase()}</Text>
                </View>
                {isLocked ? (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>🔒 PRO ONLY</Text>
                  </View>
                ) : (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeText}>FREE BATTLE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.scenarioTitle}>{scenario.title}</Text>
              <Text style={styles.opponentLine}>
                Opponent: <Text style={styles.opponentName}>{persona?.name || 'Challenger'}</Text>
              </Text>
              <Text style={styles.contextBriefing} numberOfLines={2}>
                {scenario.contextBriefing}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
      />
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
  header: {
    paddingVertical: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  proBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  proBadgeActive: {
    borderColor: Colors.emerald,
    backgroundColor: 'rgba(0, 229, 153, 0.1)',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  proBadgeTextActive: {
    color: Colors.emerald,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dailyCard: {
    backgroundColor: '#121A28',
    borderColor: Colors.cyan,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  dailyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  dailyTag: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  dailyTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  dailyTime: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  dailyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dailyDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  dailyCTA: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  dailyCTAText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scenarioList: {
    gap: Spacing.sm,
  },
  scenarioCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  scenarioCardLocked: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  lockedBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: Colors.amber,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  lockedText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.amber,
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: 'rgba(0, 229, 153, 0.15)',
    borderColor: Colors.emerald,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  freeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.emerald,
    letterSpacing: 0.5,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  opponentLine: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  opponentName: {
    color: Colors.cyan,
    fontWeight: '700',
  },
  contextBriefing: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
