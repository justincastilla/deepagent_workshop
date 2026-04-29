/* Workshop web UI client.
 *
 * Connects to /ws, submits queries, renders the orchestrator's streamed
 * activity into the activity panel and the final reply into the final
 * panel. Pure vanilla JS — no build step.
 *
 * Two visual conventions:
 *   1. Each agent card's dot transitions through idle → starting → active
 *      → done as the orchestrator dispatches and the subagent completes.
 *   2. Each activity entry's left border is colored by the subagent it
 *      came from (orchestrator / metrics / sentiment / web / elastic), so
 *      you can visually correlate "what produced this".
 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const queryEl = $("#query");
const submitEl = $("#submit");
const activityEl = $("#activity");
const finalEl = $("#final");

const KNOWN_SUBAGENTS = new Set([
  "metrics-agent",
  "sentiment-agent",
  "web-agent",
  "elastic-agent",
]);

// Each subagent owns a unique tool. When we see that tool fire, we know
// which subagent's loop it came from. This is how we attribute parallel
// subagents' inner events correctly.
const TOOL_TO_SUBAGENT = {
  fetchRepoMetrics: "metrics-agent",
  fetchRecentIssues: "sentiment-agent",
  searchAdoptionSignals: "web-agent",
  askElasticAgent: "elastic-agent",
};

// Map task-tool run IDs to the subagent they dispatched. Populated on
// `task` tool_start, consumed on `task` tool_end so we know who finished.
const taskRunToSubagent = new Map();

let ws = null;

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.addEventListener("open", () => {
    appendEntry({ kind: "system", text: "Connected." });
  });

  ws.addEventListener("close", () => {
    appendEntry({
      kind: "system",
      text: "Connection closed. Reload to reconnect.",
    });
  });

  ws.addEventListener("error", (err) => {
    appendEntry({ kind: "error", text: `WebSocket error: ${err}` });
  });

  ws.addEventListener("message", (ev) => {
    let payload;
    try {
      payload = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleEvent(payload);
  });
}

function send(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    appendEntry({ kind: "error", text: "Not connected." });
    return false;
  }
  ws.send(JSON.stringify(payload));
  return true;
}

function clearOutput() {
  activityEl.innerHTML = "";
  finalEl.classList.add("placeholder");
  finalEl.textContent = "(the orchestrator's final reply will appear here)";
  taskRunToSubagent.clear();
  $$(".agent-card").forEach((c) => {
    c.classList.remove("starting", "active", "done");
  });
}

function setAgentState(name, state) {
  if (!KNOWN_SUBAGENTS.has(name)) return;
  const card = document.querySelector(`.agent-card[data-agent="${name}"]`);
  if (!card) return;
  card.classList.remove("starting", "active", "done");
  if (state) card.classList.add(state);
}

function appendEntry({
  kind = "system",
  from = "system",
  text = "",
  code = "",
  target = "",
}) {
  const div = document.createElement("div");
  div.className = `entry ${kind} from-${from}`;

  const heading = document.createElement("div");
  heading.className = "kind";

  const kindSpan = document.createElement("span");
  kindSpan.textContent = kind.replace(/-/g, " ");
  heading.appendChild(kindSpan);

  if (from && from !== "system") {
    const fromSpan = document.createElement("span");
    fromSpan.className = "from-label";
    fromSpan.textContent = `· ${from}`;
    heading.appendChild(fromSpan);
  }

  if (target) {
    const tg = document.createElement("span");
    tg.className = "target";
    tg.textContent = target;
    heading.appendChild(tg);
  }

  div.appendChild(heading);

  if (text) {
    const p = document.createElement("div");
    p.textContent = text;
    div.appendChild(p);
  }
  if (code) {
    const pre = document.createElement("pre");
    pre.textContent = code;
    div.appendChild(pre);
  }
  activityEl.appendChild(div);
  activityEl.scrollTop = activityEl.scrollHeight;
}

function setFinal(text) {
  finalEl.classList.remove("placeholder");
  finalEl.textContent = text;
}

/**
 * deepagents wraps each tool's input as `{ input: "<JSON-encoded string>" }`.
 * This unwraps it to the actual args object the LLM produced.
 */
function unwrapToolInput(input) {
  if (
    input &&
    typeof input === "object" &&
    typeof input.input === "string"
  ) {
    try {
      return JSON.parse(input.input);
    } catch {
      // Not JSON — return the raw inner string under a known key.
      return { input: input.input };
    }
  }
  return input;
}

/** Pull subagent_type from a `task` tool's input shape. */
function subagentFromTaskInput(input) {
  const inner = unwrapToolInput(input);
  if (!inner || typeof inner !== "object") return null;
  const candidate = inner.subagent_type ?? inner.subagentType ?? inner.name;
  return typeof candidate === "string" && KNOWN_SUBAGENTS.has(candidate)
    ? candidate
    : null;
}

