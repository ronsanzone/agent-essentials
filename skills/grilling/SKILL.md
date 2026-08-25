---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, says "grill me", or asks to be interviewed before acting. Modes: default (one question at a time), batch (whole frontier per round), docs (also maintain the domain model).
---

Interview the user relentlessly about every aspect of this until you reach a shared understanding. Map it as a decision tree: every decision branches into the decisions that hang off it. Walk the branches, resolving dependencies one by one. For each question, give your recommended answer — the user mostly accepts with one word, so make the recommendation good.

Facts are your job, never the user's. If a fact can be found in the environment (filesystem, tools, docs), look it up — dispatch a sub-agent if it's slow, and keep asking questions that don't depend on it. The *decisions* are the user's: put each one to them and wait.

Do not act until the user confirms you have reached a shared understanding.

## Modes

Pick the mode from how the user asked; default if unclear.

- **default** — one question per message. Wait for the answer before the next. Several questions at once is bewildering.
- **batch** (`/grilling batch`, "ask everything at once", "round by round") — the frontier is every decision whose prerequisites are settled. Ask the whole frontier in one numbered round with a recommended answer per question, then wait. Each answer reshapes the tree; recompute the frontier and ask the next round. A question that depends on another still-open question belongs to a later round. Done when the frontier is empty.
- **docs** (`/grilling docs`, "grill with docs", "and keep the ADRs/glossary updated") — run the interview and, as decisions settle, record them with the `domain-modeling` skill (CONTEXT.md glossary + ADRs). Record a decision once it is settled, not while it is still open.
