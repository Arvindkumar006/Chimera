export type AnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'battle_started'
  | 'turn_completed'
  | 'critical_moment_reached'
  | 'battle_completed'
  | 'evaluation_viewed'
  | 'rematch_started'
  | 'rematch_completed'
  | 'critical_moment_replayed'
  | 'paywall_viewed'
  | 'purchase_initiated'
  | 'purchase_completed'
  | 'restore_completed';

export class AnalyticsService {
  private static anonymousUserId: string = `anon_${Math.random().toString(36).substring(2, 9)}`;

  public static track(eventName: AnalyticsEventName, properties: Record<string, any> = {}): void {
    const payload = {
      event: eventName,
      userId: this.anonymousUserId,
      timestamp: Date.now(),
      properties,
    };

    console.log(`[Analytics] ${eventName}`, payload);
  }

  public static getUserId(): string {
    return this.anonymousUserId;
  }
}
