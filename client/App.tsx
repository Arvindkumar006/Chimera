import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Alert } from 'react-native';
import { CombatEvaluation, MASTER_BATTLES, Scenario } from '@chimera/shared';
import { Colors } from './src/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { CombatScreen } from './src/screens/CombatScreen';
import { AnalysisScreen } from './src/screens/AnalysisScreen';
import { PurchasesService } from './src/services/purchases';
import { CombatApiService } from './src/services/api';

import { AnalyticsService } from './src/services/analytics';

type AppScreen = 'HOME' | 'COMBAT' | 'ANALYSIS';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('HOME');
  const [activeScenario, setActiveScenario] = useState<Scenario>(MASTER_BATTLES['salary-negotiation']);
  const [latestEvaluation, setLatestEvaluation] = useState<CombatEvaluation | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  useEffect(() => {
    AnalyticsService.track('onboarding_started');
    // Initialize RevenueCat SDK
    PurchasesService.initialize().catch((err) => {
      console.warn('[App] RevenueCat init failed:', err);
    });
  }, []);

  const handleSelectScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setPreviousScore(null);
    setCurrentScreen('COMBAT');
  };

  const handleCombatConcluded = (evaluation: CombatEvaluation) => {
    setLatestEvaluation(evaluation);
    if (previousScore !== null) {
      const delta = evaluation.combatScore - previousScore;
      const sign = delta >= 0 ? `+${delta}` : `${delta}`;
      AnalyticsService.track('rematch_completed', {
        previousScore,
        newScore: evaluation.combatScore,
        scoreDelta: delta,
      });
      Alert.alert(
        'Rematch Concluded',
        `Previous Score: ${previousScore}\nNew Score: ${evaluation.combatScore}\nScore Delta: ${sign} points.`
      );
    }
    setCurrentScreen('ANALYSIS');
  };

  const handleRematch = async () => {
    if (!latestEvaluation) return;
    try {
      setPreviousScore(latestEvaluation.combatScore);
      AnalyticsService.track('rematch_started', {
        originalSessionId: latestEvaluation.sessionId,
        previousScore: latestEvaluation.combatScore,
      });
      const rematchResult = await CombatApiService.startRematch(latestEvaluation.sessionId);
      setCurrentScreen('COMBAT');
    } catch (err: any) {
      Alert.alert('Rematch Error', err.message || 'Failed to initiate rematch.');
    }
  };

  const handleTryMomentAgain = () => {
    AnalyticsService.track('critical_moment_replayed', {
      sessionId: latestEvaluation?.sessionId,
    });
    Alert.alert(
      'Try This Moment Again',
      'Entering critical moment exchange. Focus on asserting boundaries without conceding timeline leverage.',
      [
        {
          text: 'Begin Challenge',
          onPress: () => setCurrentScreen('COMBAT'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {currentScreen === 'HOME' && (
        <HomeScreen onSelectScenario={handleSelectScenario} />
      )}

      {currentScreen === 'COMBAT' && (
        <CombatScreen
          scenario={activeScenario}
          onConclude={handleCombatConcluded}
          onExit={() => setCurrentScreen('HOME')}
        />
      )}

      {currentScreen === 'ANALYSIS' && latestEvaluation && (
        <AnalysisScreen
          evaluation={latestEvaluation}
          onRematch={handleRematch}
          onTryMomentAgain={handleTryMomentAgain}
          onHome={() => setCurrentScreen('HOME')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
