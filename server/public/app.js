/* Workshop web UI client.
 *
 * Connects to /ws, submits queries, renders the orchestrator's streamed
 * activity into per-agent groups (orchestrator + each subagent gets its
 * own section). Pure vanilla JS — no build step.
 *
 * Each tool call is rendered as a single foldable <details> entry that
 * combines the start (args) and end (output) into one component. Collapsed
 * by default; click the summary to expand.
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

const TOOL_TO_SUBAGENT = {
  fetchRepoMetrics: "metrics-agent",
  fetchRecentIssues: "sentiment-agent",
  searchAdoptionSignals: "web-agent",
  askElasticAgent: "elastic-agent",
};

// runId → subagent dispatched (for the `task` tool's start/end pairing)
const taskRunToSubagent = new Map();

// runId → tool-call <details> element (for tool_start / tool_end pairing)
const pendingToolCalls = new Map();

let ws = null;

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.addEventListener("open", () => {
    appendSimpleEntry({ kind: "system", from: "system", text: "Connected." });
  });
  ws.addEventListener("close", () => {
    appendSimpleEntry({
      kind: "system",
      from: "system",
      text: "Connection closed. Reload to reconnect.",
    });
  });
  ws.addEventListener("error", (err) => {
    appendSimpleEntry({
      kind: "error",
      from: "system",
      text: `WebSocket error: ${err}`,
    });
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
    appendSimpleEntry({
      kind: "error",
      from: "system",
      text: "Not connected.",
    });
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
  pendingToolCalls.clear();
  $$(".agent-card").forEach((c) => {
    c.classList.remove("starting", "active", "done");
  });
}

function setAgentState(name, state) {
  const card = document.querySelector(`.agent-card[data-agent="${name}"]`);
  if (card) {
    card.classList.remove("starting", "active", "done");
    if (state) card.classList.add(state);
  }
  const group = document.querySelector(`.group[data-group="${name}"]`);
  if (group) {
    group.classList.remove("starting", "active", "done");
    if (state) group.classList.add(state);
  }
}

function getOrCreateGroup(name) {
  let group = document.querySelector(`.group[data-group="${name}"]`);
  if (group) return group;

  group = document.createElement("section");
  group.className = "group";
  group.dataset.group = name;

  const header = document.createElement("div");
  header.className = "group-header";

  const dot = document.createElement("span");
  dot.className = "group-dot";
  header.appendChild(dot);

  const label = document.createElement("span");
  label.className = "group-label";
  label.textContent = name;
  header.appendChild(label);

  const count = document.createElement("span");
  count.className = "group-count";
  count.textContent = "0";
  header.appendChild(count);

  group.appendChild(header);

  const body = document.createElement("div");
  body.className = "group-body";
  group.appendChild(body);

  activityEl.appendChild(group);
  return group;
}

function bumpGroupCount(group) {
  const count = group.querySelector(".group-count");
  const body = group.querySelector(".group-body");
  count.textContent = String(body.children.length);
}

/** Append a non-foldable line (system messages, intermediate text). */
function appendSimpleEntry({
  kind = "system",
  from = "orchestrator",
  text = "",
  code = "",
}) {
  const div = document.createElement("div");
  div.className = `entry ${kind} from-${from}`;

  const heading = document.createElement("div");
  heading.className = "kind";
  const kindSpan = document.createElement("span");
  kindSpan.textContent = kind.replace(/-/g, " ");
  heading.appendChild(kindSpan);
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

  const groupName = from === "system" ? "system" : from;
  const group = getOrCreateGroup(groupName);
  group.querySelector(".group-body").appendChild(div);
  bumpGroupCount(group);
  activityEl.scrollTop = activityEl.scrollHeight;
}

/**
 * Append a foldable tool-call entry. Returns the <details> element so the
 * caller can grab a reference if they want to update it later (we also
 * track it in `pendingToolCalls` keyed by runId).
 */
function startToolCall({ runId, tool, input, owner, label }) {
  const details = document.createElement("details");
  details.className = `entry tool-call from-${owner}`;

  const summary = document.createElement("summary");
  summary.className = "tool-call-summary";

  const labelSpan = document.createElement("span");
  labelSpan.className = "tool-name";
  labelSpan.textContent = label ?? `→ ${tool}`;
  summary.appendChild(labelSpan);

  const status = document.createElement("span");
  status.className = "tool-status";
  status.textContent = "⏳";
  summary.appendChild(status);

  details.appendChild(summary);

  const body = document.createElement("div");
  body.className = "tool-call-body";

  // Args section
  const argsSection = document.createElement("div");
  argsSection.className = "tool-section";
  const argsHead = document.createElement("h4");
  argsHead.textContent = "args";
  argsSection.appendChild(argsHead);
  const argsPre = document.createElement("pre");
  argsPre.textContent =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);
  argsSection.appendChild(argsPre);
  body.appendChild(argsSection);

  // Output section (placeholder, filled by completeToolCall)
  const outSection = document.createElement("div");
  outSection.className = "tool-section tool-output-section";
  const outHead = document.createElement("h4");
  outHead.textContent = "output";
  outSection.appendChild(outHead);
  const outPre = document.createElement("pre");
  outPre.className = "tool-output-pre";
  outPre.textContent = "(running…)";
  outSection.appendChild(outPre);
  body.appendChild(outSection);

  details.appendChild(body);

  if (runId) pendingToolCalls.set(runId, details);

  const groupName = owner === "system" ? "system" : owner;
  const group = getOrCreateGroup(groupName);
  group.querySelector(".group-body").appendChild(details);
  bumpGroupCount(group);
  activityEl.scrollTop = activityEl.scrollHeight;

  return details;
}

