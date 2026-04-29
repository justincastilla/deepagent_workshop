/**
 * Kibana Agent Builder client.
 *
 * Talks to `/api/agent_builder/converse` on a Kibana cluster running the
 * Agent Builder feature. The endpoint accepts natural-language input and
 * returns the agent's reply along with a `conversation_id` that can be
 * passed back in follow-up calls to maintain multi-turn context.
 *
 * AttendeeS: this is Build Step 1. The shapes are pre-declared so the
 * compiler can guide you. Find the `TODO` markers and fill them in. When
 * you're done, run:
 *
 *     npm run test:client
 *
 * If that prints a reply from the agent, you're cleared to move on to
 * Build Step 2.
 */

export type ConverseRequest = {
  /** The Kibana Agent Builder agent UUID (from .env: ELASTIC_AGENT_ID). */
  agentId: string;
  /** Natural-language input for the agent. */
  input: string;
  /** Optional. Pass to continue an existing multi-turn conversation. */
  conversationId?: string;
};

export type ConverseResponse = {
  /** The agent's text reply. */
  text: string;
  /** Conversation handle for follow-up turns. */
  conversationId: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Did you copy .env.example to .env and fill it in?`,
    );
  }
  return v;
}

/**
 * Send a natural-language prompt to the workshop's Kibana Agent Builder
 * instance and return the agent's reply.
 *
 * @example
 *   const { text, conversationId } = await converse({
 *     agentId: process.env.ELASTIC_AGENT_ID!,
 *     input: "Find technologies similar to 'real-time observability'",
 *   });
 */
export async function converse(req: ConverseRequest): Promise<ConverseResponse> {
  const kibanaUrl = requireEnv("KIBANA_URL");
  const apiKey = requireEnv("ELASTICSEARCH_API_KEY");

  // ------------------------------------------------------------------
  // TODO 1: build the request URL.
  //
  // The endpoint is:   <kibanaUrl>/api/agent_builder/converse
  // ------------------------------------------------------------------
  const url = ""; // <- replace

  // ------------------------------------------------------------------
  // TODO 2: build the request headers.
  //
  // Required headers for Kibana Agent Builder:
  //   Authorization:  ApiKey <apiKey>
  //   Content-Type:   application/json
  //   kbn-xsrf:       true        (Kibana requires this on non-GET endpoints)
  // ------------------------------------------------------------------
  const headers: Record<string, string> = {
    // <- fill in
  };

  // ------------------------------------------------------------------
  // TODO 3: build the request body.
  //
  // Shape (note: snake_case — Kibana's API uses snake_case keys):
  //   {
  //     agent_id: string,           // req.agentId
  //     input: string,              // req.input
  //     conversation_id?: string,   // req.conversationId, only if present
  //   }
  // ------------------------------------------------------------------
  const body: Record<string, unknown> = {
    // <- fill in
  };

  // ------------------------------------------------------------------
  // TODO 4: POST the request and parse the JSON response.
  //
  // Use the built-in `fetch` (Node 20+ has it). On non-2xx, throw an
  // error that includes the status code AND the response body — that
  // makes debugging during the workshop much easier.
  //
  // Expected Kibana response shape (we only care about two fields):
  //   {
  //     conversation_id: string,
  //     response: string,
  //     ... (other fields you can ignore)
  //   }
  //
  // Return:
  //   { text: <the response field>, conversationId: <the conversation_id field> }
  // ------------------------------------------------------------------
  throw new Error("converse() is not implemented yet — finish Build Step 1.");
}
