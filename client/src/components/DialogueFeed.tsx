import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { TranscriptTurn } from '@chimera/shared';
import { Colors, Spacing, BorderRadius } from '../theme';

interface DialogueFeedProps {
  turns: TranscriptTurn[];
  isThinking?: boolean;
}

export const DialogueFeed: React.FC<DialogueFeedProps> = ({ turns, isThinking }) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [turns, isThinking]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {turns.map((turn, index) => {
        const isOpponent = turn.speaker === 'opponent';

        return (
          <View
            key={`${turn.turnIndex}-${index}`}
            style={[
              styles.turnWrapper,
              isOpponent ? styles.opponentWrapper : styles.userWrapper,
            ]}
          >
            {turn.isCriticalMoment && (
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalBadgeText}>⚠️ CRITICAL MOMENT CLIMAX</Text>
              </View>
            )}

            <View
              style={[
                styles.bubble,
                isOpponent ? styles.opponentBubble : styles.userBubble,
                turn.isCriticalMoment && styles.criticalBubble,
              ]}
            >
              <Text style={styles.speakerLabel}>
                {isOpponent ? 'OPPONENT' : 'YOU'}
              </Text>
              <Text style={styles.messageText}>{turn.content}</Text>
            </View>
          </View>
        );
      })}

      {isThinking && (
        <View style={[styles.turnWrapper, styles.opponentWrapper]}>
          <View style={[styles.bubble, styles.opponentBubble, styles.thinkingBubble]}>
            <Text style={styles.thinkingText}>Opponent is calculating response...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  turnWrapper: {
    width: '100%',
  },
  opponentWrapper: {
    alignItems: 'flex-start',
  },
  userWrapper: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  opponentBubble: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderTopLeftRadius: BorderRadius.xs,
  },
  userBubble: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.cyan,
    borderTopRightRadius: BorderRadius.xs,
  },
  criticalBubble: {
    borderColor: Colors.red,
    backgroundColor: '#1E1015',
  },
  criticalBadge: {
    backgroundColor: Colors.red,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  criticalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  speakerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  thinkingBubble: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textSecondary,
  },
});
