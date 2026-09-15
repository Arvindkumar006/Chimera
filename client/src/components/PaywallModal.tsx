import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../theme';
import { ChimeraPackage, PurchasesService } from '../services/purchases';
import { AnalyticsService } from '../services/analytics';

interface PaywallModalProps {
  visible: boolean;
  weakestSkill?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  weakestSkill = 'Boundary Setting',
  onClose,
  onSuccess,
}) => {
  const [packages, setPackages] = useState<ChimeraPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ChimeraPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (visible) {
      AnalyticsService.track('paywall_viewed', { weakestSkill });
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setIsLoading(true);
    try {
      const pkgs = await PurchasesService.getOfferings();
      setPackages(pkgs);
      // Default to Annual if available
      const annual = pkgs.find((p) => p.packageType === 'ANNUAL') || pkgs[0];
      setSelectedPackage(annual || null);
    } catch (err) {
      console.warn('[Paywall] Error loading packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setIsLoading(true);
    AnalyticsService.track('purchase_initiated', { packageId: selectedPackage.identifier });

    try {
      await PurchasesService.purchasePackage(selectedPackage);
      AnalyticsService.track('purchase_completed', { packageId: selectedPackage.identifier });
      Alert.alert('Welcome to Chimera Pro', 'All master scenarios and unlimited rematches are now unlocked.');
      onSuccess();
    } catch (err: any) {
      if (err.message !== 'USER_CANCELLED') {
        Alert.alert('Purchase Error', err.message || 'Unable to complete transaction.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const info = await PurchasesService.restorePurchases();
      AnalyticsService.track('restore_completed', { isPro: info.isPro });
      if (info.isPro) {
        Alert.alert('Purchases Restored', 'Your Chimera Pro subscription has been restored.');
        onSuccess();
      } else {
        Alert.alert('No Subscription Found', 'No active Chimera Pro subscription was found on this account.');
      }
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message || 'Unable to restore prior purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>CHIMERA PRO</Text>
            </View>
            <Text style={styles.title}>BECOME HARDER TO BEAT</Text>
            <Text style={styles.subtitle}>
              Your weakest skill is{' '}
              <Text style={{ color: Colors.amber, fontWeight: '800' }}>{weakestSkill}</Text>.
              Train with high-pressure opponents until you master it.
            </Text>
          </View>

          {/* Value Props */}
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>⚔️ Unlimited battles across all 8 master scenarios</Text>
            <Text style={styles.featureItem}>🔁 Unlimited instant rematches with ghost tracking</Text>
            <Text style={styles.featureItem}>🎯 Full 8-dimension deterministic evaluation & coaching</Text>
            <Text style={styles.featureItem}>🔥 Hard and Nightmare threat levels unlocked</Text>
          </View>

          {/* Packages Selector */}
          {isLoading ? (
            <ActivityIndicator color={Colors.cyan} style={{ marginVertical: Spacing.lg }} />
          ) : packages.length === 0 ? (
            <View style={styles.unavailableContainer}>
              <Text style={styles.unavailableText}>
                Purchases are temporarily unavailable. Please try again.
              </Text>
            </View>
          ) : (
            <View style={styles.packagesContainer}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const isAnnual = pkg.packageType === 'ANNUAL';

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.8}
                  >
                    {isAnnual && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>MOST POPULAR • 3-DAY TRIAL</Text>
                      </View>
                    )}
                    <View style={styles.packageRow}>
                      <View>
                        <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                        <Text style={styles.packageDesc}>{pkg.product.description}</Text>
                      </View>
                      <Text style={[styles.packagePrice, isSelected && { color: Colors.cyan }]}>
                        {pkg.product.priceString}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* CTA Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, (!selectedPackage || packages.length === 0) && styles.disabledButton]}
            onPress={handlePurchase}
            disabled={!selectedPackage || isLoading || packages.length === 0}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.purchaseButtonText}>START CHIMERA PRO</Text>
            )}
          </TouchableOpacity>

          {/* Restore and Legal Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
              <Text style={styles.footerActionText}>
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.footerMuted}>•</Text>
            <Text style={styles.footerMuted}>Cancel anytime in App Store</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 14, 0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: Spacing.xs,
  },
  closeText: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tagBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: Colors.cyan,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.cyan,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
  featuresList: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  featureItem: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  packagesContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  packageCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
  },
  packageCardSelected: {
    borderColor: Colors.cyan,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  bestValueBadge: {
    backgroundColor: Colors.cyan,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: 4,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  packageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  packageDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    maxWidth: 220,
    marginTop: 2,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  purchaseButton: {
    backgroundColor: Colors.cyan,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerMuted: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  unavailableContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
    alignItems: 'center',
  },
  unavailableText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
