<!--
================================================================================
TODO: write the system prompt for the Elastic subagent.

A good prompt for this subagent should cover:

  1. Identity — who is this agent?
       e.g. "You are an Elastic Data Specialist."

  2. Mission — what is its job?
       Retrieve research data from Elasticsearch by sending natural-language
       requests to the Elastic Agent via askElasticAgent.

  3. Tool guidance — how should it use askElasticAgent well?
       - Always be specific (full repo names, explicit time ranges, intent)
       - Pass conversationId for multi-turn follow-ups
       - DON'T try to construct ES|QL itself — that's the Agent Builder's job

  4. Output format — what should it return to the orchestrator?
       A suggested structure:
         ## Elasticsearch Research Summary
         ### Data Retrieved
         ### Key Findings
         ### Gaps

  5. Honesty rule — never fabricate. If the agent returns no data, report
     that clearly so the orchestrator can trigger fresh research.

The Python original's system_prompt is a strong reference — your instructor
has it on screen. You can pattern-match it or write your own; what matters
is that the prompt clearly communicates the role, the tool, and the output
expectations.

Replace this entire comment block with your prompt.
================================================================================
-->

You are an Elastic Data Specialist.

(Write the rest of your prompt here.)
