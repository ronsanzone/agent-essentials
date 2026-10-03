---
name: executor-usage
description: "Load before using Executor integrations: discover accounts, search/invoke or execute, and handle results using the live tool interface."
metadata:
  short-description: Required calling pattern for Executor
---

# Executor Usage

Read the live tool descriptions first. Executor has two interfaces; do not mix them. Pi currently uses **passthrough through Pi code mode**, with no general Executor execute/resume tools or fallback connection. Other clients can still expose Executor's execute sandbox.

## Passthrough: JSON search and invoke

1. Load the live `search-invoke` guide. In Pi code mode: `await tools.mcp__executor__skills({ name: "search-invoke" })`.
2. Discover accounts with `await tools.mcp__executor__integrations({})`. Use the exact integration, owner, and connection names returned; saved health does not guarantee a working credential.
3. Search with `await tools.mcp__executor__search({ query: "get authenticated user", integration: "github", limit: 5 })`. Read the selected match's full `inputSchema`.
4. Call `await tools.mcp__executor__invoke({ tool: match.id, arguments: { /* matches inputSchema */ } })`. Use the exact returned ID, including its `tools.` prefix; do not guess or convert it to a code string.

Pi's outer `tools` object contains agent/MCP tools, not Executor's sandbox helpers. `tools.search` and `tools.describe.tool` do not exist there; `searchTools`/`describeTool` discover the Pi-facing MCP tools, while `mcp__executor__search` discovers the integration catalog. OpenCode's outer code mode uses `tools.executor.skills`, `tools.executor.integrations`, `tools.executor.search`, and `tools.executor.invoke` when that server is configured for passthrough. If tools are exposed directly, call the live declared names instead.

- MCP results: check `isError`, then prefer `structuredContent`; otherwise parse a text content block as JSON. Invoke can return an execution envelope (`status`, `result`, `error`), and its result can itself contain the `{ ok, data }` union and upstream MCP content. Do not assume `result.login` without inspecting the shape.
- Both integrations and search page with `items`, `hasMore`, and `nextOffset`. Repeat the same filters/query with `offset: nextOffset`; upstream API pagination is separate.
- Batch local and remote calls in the host's code mode; no model-written inner Executor code string is needed. Filter results before returning them. Forward images/content deliberately instead of stringifying attachments.
- The client handles invoke approval; Executor block policies remain enforced. Tool-raised interactive prompts require native elicitation. Passthrough has no general resume fallback: if unsupported, report the limitation rather than inventing execute/resume or changing the config.
- Do not bypass a missing integration with `fetch` or ask for credentials in chat. Ask the user to reconnect an unhealthy account in Executor.

## Execute sandbox: when the client exposes it

Executor's sandbox exposes `tools` as a **lazy proxy over real integrations** (Jira, Confluence, Glean, GitHub, Evergreen, Grafana, Splunk, PagerDuty…). It is not enumerable: `Object.keys(tools)`, `tools()`, `globalThis`, or guessed namespaces (`tools.jira`) waste turns. Discover, describe, then call by the full address.

### Which `execute` do you have?

- **Claude Code / native MCP with `exposure: "direct"`:** `mcp__executor__execute`, plus `mcp__executor__resume` only for a paused run. Call directly with `{ code: "…" }`; there is no `mcp` gateway or JSON-string `args` wrapper. Pi's `/mcp` manages connections; `pi mcp list` checks them from a shell.
- **OpenCode v2 with `codemode: false`:** `executor_execute` / `executor_resume`.
- **OpenCode v2 code mode** (only a plain `execute` whose description says MCP tools are `tools.<server>.<tool>`): Executor is one level deeper. Set `"codemode": false` on the executor server in `opencode.json` and restart (`systemctl --user restart opencode2`). Fallback: nest the whole snippet — `return await tools.executor.execute({ code: \`…\` })`; `tools.search` does not exist at the outer level (`Unknown tool 'search'` means you called it there).

Read the live tool description before the first call; it is the session's source of truth, this skill is the stable summary.

### Calling model

```ts
const { items } = await tools.search({ query: "jira create issue", limit: 5 }); // short intent + key nouns
const path = items[0]?.path;                       // e.g. "jira.org.default.create_issue"
if (!path) return "No matching tool.";
const shape = await tools.describe.tool({ path }); // inputTypeScript / outputTypeScript — read before calling
const result = await tools[path]({ /* exact args from shape */ });
return unwrap(result);
```

```ts
const unwrap = (r: any) => {
  if (r?.ok === false) return r;
  const v = r?.ok === true ? r.data : r;
  if (v?.structuredContent) return v.structuredContent;
  const text = v?.content?.find?.((b: any) => b?.type === "text")?.text;
  if (typeof text !== "string") return v;
  try { return JSON.parse(text); } catch { return v; }
};
```

Rules, in order of how often they are broken:

1. **Search first** for any integration you have not called this session; pass an **object** (`{ query, limit }`), never a bare string.
2. **Describe before calling** an unfamiliar tool; never guess argument names or response shape. `includeSchemas` is no longer accepted.
3. **Call by the full `path`** returned by search/describe. Never `tools.linear`, `tools.mcp`, or other guessed namespaces.
4. **Unwrap** every result (`{ ok, data }` envelope, then `structuredContent`, then JSON text). Results are not plain JSON.
5. **Fetch once, filter in the sandbox.** Paginate/extract over the variable you hold; return only the distilled result. Never re-fetch the same resource for the next slice, never dump raw payloads into model context.
6. **Prefer an aggregate tool** that already combines the reads over rebuilding the chain.
7. **Writes are separate** from discovery and bulk reads unless the user approved the exact writes. Bulk writes go in one snippet with a loop, not N gated calls.
8. **No `fetch`** when Executor already has the integration.
9. Executor is for work **outside the repo**. Files, code, local tests: native tools.

### Call shapes

- **Direct** — one tool answers. Search, describe, call.
- **Composed** — later reads depend on earlier ones, or several independent reads should stay out of model context: one bounded snippet. Read [MULTI_STEP_WORKFLOWS.md](MULTI_STEP_WORKFLOWS.md) first for fan-out limits, error handling, and worked cases.
- **Interactive** — the next step needs user judgment or a write: return the evidence, make the next call separately.

### Pauses

`execute` handles approvals inline. Call `resume` only when `execute` returns an `executionId` it could not finish: `{ executionId, action: "accept", content: "{}" }` (Claude/pi native MCP: call `mcp__executor__resume` directly).
