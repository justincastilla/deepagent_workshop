/**
 * LLM factory — single source of truth for how the workshop talks to a model.
 *
 * Every subagent and the orchestrator construct their model via createLLM().
 * The model client is a standard LangChain ChatOpenAI pointed at the workshop's
 * LiteLLM proxy via configuration.baseURL. The proxy speaks the OpenAI HTTP
 * API but routes UPSTREAM to a Claude Sonnet deployment hosted on Azure AI
 * Foundry.
 *
 * Why this matters: Attendees never need their own API key. They paste a
 * workshop-issued LITELLM_API_KEY + LITELLM_API_BASE into .env and everything
 * downstream Just Works.
 */

import { ChatOpenAI } from "@langchain/openai";

export type CreateLLMOptions = {
  /** Model alias to use. Defaults to LLM_MODEL from env. */
  model?: string;
  /** Sampling temperature. Defaults to 0.5. */
  temperature?: number;
  /** Maximum output tokens. */
  maxTokens?: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill in the values from your instructor.`,
    );
  }
  return value;
}

/**
 * Build a ChatOpenAI client pointed at the workshop LiteLLM proxy.
 *
 * @example Default model (Sonnet via the workshop proxy)
 *   const llm = createLLM();
 *
 * @example Override model alias for an experimental subagent
 *   const llm = createLLM({ model: "llm-gateway/some-other-alias" });
 */
export function createLLM(opts: CreateLLMOptions = {}): ChatOpenAI {
  const apiKey = requireEnv("LITELLM_API_KEY");
  const baseURL = requireEnv("LITELLM_API_BASE");

  const model =
    opts.model ?? process.env.LLM_MODEL ?? "llm-gateway/claude-sonnet-4-5";

  return new ChatOpenAI({
    apiKey,
    configuration: { baseURL },
    model,
    temperature: opts.temperature ?? 0.5,
    maxTokens: opts.maxTokens,
  });
}
