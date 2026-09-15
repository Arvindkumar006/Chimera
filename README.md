# Chimera Combat ⚔️
> **Train for conversations that matter.**  
> *The flight simulator for difficult conversations.*

Built for **RevenueCat Shipaton 2026** (Devpost Global Mobile Hackathon).

---

## 🎯 What is Chimera Combat?

Chimera Combat is a conversational flight simulator designed to help professionals, founders, and managers master high-stakes real-world discussions before the stakes become real.

Instead of a passive chatbot or an AI roleplay toy, Chimera operates as an **adaptive adversarial training simulator**:
* **Real Adaptive Opponents**: Each opponent has a distinct psychological archetype (The Skeptic, The Bulldozer, The Diplomat, The Hothead, The Passive-Aggressor, The Interrogator, The Negotiator, The Gatekeeper).
* **Live Dynamic State Vectors**: Opponents maintain real-time emotional and tactical state ($\text{Trust}$, $\text{Frustration}$, $\text{Cooperation}$, $\text{Pressure}$, $\text{Resistance}$, $\text{Respect}$).
* **3-Phase Pacing**: Battles transition through **Opening $\rightarrow$ Pressure $\rightarrow$ Critical Moment Climax**.
* **Two-Tier Deterministic Evaluation**:
  * **Tier 1 (LLM Feature Extractor)**: Audits dialogue to extract evidence citations, hedging instances, defensive apologies, and boundary holds.
  * **Tier 2 (Deterministic Rules Engine)**: Computes 100% reproducible, auditable 0–100 Combat Scores across 8 scenario-calibrated dimensions without LLM grading drift.
* **Instant Rematch Loop**: Immediately replay against the same opponent with previous score ghost line comparison ($72 \rightarrow 84$, $+12\text{ Improvement}$).
* **RevenueCat Monetization**: Native integration of RevenueCat (`react-native-purchases`) powering dynamic paywalls, `chimera_pro` entitlement gating, in-app purchases, and restore flows.

---

## 📁 Repository Structure

```
REVENYECAT/
├── shared/               # Pure TypeScript types, Zod schemas, 8 master scenarios, 8 personas, and Deterministic Scoring Engine
│   ├── src/types/        # CombatSession, OpponentState, TranscriptTurn, Evaluation
│   ├── src/schemas/      # Zod validation schemas
│   ├── src/personas/     # The 8 Opponent Personas with triggers & escalation policies
│   ├── src/scenarios/    # The 8 Master Battle Scenarios with dimension weights
│   └── src/scoring/      # Deterministic Mathematical Scoring Engine & Unit Tests
├── server/               # Secure Backend Engine & AI Orchestration Layer
│   ├── src/ai/           # Pluggable AIProviderGateway (Groq, OpenAI, Gemini, Anthropic)
│   ├── src/engine/       # Combat State Machine, Turn Processor, Rematch Manager
│   ├── src/monetization/ # RevenueCat Webhook handler & Entitlement verification
│   └── src/server.ts     # Express REST & SSE Streaming API
└── client/               # React Native Expo Native Application
    ├── App.tsx           # Navigation & Session Lifecycle
    ├── src/theme/        # Cyber-Executive dark tactical theme tokens
    ├── src/screens/      # CombatScreen, AnalysisScreen, HomeScreen
    ├── src/components/   # TacticalHUD, DialogueFeed, PaywallModal
    └── src/services/     # CombatApi, PurchasesService (RevenueCat), AnalyticsService
```

---

## 🚀 Running Locally

### 1. Run Shared Unit Tests
```bash
npm run test:scoring
```
Validates that deterministic mathematical scoring produces 100% identical outputs for identical inputs, bounds scores to $[0, 100]$, and applies scenario-specific weights.

### 2. Start Backend Engine
```bash
cd server
npm install
npm run build
npm start
```
Starts backend server on `http://localhost:3001` with health checks at `/health`.

### 3. Run Backend Integration Tests
```bash
cd server
node --test dist/server.test.js
```
Runs end-to-end integration tests verifying battle initialization, turn processing, state mutation, Two-Tier evaluation, rematch delta tracking, and RevenueCat webhook entitlement unlocking.

### 4. Start Mobile Client (Expo)
```bash
cd client
npm start
```
Launch in iOS Simulator, Android Emulator, or Web browser (`w`).

---

## 💳 RevenueCat Integration Details

* **Entitlement Identifier:** `chimera_pro`
* **Dynamic Offerings:** Queried from RevenueCat (`$rc_monthly`, `$rc_annual`, `$rc_lifetime`) with zero hardcoded pricing in client business logic.
* **Paywall:** Custom dynamic Paywall ("Become Harder To Beat") triggered dynamically based on weakest skill analysis.
* **Receipt Verification & Webhooks:** Server listens on `/api/webhooks/revenuecat` to process `INITIAL_PURCHASE`, `RENEWAL`, and `CANCELLATION` events.

---

## 🏆 Shipaton Award Alignments

1. **Grand Prize:** Full viral loop ($\text{Battle} \rightarrow \text{Score} \rightarrow \text{Debrief} \rightarrow \text{Rematch} \rightarrow \text{Improvement}$).
2. **HAMM Award (Help Apps Make Money):** High-converting dynamic paywall triggered by personalized skill deficiency.
3. **RevenueCat Design Award:** Cyber-Executive dark tactical cockpit UI with live haptic tension feedback and 60fps state meters.
4. **Influencer Award (Career Coaching: Leadership Heather):** Directly simulates difficult managerial conversations (Salary, Saying No, Performance Review, Scope Creep).
5. **OneSignal (Keep Them Coming Back Award):** Daily Combat 2-minute habit loop with push reminders.

---

## ⚖️ License
UNLICENSED — Built exclusively for RevenueCat Shipaton 2026.
