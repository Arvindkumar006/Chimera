import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { Server } from 'http';
import { app, revenueCatService } from './server';

describe('Chimera Combat API Server', () => {
  let server: Server;
  const PORT = 3099;
  const baseUrl = `http://localhost:${PORT}`;

  before((_context, done) => {
    process.env.REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || 'test-rc-webhook-secret-999';
    server = app.listen(PORT, () => done());
  });

  after((_context, done) => {
    server.close(() => done());
  });

  it('GET /health returns 200 with service info', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.status, 'healthy');
    assert.strictEqual(body.service, 'chimera-combat-backend');
  });

  it('GET /api/scenarios lists master scenarios', async () => {
    const res = await fetch(`${baseUrl}/api/scenarios`);
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(Array.isArray(body.scenarios));
    assert.ok(body.scenarios.length >= 6);
    const salary = body.scenarios.find((s: any) => s.id === 'salary-negotiation');
    assert.ok(salary);
    assert.strictEqual(salary.opponentPersonaId, 'the-skeptic');
  });

  it('enforces RevenueCat entitlement gating on Pro scenarios for free users', async () => {
    // 'performance-review' requires Chimera Pro
    const res = await fetch(`${baseUrl}/api/combat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'performance-review',
        userId: 'free-user-123',
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'ENTITLEMENT_REQUIRED');
    assert.strictEqual(body.requiredEntitlement, 'chimera_pro');
  });

  it('allows starting a free scenario and executes full combat loop', async () => {
    // 1. Start battle
    const startRes = await fetch(`${baseUrl}/api/combat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'salary-negotiation',
        threatLevel: 'normal',
        userId: 'test-user',
      }),
    });

    assert.strictEqual(startRes.status, 200);
    const startBody = (await startRes.json()) as any;
    assert.ok(startBody.session.sessionId);
    assert.strictEqual(startBody.session.currentPhase, 'OPENING');
    assert.strictEqual(startBody.session.turns.length, 1);
    assert.strictEqual(startBody.openingTurn.speaker, 'opponent');

    const sessionId = startBody.session.sessionId;

    // 2. Play Turn 1 (Evidence-based response)
    const turn1Res = await fetch(`${baseUrl}/api/combat/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userMessage: 'Over the last two quarters, I delivered 3 enterprise migrations on time, generating $420,000 in recurring revenue.',
      }),
    });

    assert.strictEqual(turn1Res.status, 200);
    const turn1Body = (await turn1Res.json()) as any;
    assert.strictEqual(turn1Body.session.turns.length, 3); // Opening + User + Opponent
    assert.ok(turn1Body.latestTurn.content.length > 5);

    // Opponent trust should have increased due to quantitative metrics
    assert.ok(turn1Body.session.state.trust >= startBody.session.state.trust);

    // 3. Play Turn 2 (Holding firm boundary)
    const turn2Res = await fetch(`${baseUrl}/api/combat/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userMessage: 'I understand team budgets are tight, but my deliverable output exceeds senior benchmarks. A 15% adjustment reflects market value.',
      }),
    });

    assert.strictEqual(turn2Res.status, 200);
    const turn2Body = (await turn2Res.json()) as any;
    assert.strictEqual(turn2Body.session.turns.length, 5);

    // 4. Evaluate Combat Session
    const evalRes = await fetch(`${baseUrl}/api/combat/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    assert.strictEqual(evalRes.status, 200);
    const evalBody = (await evalRes.json()) as any;
    assert.ok(evalBody.evaluation);
    assert.ok(evalBody.evaluation.combatScore >= 0 && evalBody.evaluation.combatScore <= 100);
    assert.ok(evalBody.evaluation.strengths.length === 2);
    assert.ok(evalBody.evaluation.criticalMistake.userQuote);
    assert.ok(evalBody.evaluation.betterMove.suggestedResponse);

    // 5. Test Rematch
    const rematchRes = await fetch(`${baseUrl}/api/combat/rematch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalSessionId: sessionId }),
    });

    assert.strictEqual(rematchRes.status, 200);
    const rematchBody = (await rematchRes.json()) as any;
    assert.ok(rematchBody.newSession.sessionId);
    assert.notStrictEqual(rematchBody.newSession.sessionId, sessionId);
    assert.strictEqual(rematchBody.comparison.previousScore, evalBody.evaluation.combatScore);
  });

  it('rejects RevenueCat webhook with missing Authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/revenuecat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'attacker-1',
          entitlement_ids: ['chimera_pro'],
        },
      }),
    });
    assert.strictEqual(res.status, 401);
  });

  it('rejects RevenueCat webhook with invalid Authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/revenuecat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-secret-token',
      },
      body: JSON.stringify({
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'attacker-2',
          entitlement_ids: ['chimera_pro'],
        },
      }),
    });
    assert.strictEqual(res.status, 401);
  });

  it('rejects malformed RevenueCat webhook payload with 400', async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/revenuecat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET || 'test-rc-webhook-secret-999'}`,
      },
      body: JSON.stringify({ random_junk: 123 }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('authorized event without chimera_pro does NOT grant Pro', async () => {
    const testSecret = process.env.REVENUECAT_WEBHOOK_SECRET || 'test-rc-webhook-secret-999';
    const res = await fetch(`${baseUrl}/api/webhooks/revenuecat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecret}`,
      },
      body: JSON.stringify({
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'other-tier-user',
          product_id: 'some_other_tier',
          entitlement_ids: ['basic_tier'],
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.action, 'missing_chimera_pro_entitlement');

    // Verify user is NOT Pro
    const entRes = await fetch(`${baseUrl}/api/user/other-tier-user/entitlements`);
    const entBody = (await entRes.json()) as any;
    assert.strictEqual(entBody.isPro, false);
  });

  it('authorized valid chimera_pro event grants Pro and expiration revokes Pro', async () => {
    const testSecret = process.env.REVENUECAT_WEBHOOK_SECRET || 'test-rc-webhook-secret-999';

    // 1. Grant Pro via authorized webhook
    const grantRes = await fetch(`${baseUrl}/api/webhooks/revenuecat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecret}`,
      },
      body: JSON.stringify({
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'new-subscriber-789',
          product_id: 'chimera_pro_annual',
          entitlement_ids: ['chimera_pro'],
          purchased_at_ms: Date.now(),
        },
      }),
    });

    assert.strictEqual(grantRes.status, 200);
    const grantBody = (await grantRes.json()) as any;
    assert.strictEqual(grantBody.action, 'granted_chimera_pro');

    // Verify entitlement endpoint
    const entitlementRes = await fetch(`${baseUrl}/api/user/new-subscriber-789/entitlements`);
    assert.strictEqual(entitlementRes.status, 200);
    const entitlementBody = (await entitlementRes.json()) as any;
    assert.strictEqual(entitlementBody.isPro, true);
    assert.deepStrictEqual(entitlementBody.entitlements, ['chimera_pro']);

    // 2. Revoke Pro via expiration webhook
    const revokeRes = await fetch(`${baseUrl}/api/webhooks/revenuecat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecret}`,
      },
      body: JSON.stringify({
        event: {
          type: 'EXPIRATION',
          app_user_id: 'new-subscriber-789',
          product_id: 'chimera_pro_annual',
          entitlement_ids: ['chimera_pro'],
        },
      }),
    });

    assert.strictEqual(revokeRes.status, 200);
    const revokeBody = (await revokeRes.json()) as any;
    assert.strictEqual(revokeBody.action, 'revoked_chimera_pro');

    // Verify user is no longer Pro
    const revokedCheck = await fetch(`${baseUrl}/api/user/new-subscriber-789/entitlements`);
    const revokedBody = (await revokedCheck.json()) as any;
    assert.strictEqual(revokedBody.isPro, false);
  });

  it('LLM Quote Integrity: accepts valid transcript quote, rejects and replaces fabricated quote', async () => {
    const { verifyAndSanitizeTranscriptQuote } = await import('./engine/combat-engine');

    const sampleTranscript: any[] = [
      { turnIndex: 1, speaker: 'opponent', content: 'What are your compensation expectations?' },
      { turnIndex: 2, speaker: 'user', content: 'I delivered 3 major client projects generating $450k in ARR.' },
      { turnIndex: 3, speaker: 'opponent', content: 'Our current budget is constrained.' },
      { turnIndex: 4, speaker: 'user', content: 'I guess maybe we could delay the increase until Q4.' },
    ];

    // Case 1: Valid transcript quote
    const validResult = verifyAndSanitizeTranscriptQuote(
      'I guess maybe we could delay the increase until Q4.',
      4,
      sampleTranscript
    );
    assert.strictEqual(validResult.wasReplaced, false);
    assert.strictEqual(validResult.verifiedQuote, 'I guess maybe we could delay the increase until Q4.');

    // Case 2: Fabricated quote that user never said
    const fabricatedResult = verifyAndSanitizeTranscriptQuote(
      'I completely give up and surrender my salary request.',
      4,
      sampleTranscript
    );
    assert.strictEqual(fabricatedResult.wasReplaced, true);
    // Must be replaced with genuine user turn from transcript
    assert.ok(
      sampleTranscript.some((t) => t.speaker === 'user' && t.content === fabricatedResult.verifiedQuote)
    );
  });
});
