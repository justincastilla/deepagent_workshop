/**
 * Kibana Agent Builder client — SOLUTION.
 *
 * Working answer key for Build Step 1. Drop-in replacement for the TODO
 * file at src/tools/kibanaClient.ts. Same imports, same exports.
 *
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

export async function converse(req: ConverseRequest): Promise<ConverseResponse> {
  const kibanaUrl = requireEnv("KIBANA_URL");
  const apiKey = requireEnv("ELASTICSEARCH_API_KEY");

  // 1. URL
  const url = `${kibanaUrl.replace(/\/$/, "")}/api/agent_builder/converse`;

  // 2. Headers
  const headers: Record<string, string> = {
    Authorization: `ApiKey ${apiKey}`,
    "Content-Type": "application/json",
    "kbn-xsrf": "true",
  };

  // 3. Body — note the snake_case keys (Kibana convention).
  const body: Record<string, unknown> = {
    agent_id: req.agentId,
    input: req.input,
  };
  if (req.conversationId) {
    body.conversation_id = req.conversationId;
  }

  // 4. POST + parse.
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Kibana Agent Builder returned ${res.status} ${res.statusText}: ${errorBody}`,
    );
  }

  const data = (await res.json()) as {
    conversation_id?: string;
    response?: string | { message?: string };
  };

  // The `response` field may be a string OR { message: string } depending
  // on the Kibana version. Handle both.
  const text =
    typeof data.response === "string"
      ? data.response
      : (data.response?.message ?? "");

  return {
    text,
    conversationId: data.conversation_id ?? "",
  };
}