function completeToolCall({ runId, output, truncated }) {
  const entry = runId ? pendingToolCalls.get(runId) : null;
  if (!entry) return;

  const status = entry.querySelector(".tool-status");
  if (status) status.textContent = "✓";
  entry.classList.add("complete");

  const outPre = entry.querySelector(".tool-output-pre");
  if (outPre) {
    outPre.textContent =
      (output ?? "") + (truncated ? "\n\n(truncated)" : "");
  }

  pendingToolCalls.delete(runId);
}

function setFinal(text) {
  finalEl.classList.remove("placeholder");
  finalEl.textContent = text;
}

function unwrapToolInput(input) {
  if (
    input &&
    typeof input === "object" &&
    typeof input.input === "string"
  ) {
    try {
      return JSON.parse(input.input);
    } catch {
      return { input: input.input };
    }
  }
  return input;
}

function subagentFromTaskInput(input) {
  const inner = unwrapToolInput(input);
  if (!inner || typeof inner !== "object") return null;
  const candidate = inner.subagent_type ?? inner.subagentType ?? inner.name;
  return typeof candidate === "string" && KNOWN_SUBAGENTS.has(candidate)
    ? candidate
    : null;
}

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
      appendSimpleEntry({
        kind: "system",
        from: "system",
        text: `Query: ${p.query}`,
      });
      break;

    case "tool_start": {
      const inner = unwrapToolInput(p.input);

      if (p.tool === "task") {
        const sub = subagentFromTaskInput(p.input);
        if (sub) {
          if (p.runId) taskRunToSubagent.set(p.runId, sub);
          setAgentState(sub, "starting");
          // One foldable entry in the orchestrator's group
          startToolCall({
            runId: p.runId,
            tool: "task",
            input: inner,
            owner: "orchestrator",
            label: `→ dispatch ${sub}`,
          });
          // A short note in the subagent's own group too
          appendSimpleEntry({
            kind: "system",
            from: sub,
            text: "dispatched by orchestrator",
          });
          break;
        }
        // unknown subagent — log under orchestrator
        startToolCall({
          runId: p.runId,
          tool: "task",
          input: inner,
          owner: "orchestrator",
          label: "→ task (unrecognized subagent)",
        });
        break;
      }

      // Inner tool call. Attribute by tool name.
      const owner = attributeSubagent(p) ?? "orchestrator";
      if (KNOWN_SUBAGENTS.has(owner)) setAgentState(owner, "active");
      startToolCall({
        runId: p.runId,
        tool: p.tool,
        input: inner,
        owner,
        label: `→ ${p.tool}`,
      });
      break;
    }

    case "tool_end": {
      if (p.tool === "task") {
        const finished = p.runId ? taskRunToSubagent.get(p.runId) : null;
        if (finished) {
          taskRunToSubagent.delete(p.runId);
          setAgentState(finished, "done");
        }
      }
      completeToolCall({
        runId: p.runId,
        output: p.output_preview,
        truncated: p.truncated,
      });
      break;
    }

    case "model_decision":
      // SKIP — the subsequent tool_start events show the same info.
      break;

    case "message": {
      if (taskRunToSubagent.size === 0) {
        setFinal(p.content);
        appendSimpleEntry({
          kind: "message",
          from: "orchestrator",
          text: "orchestrator final synthesis",
          code:
            p.content.slice(0, 200) + (p.content.length > 200 ? "…" : ""),
        });
      } else {
        appendSimpleEntry({
          kind: "message",
          from: "orchestrator",
          text: "intermediate model message",
          code:
            p.content.slice(0, 200) + (p.content.length > 200 ? "…" : ""),
        });
      }
      break;
    }

    case "done":
      submitEl.disabled = false;
      submitEl.textContent = "Run agent";
      // Mark any tool calls that never got an end event
      pendingToolCalls.forEach((entry) => {
        const status = entry.querySelector(".tool-status");
        if (status) status.textContent = "—";
        const outPre = entry.querySelector(".tool-output-pre");
        if (outPre && outPre.textContent === "(running…)") {
          outPre.textContent = "(no end event received)";
        }
      });
      pendingToolCalls.clear();
      appendSimpleEntry({
        kind: "system",
        from: "system",
        text: "Run complete.",
      });
      break;

    case "error":
      submitEl.disabled = false;
      submitEl.textContent = "Run agent";
      appendSimpleEntry({ kind: "error", from: "system", text: p.error });
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
