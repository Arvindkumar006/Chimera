import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  CombatEvaluation,
  CombatSession,
  MASTER_BATTLES,
  OPPONENT_PERSONAS,
  Scenario,
} from '@chimera/shared';
import { Colors, Spacing, BorderRadius } from '../theme';
import { TacticalHUD } from '../components/TacticalHUD';
import { DialogueFeed } from '../components/DialogueFeed';
import { CombatApiService } from '../services/api';
import { AnalyticsService } from '../services/analytics';

interface CombatScreenProps {
  scenario: Scenario;
  initialSession?: CombatSession;
  onConclude: (evaluation: CombatEvaluation) => void;
  onExit: () => void;
}

export const CombatScreen: React.FC<CombatScreenProps> = ({
  scenario,
  initialSession,
  onConclude,
  onExit,
}) => {
  const [session, setSession] = useState<CombatSession | null>(initialSession || null);
  const [userText, setUserText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const persona = OPPONENT_PERSONAS[scenario.opponentPersonaId];

  useEffect(() => {
    if (!session) {
      initSession();
    }
  }, []);

  const initSession = async () => {
    try {
      AnalyticsService.track('battle_started', {
        scenarioId: scenario.id,
        threatLevel: scenario.threatLevel,
      });
      const result = await CombatApiService.startCombat(
        scenario.id,
        scenario.threatLevel,
        AnalyticsService.getUserId()
      );
      setSession(result.session);
    } catch (err: any) {
      Alert.alert('Session Initialization Failed', err.message);
      onExit();
    }
  };

  const handleSend = async () => {
    if (!userText.trim() || !session || isSending) return;

    const message = userText.trim();
    setUserText('');
    setIsSending(true);

    try {
      AnalyticsService.track('turn_completed', {
        sessionId: session.sessionId,
        turnIndex: session.turnCount + 1,
      });

      const res = await CombatApiService.submitTurn(session.sessionId, message);
      setSession(res.session);

      if (res.isCriticalMomentReached) {
        AnalyticsService.track('critical_moment_reached', {
          sessionId: session.sessionId,
        });
      }

      if (res.isConcluded) {
        handleCombatConcluded(res.session.sessionId);
      }
    } catch (err: any) {
      Alert.alert('Turn Error', err.message || 'Failed to submit response.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCombatConcluded = async (sessionId: string) => {
    setIsEvaluating(true);
    try {
      AnalyticsService.track('battle_completed', { sessionId });
      const evaluation = await CombatApiService.evaluateCombat(sessionId);
      AnalyticsService.track('evaluation_viewed', {
        sessionId,
        combatScore: evaluation.combatScore,
      });
      onConclude(evaluation);
    } catch (err: any) {
      Alert.alert('Evaluation Failed', err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.cyan} />
        <Text style={styles.loadingText}>Initializing Combat Cockpit...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
    >
      {/* Tactical Top HUD */}
      <TacticalHUD
        persona={persona}
        state={session.state}
        phase={session.currentPhase}
        threatLevel={session.threatLevel}
        turnCount={session.turnCount}
      />

      {/* Main Dialogue Transcript */}
      <DialogueFeed turns={session.turns} isThinking={isSending} />

      {/* Bottom Response Cockpit */}
      {isEvaluating ? (
        <View style={styles.evaluatingBar}>
          <ActivityIndicator color={Colors.cyan} />
          <Text style={styles.evaluatingText}>
            Combat Concluded. Running Two-Tier Deterministic Evaluation...
          </Text>
        </View>
      ) : (
        <View style={styles.inputCockpit}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your tactical response..."
              placeholderTextColor={Colors.textMuted}
              value={userText}
              onChangeText={setUserText}
              multiline
              maxLength={600}
              editable={!isSending && session.status === 'active'}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!userText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!userText.trim() || isSending}
            >
              <Text style={styles.sendButtonText}>RESPOND</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Tactical Anchor helpers */}
          <View style={styles.quickPrompts}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setUserText('Based on the deliverables cited in our contract...')}
            >
              <Text style={styles.quickChipText}>📊 Cite Deliverables</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setUserText('I understand your constraint, but my position on this is firm.')}
            >
              <Text style={styles.quickChipText}>🛡️ Set Boundary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleCombatConcluded(session.sessionId)}
            >
              <Text style={[styles.quickChipText, { color: Colors.amber }]}>🏁 Conclude Battle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  evaluatingBar: {
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  evaluatingText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  inputCockpit: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: Colors.textInverse,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  quickChip: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  quickChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
