import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  EvaluateCombatRequestSchema,
  MASTER_BATTLES,
  OPPONENT_PERSONAS,
  RematchRequestSchema,
  StartCombatRequestSchema,
  UserTurnRequestSchema,
} from '@chimera/shared';
import { CombatEngine } from './engine/combat-engine';
import { RevenueCatService } from './monetization/revenuecat-service';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const combatEngine = new CombatEngine();
const revenueCatService = new RevenueCatService();

// Root Index Route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Chimera Combat API',
    description: 'The Flight Simulator for Difficult Conversations',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      scenarios: '/api/scenarios',
      combat: '/api/combat/start',
      webhooks: '/api/webhooks/revenuecat',
    },
  });
});

// Health & AI Provider Status
app.get('/health', (_req: Request, res: Response) => {
  const aiDiagnostics = combatEngine.getAIDiagnostics();
  res.json({
    status: 'healthy',
    service: 'chimera-combat-backend',
    version: '1.0.0',
    timestamp: Date.now(),
    aiProvider: {
      provider: aiDiagnostics.provider,
      model: aiDiagnostics.model,
      status: aiDiagnostics.status,
    },
  });
});

// List All Master Scenarios
app.get('/api/scenarios', (_req: Request, res: Response) => {
  const scenarios = Object.values(MASTER_BATTLES).map((s) => ({
    ...s,
    opponentPersona: OPPONENT_PERSONAS[s.opponentPersonaId],
  }));
  res.json({ scenarios });
});

// Get Single Scenario
app.get('/api/scenarios/:id', (req: Request, res: Response) => {
  const scenarioId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const scenario = MASTER_BATTLES[scenarioId];
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }
  const persona = OPPONENT_PERSONAS[scenario.opponentPersonaId];
  return res.json({ scenario, persona });
});

// Start Combat Session
app.post('/api/combat/start', (req: Request, res: Response) => {
  const parsed = StartCombatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid start payload', details: parsed.error });
  }

  const { scenarioId, threatLevel, userId } = parsed.data;

  // Verify entitlement gating
  const accessCheck = revenueCatService.canAccessScenario(userId || 'anonymous', scenarioId);
  if (!accessCheck.allowed) {
    return res.status(403).json({
      error: 'ENTITLEMENT_REQUIRED',
      message: accessCheck.reason,
      requiredEntitlement: 'chimera_pro',
    });
  }

  try {
    const session = combatEngine.startSession(scenarioId, threatLevel, userId);
    return res.json({
      session,
      openingTurn: session.turns[0],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Process Turn (Interactive Adaptive Dialogue)
app.post('/api/combat/turn', async (req: Request, res: Response) => {
  const parsed = UserTurnRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid turn payload', details: parsed.error });
  }

  const { sessionId, userMessage } = parsed.data;

  try {
    const result = await combatEngine.processTurn(sessionId, userMessage);
    return res.json({
      session: result.session,
      latestTurn: result.latestTurn,
      isConcluded: result.session.status === 'concluded',
      currentPhase: result.session.currentPhase,
      isCriticalMomentReached: result.session.isCriticalMomentReached,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Two-Tier Evaluation & Scoring Pipeline
app.post('/api/combat/evaluate', async (req: Request, res: Response) => {
  const parsed = EvaluateCombatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid evaluate payload', details: parsed.error });
  }

  const { sessionId } = parsed.data;

  try {
    const evaluation = await combatEngine.evaluateSession(sessionId);
    return res.json({ evaluation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Instant Rematch
app.post('/api/combat/rematch', async (req: Request, res: Response) => {
  const parsed = RematchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid rematch payload', details: parsed.error });
  }

  const { originalSessionId } = parsed.data;

  try {
    const result = await combatEngine.startRematch(originalSessionId);
    return res.json({
      newSession: result.newSession,
      comparison: result.comparison,
      openingTurn: result.newSession.turns[0],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// RevenueCat Webhook Authentication Middleware
export function verifyRevenueCatWebhookAuth(req: Request, res: Response, next: () => void) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[RevenueCat Webhook] Server configuration error: REVENUECAT_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Server misconfiguration: Webhook secret not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1] !== secret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid authorization token' });
  }

  next();
}

// RevenueCat Webhook Receiver
app.post('/api/webhooks/revenuecat', verifyRevenueCatWebhookAuth, (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !req.body.event || typeof req.body.event !== 'object') {
      return res.status(400).json({ error: 'Malformed webhook payload: missing event object' });
    }
    const { type, app_user_id } = req.body.event;
    if (!type || !app_user_id || typeof type !== 'string' || typeof app_user_id !== 'string') {
      return res.status(400).json({ error: 'Malformed webhook payload: missing type or app_user_id' });
    }

    const result = revenueCatService.handleWebhook(req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('[RevenueCat Webhook Error]', err);
    return res.status(400).json({ error: 'Malformed webhook payload' });
  }
});

// User Entitlements check
app.get('/api/user/:userId/entitlements', (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const isPro = revenueCatService.isPro(userId);
  res.json({
    userId,
    isPro,
    entitlements: isPro ? ['chimera_pro'] : [],
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`[Chimera Combat Engine] Server running on http://localhost:${port}`);
  });
}

export { app, combatEngine, revenueCatService };
