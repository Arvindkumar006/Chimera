import {
  CombatEvaluation,
  CombatSession,
  RematchComparison,
  Scenario,
  ThreatLevel,
  TranscriptTurn,
} from '@chimera/shared';

declare const __DEV__: boolean | undefined;

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';

  if (isDev) {
    return envUrl || 'http://localhost:3001';
  }

  // Production environment validation
  if (!envUrl) {
    const errorMsg = 'BLOCKED — PRODUCTION BACKEND URL REQUIRED';
    console.error(`[CombatApiService] Configuration Failure: ${errorMsg}. EXPO_PUBLIC_API_URL is missing.`);
    throw new Error(errorMsg);
  }

  if (!envUrl.startsWith('https://')) {
    const errorMsg = 'BLOCKED — PRODUCTION BACKEND URL REQUIRED';
    console.error(`[CombatApiService] Security Failure: ${errorMsg}. Production API URL must use HTTPS, received: '${envUrl}'.`);
    throw new Error(`${errorMsg}: Production backend must use HTTPS`);
  }

  return envUrl;
}

export class CombatApiService {
  public static async getScenarios(): Promise<Scenario[]> {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/scenarios`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return data.scenarios;
    } catch (err) {
      console.warn('[CombatApi] Network error fetching scenarios, using local fallback:', err);
      // Fallback to local definitions if backend is offline
      const { MASTER_BATTLES } = await import('@chimera/shared');
      return Object.values(MASTER_BATTLES);
    }
  }

  public static async startCombat(
    scenarioId: string,
    threatLevel: ThreatLevel = 'normal',
    userId?: string
  ): Promise<{ session: CombatSession; openingTurn: TranscriptTurn }> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/combat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, threatLevel, userId }),
    });

    if (res.status === 403) {
      const body = await res.json();
      throw new Error(body.message || 'ENTITLEMENT_REQUIRED');
    }

    if (!res.ok) throw new Error(`Failed to start combat (${res.status})`);
    return res.json();
  }

  public static async submitTurn(
    sessionId: string,
    userMessage: string
  ): Promise<{
    session: CombatSession;
    latestTurn: TranscriptTurn;
    isConcluded: boolean;
    currentPhase: string;
    isCriticalMomentReached: boolean;
  }> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/combat/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userMessage }),
    });

    if (!res.ok) throw new Error(`Failed to process turn (${res.status})`);
    return res.json();
  }

  public static async evaluateCombat(sessionId: string): Promise<CombatEvaluation> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/combat/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) throw new Error(`Failed to evaluate combat (${res.status})`);
    const data = await res.json();
    return data.evaluation;
  }

  public static async startRematch(
    originalSessionId: string
  ): Promise<{
    newSession: CombatSession;
    comparison: RematchComparison;
    openingTurn: TranscriptTurn;
  }> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/combat/rematch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalSessionId }),
    });

    if (!res.ok) throw new Error(`Failed to start rematch (${res.status})`);
    return res.json();
  }
}