/**
 * Given an inbound event, decide which subagent (if any) owns it.
 * Strategy: if it's a known per-subagent tool, attribute by tool name.
 * Otherwise, fall back to "orchestrator".
 */
function attributeSubagent(p) {
  if (p.tool && TOOL_TO_SUBAGENT[p.tool]) {
    return TOOL_TO_SUBAGENT[p.tool];
  }
  return null;
}

function handleEvent(p) {
  switch (p.type) {
    case "started":
      submitEl.disabled = true;
      submitEl.textContent = "Running…";
      appendEntry({ kind: "system", from: "system", text: `Query: ${p.query}` });
      break;

    case "tool_start": {
      if (p.tool === "task") {
        // Subagent dispatch.
        const sub = subagentFromTaskInput(p.input);
        if (sub) {
          if (p.runId) taskRunToSubagent.set(p.runId, sub);
          setAgentState(sub, "starting");
          const inner = unwrapToolInput(p.input);
          appendEntry({
            kind: "tool-start",
            from: sub,
            text: `Dispatching subagent: ${sub}`,
            code:
              typeof inner === "string"
                ? inner
                : JSON.stringify(inner, null, 2),
          });
          break;
        }
        appendEntry({
          kind: "tool-start",
          from: "orchestrator",
          target: "→ task (unrecognized subagent)",
          code: JSON.stringify(p.input, null, 2),
        });
        break;
      }

      // Inner tool call — attribute by tool name.
      const owner = attributeSubagent(p);
      if (owner) setAgentState(owner, "active");
      const innerInput = unwrapToolInput(p.input);
      appendEntry({
        kind: "tool-start",
        from: owner ?? "orchestrator",
        target: `→ ${p.tool}`,
        code:
          typeof innerInput === "string"
            ? innerInput
            : JSON.stringify(innerInput, null, 2),
      });
      break;
    }

    case "tool_end": {
      if (p.tool === "task") {
        // Subagent done. Look up by runId.
        const finished = p.runId ? taskRunToSubagent.get(p.runId) : null;
        if (finished) {
          taskRunToSubagent.delete(p.runId);
          setAgentState(finished, "done");
        }
        appendEntry({
          kind: "tool-end",
          from: finished ?? "orchestrator",
          target: `← ${finished ?? "task"} complete${p.truncated ? " (truncated)" : ""}`,
          code: p.output_preview,
        });
        break;
      }
      const owner = attributeSubagent(p);
      appendEntry({
        kind: "tool-end",
        from: owner ?? "orchestrator",
        target: `← ${p.tool}${p.truncated ? " (truncated)" : ""}`,
        code: p.output_preview,
      });
      break;
    }

    case "model_decision": {
      // Decisions can come from either the orchestrator or a subagent's LLM.
      // We can't always tell, but if the tool calls are all known per-subagent
      // tools, attribute to that subagent.
      const calls = p.tool_calls ?? [];
      const ownerCandidates = new Set(
        calls.map((tc) => TOOL_TO_SUBAGENT[tc.name]).filter(Boolean),
      );
      const from =
        ownerCandidates.size === 1 ? [...ownerCandidates][0] : "orchestrator";
      const summary = calls
        .map((tc) => `${tc.name}(${JSON.stringify(tc.args)})`)
        .join("\n");
      appendEntry({
        kind: "model-decision",
        from,
        text: "model is calling tools",
        code: summary,
      });
      break;
    }

    case "message": {
      // Orchestrator-level final synthesis goes to the right panel.
      // Subagent-level intermediate messages just log.
      if (taskRunToSubagent.size === 0) {
        // No subagents in flight — must be the orchestrator.
        setFinal(p.content);
        appendEntry({
          kind: "message",
          from: "orchestrator",
          text: "orchestrator final synthesis",
          code: p.content.slice(0, 200) + (p.content.length > 200 ? "…" : ""),
        });
      } else {
        appendEntry({
          kind: "message",
          from: "orchestrator",
          text: "intermediate model message",
          code: p.content.slice(0, 200) + (p.content.length > 200 ? "…" : ""),
        });
      }
      break;
    }

    case "done":
      submitEl.disabled = false;
      submitEl.textContent = "Run agent";
      appendEntry({ kind: "system", from: "system", text: "Run complete." });
      break;

    case "error":
      submitEl.disabled = false;
      submitEl.textContent = "Run agent";
      appendEntry({ kind: "error", from: "system", text: p.error });
      break;
  }
}

submitEl.addEventListener("click", () => {
  const query = queryEl.value.trim();
  if (!query) return;
  clearOutput();
  send({ query });
});

queryEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    submitEl.click();
  }
});

connect();
