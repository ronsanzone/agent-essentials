---
name: executor-usage
description: "Load before any Executor execute call (Claude mcp__executor__execute, pi/OpenCode executor_execute): search, describe, then call by full path."
metadata:
  short-description: Required calling pattern for Executor execute
---

# Executor Usage

Executor's sandbox exposes `tools` as a **lazy proxy over real integrations** (Jira, Confluence, Glean, GitHub, Evergreen, Grafana, Splunk, PagerDuty…). It is not enumerable: `Object.keys(tools)`, `tools()`, `globalThis`, or guessed namespaces (`tools.jira`) waste turns. Discover, describe, then call by the full address.

## Which `execute` do you have?

- **Claude Code:** `mcp__executor__execute`, plus `mcp__executor__resume` only for a paused run.
- **pi (pi-mcp proxy) / OpenCode v2 with `codemode: false`:** `executor_execute` / `executor_resume`. In pi: `mcp({ describe: "executor_execute" })` then `mcp({ tool: "executor_execute", args: '{"code":"…"}' })` — `args` is a JSON string.
- **OpenCode v2 code mode** (only a plain `execute` whose description says MCP tools are `tools.<server>.<tool>`): Executor is one level deeper. Set `"codemode": false` on the executor server in `opencode.json` and restart (`systemctl --user restart opencode2`). Fallback: nest the whole snippet — `return await tools.executor.execute({ code: \`…\` })`; `tools.search` does not exist at the outer level (`Unknown tool 'search'` means you called it there).

Read the live tool description before the first call; it is the session's source of truth, this skill is the stable summary.

## Calling model

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

## Call shapes

- **Direct** — one tool answers. Search, describe, call.
- **Composed** — later reads depend on earlier ones, or several independent reads should stay out of model context: one bounded snippet. Read [MULTI_STEP_WORKFLOWS.md](MULTI_STEP_WORKFLOWS.md) first for fan-out limits, error handling, and worked cases.
- **Interactive** — the next step needs user judgment or a write: return the evidence, make the next call separately.

## Pauses

`execute` handles approvals inline. Call `resume` only when `execute` returns an `executionId` it could not finish: `{ executionId, action: "accept", content: "{}" }` (pi: via `mcp({ tool: "executor_resume", args: '…' })`).
