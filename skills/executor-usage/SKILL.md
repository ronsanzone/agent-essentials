---
name: executor-usage
description: >-
  Load this skill before calling Executor's `execute` function, either as a direct
  tool or through an MCP gateway. Teaches the sandbox calling model: discover with
  `tools.search({ query, limit })`, inspect with `tools.describe.tool({ path })`,
  then call real tools by full address. Covers direct calls and composed, bounded
  read workflows for SaaS APIs, remote systems, MCP/OpenAPI/GraphQL integrations,
  and auth/approval-managed actions.
metadata:
  short-description: Required calling pattern for Executor execute
---

# Executor Usage

Use this skill before any `execute` call.

It exists because Executor's sandbox is a **lazy proxy over real tools**, not a normal JS object. Naive probing (`Object.keys(tools)`, `globalThis`, `tools()`, random namespace guesses) is misleading and wastes turns.

## Invoke Executor

Use the tool surface exposed by the current host:

- **Direct MCP tools** (for example Claude Code): call `mcp__executor__execute` and, only for a paused run, `mcp__executor__resume`.
- **Pi with `pi-mcp` proxy mode:** describe `executor_execute` through `mcp`, then call it through the gateway. The gateway's `args` field is a JSON object string.

```js
mcp({ describe: "executor_execute" })
mcp({ tool: "executor_execute", args: '{"code":"return 2 + 2"}' })
```

Tool names can differ if the MCP server name changes. Search for `execute` instead of guessing when `executor_execute` is absent.

## Source of truth

Before calling Executor, inspect the current tool definition. For a direct tool, read its description. For Pi proxy mode, call `mcp({ describe: "executor_execute" })`. The live definition is the session-specific source of truth; this skill is the stable summary.

## Mental model

Inside an `execute` snippet:

- The `tools` object is a **lazy proxy**. It is not enumerable. Do not probe it.
- You **discover** tools with built-in helpers, then call the real tool by its full address.
- The address is returned by `tools.search` / `tools.describe.tool` as a `path` like `"github.ronsanzone.personal.issues.list"`. Call it as `tools[path]`.
- Stable built-in helpers:
  - `tools.search({ query, namespace?, limit? })` → ranked matches
  - `tools.describe.tool({ path })` → compact `inputTypeScript` / `outputTypeScript`
- Inventory helpers change across Executor versions. Use one only when the current `execute` tool instructions advertise it.

## Choose the call shape

- **Direct:** one tool answers the request. Search, describe, then call it.
- **Aggregate:** a domain tool already combines the needed reads. Prefer it over rebuilding the same chain.
- **Composed:** later reads depend on earlier results, several independent reads can run in parallel, or intermediate results should stay out of model context. Use one bounded `execute` snippet.
- **Interactive:** the next step needs user judgment, approval, or a write. Return the evidence first; make the next call separately.

For a composed workflow, read [`MULTI_STEP_WORKFLOWS.md`](MULTI_STEP_WORKFLOWS.md) before writing the snippet. It contains the fan-out limits, error handling, and detailed use cases. A stricter caller-specific playbook takes priority.

## Required workflow

Follow this order unless you already know the exact path and shape with high confidence.

1. **Search** for the tool by short intent phrase + key nouns.
2. **Pick** the best path. Prefer an aggregate tool that covers the whole need.
3. **Describe** every unfamiliar tool you will call.
4. **Choose** direct, aggregate, composed, or interactive execution.
5. **Call** each tool via the full `tools[path]` address.
6. **Unwrap** MCP-style content blocks and return only the useful result.

## Canonical pattern

```ts
const { items: matches } = await tools.search({ query: "github issues", limit: 5 });
const path = matches[0]?.path;
if (!path) return "No matching tools found.";

const details = await tools.describe.tool({ path });
// details.inputTypeScript / details.outputTypeScript give you the exact shape.

const result = await tools[path]({ owner: "octocat", repo: "Hello-World" });
return result;
```

## Unwrapping MCP results

MCP-backed tools often return:

```ts
{ content: [{ type: "text", text: "{...json...}" }], structuredContent?: {...} }
```

Prefer `structuredContent`. Otherwise parse the first text block if it looks like JSON.

```ts
const unwrap = (result: any) => {
  if (result?.ok === false) return result;
  const value = result?.ok === true ? result.data : result;
  if (value?.structuredContent) return value.structuredContent;
  const text = value?.content?.find?.((b: any) => b?.type === "text")?.text;
  if (typeof text !== "string") return value;
  try { return JSON.parse(text); } catch { return value; }
};

return unwrap(await tools[path](args));
```

## Hard rules

### Required

- Always start with `tools.search({ query, ... })` for unknown integrations.
- Always pass an **object** to helper tools (`{ query, limit }`, never a bare string).
- Always call the real tool via the **full address** returned by `tools.search` / `tools.describe.tool`.
- Use `tools.describe.tool({ path })` before invoking unfamiliar tools.
- Prefer a domain aggregate tool before composing lower-level calls.
- Bound read fan-out and trim the final result; load `MULTI_STEP_WORKFLOWS.md` for the defaults.
- Keep writes separate from discovery and bulk-read snippets unless the user approved the exact writes.

### Forbidden

- Do not call `tools()` as a function.
- Do not probe with `Object.keys(tools)`, `for...in tools`, or rely on `globalThis`.
- Do not guess namespaces from property names like `tools.linear` or `tools.mcp`.
- Do not pass a string to `tools.search`; pass an object.
- Do not use `includeSchemas` on `tools.describe.tool`; that parameter is no longer accepted.
- Do not assume tool results are already plain JSON — always unwrap.
- Do not use `fetch` when Executor already has the integration you need.

## Decision rule

- **Executor** is for work **outside the repo**: SaaS APIs, remote systems, configured MCP/OpenAPI/GraphQL, auth/approval-managed actions.
- **Pi's native file tools** (`read`, `edit`, `write`, `bash`, etc.) are for work **inside the repo**: reading files, editing code, refactors, local tests and builds.

## Interaction rule

Let `execute` handle any Executor interaction inline. Only call `resume` if `execute` explicitly returns an `executionId` for a paused interaction that it could not finish inline.

In Pi proxy mode, resume through the gateway:

```js
mcp({
  tool: "executor_resume",
  args: '{"executionId":"<id>","action":"accept","content":"{}"}'
})
```

## Recovery checklist

If an `execute` snippet behaves strangely:

1. Did you load this skill before using `execute`?
2. Did you call `tools.search({ ... })` instead of guessing?
3. Did you pass an object to helper tools?
4. Did you `tools.describe.tool({ path })` before calling an unfamiliar tool?
5. Did you call the real tool via the full `path` (not a guessed namespace)?
6. Did you unwrap the `{ ok, data }` envelope, then `structuredContent` / JSON text?
7. If this was multi-step, did you prefer an aggregate tool and bound the fan-out?
