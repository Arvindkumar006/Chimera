export interface RevenueCatWebhookEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    entitlement_ids?: string[];
    purchased_at_ms?: number;
    expiration_at_ms?: number;
  };
}

export class RevenueCatService {
  // In-memory entitlement cache mapping app_user_id to active entitlements
  private userEntitlements: Map<string, Set<string>> = new Map();

  constructor() {
    // Entitlement cache initialized empty; populated strictly via authenticated webhooks
  }

  public isPro(userId: string): boolean {
    const entitlements = this.userEntitlements.get(userId);
    return entitlements ? entitlements.has('chimera_pro') : false;
  }

  public grantEntitlement(userId: string, entitlement: string = 'chimera_pro'): void {
    if (!this.userEntitlements.has(userId)) {
      this.userEntitlements.set(userId, new Set());
    }
    this.userEntitlements.get(userId)!.add(entitlement);
  }

  public revokeEntitlement(userId: string, entitlement: string = 'chimera_pro'): void {
    const entitlements = this.userEntitlements.get(userId);
    if (entitlements) {
      entitlements.delete(entitlement);
    }
  }

  /**
   * Evaluates if a user is permitted to access a scenario based on entitlement
   */
  public canAccessScenario(userId: string, scenarioId: string): { allowed: boolean; reason?: string } {
    const isPro = this.isPro(userId);
    // Free tier allows first two introductory master scenarios: 'salary-negotiation' and 'saying-no'
    const freeScenarios = ['salary-negotiation', 'saying-no'];

    if (freeScenarios.includes(scenarioId) || isPro) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'This scenario requires Chimera Pro. Upgrade to unlock the full 8-battle master curriculum.',
    };
  }

  /**
   * Processes genuine RevenueCat Webhook payloads
   */
  public handleWebhook(payload: RevenueCatWebhookEvent): { success: boolean; action: string } {
    if (!payload?.event?.type || !payload?.event?.app_user_id) {
      return { success: false, action: 'invalid_payload' };
    }

    const { type, app_user_id, entitlement_ids } = payload.event;
    console.log(`[RevenueCat Webhook] Received ${type} for user ${app_user_id}`);

    const hasProEntitlement = entitlement_ids?.includes('chimera_pro') ?? false;

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        if (hasProEntitlement) {
          this.grantEntitlement(app_user_id, 'chimera_pro');
          return { success: true, action: 'granted_chimera_pro' };
        }
        return { success: false, action: 'missing_chimera_pro_entitlement' };

      case 'CANCELLATION':
      case 'EXPIRATION':
        this.revokeEntitlement(app_user_id, 'chimera_pro');
        return { success: true, action: 'revoked_chimera_pro' };

      default:
        return { success: true, action: 'ignored_unhandled_type' };
    }
  }
}
