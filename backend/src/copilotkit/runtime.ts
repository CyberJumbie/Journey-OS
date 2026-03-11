/**
 * P1-008: CopilotKit Runtime — Express integration with LangGraph dev server
 *
 * Configures CopilotRuntime with:
 * - AnthropicAdapter for TEXT_MESSAGE streaming (chat)
 * - LangGraphAgent for STATE_DELTA streaming (coagent)
 *
 * The LangGraph dev server runs at localhost:2024 (via `langgraph dev`).
 * CopilotKit connects to it via LangGraphAgent, enabling useCoAgent
 * on the frontend to receive real-time STATE_DELTA events.
 *
 * Mounted at POST /api/copilotkit in the Express server.
 */

import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNodeExpressEndpoint,
} from '@copilotkit/runtime';
import { LangGraphAgent } from '@copilotkit/runtime/langgraph';
import AnthropicClient from '../lib/AnthropicClient';
import type { Request, Response } from 'express';

// ── Anthropic adapter ───────────────────────────────────────────────────────────
// Uses the ANTHROPIC_API_KEY from env (Anthropic SDK reads it automatically).
// Haiku for cheap ops per Rule 6.

const anthropicClient = AnthropicClient.getInstance();

const serviceAdapter = new AnthropicAdapter({
  anthropic: anthropicClient,
  model: 'claude-haiku-4-5',
});

// ── LangGraph dev server URL ────────────────────────────────────────────────────
// Default: localhost:2024 (standard langgraph dev port)
// Override via LANGGRAPH_URL env var for deployed environments.

const LANGGRAPH_URL =
  process.env.LANGGRAPH_URL ?? 'http://localhost:2024';

// ── CopilotKit Runtime ──────────────────────────────────────────────────────────
// Registers the LangGraph agent directly in the agents map.
// The "journey_generation" name maps to the graph ID in langgraph.json.
// useCoAgent({ name: 'journey_generation' }) on the frontend receives STATE_DELTA.

const journeyAgent = new LangGraphAgent({
  deploymentUrl: LANGGRAPH_URL,
  graphId: 'journey_generation',
});

const runtime = new CopilotRuntime({
  agents: {
    default: journeyAgent,
    journey_generation: journeyAgent,
  },
});

// ── Express handler ─────────────────────────────────────────────────────────────
// Creates the Express-compatible request handler for POST /api/copilotkit.

export const copilotKitHandler = copilotRuntimeNodeExpressEndpoint({
  runtime,
  serviceAdapter,
  endpoint: '/api/copilotkit',
});

/**
 * Express route handler for POST /api/copilotkit.
 * Delegates to the CopilotKit runtime endpoint handler.
 */
export function handleCopilotKit(req: Request, res: Response): void {
  const handler = copilotKitHandler;
  void handler(req, res);
}
