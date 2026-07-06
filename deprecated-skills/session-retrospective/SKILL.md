---
name: session-retrospective
description: Use when a session is ending and you want to analyze process efficiency. Triggers on requests to review how a session went, evaluate context usage, or identify workflow improvements.
disable-model-invocation: true
---

# Session Retrospective

Analyze the current session's process efficiency and write a scored report.

**Announce at start:** "Starting session retrospective..."

## Setup

1. Derive repo: `basename $(git remote get-url origin 2>/dev/null | sed 's/.git$//') 2>/dev/null || basename $(pwd)`
2. Create report directory: `mkdir -p ~/notes/retrospectives/<repo>/`
3. Report path: `~/notes/retrospectives/<repo>/YYYY-MM-DD-HHMMSS.md`

## Step 1: Collect Supplementary Metrics

Run in parallel via Bash:

```bash
# Git activity during session
git log --oneline --since="2 hours ago"
```

```bash
# Available skills (for missed-opportunity detection in Step 3)
ls ~/.claude/skills/ 2>/dev/null && ls ~/.claude/plugins/cache/*/skills/ 2>/dev/null
```

If cost/token data is available from the CLI, collect it. If unavailable, note "cost data unavailable" and estimate from context.

## Step 2: Analyze Session

Review the full conversation context. For each category below, assign a score and cite specific examples.

### Scoring Rubric

| Score | Meaning |
|-------|---------|
| 5 | Excellent — near-optimal, minimal waste |
| 4 | Good — mostly effective, minor improvements |
| 3 | Adequate — functional but notable inefficiencies |
| 2 | Below average — significant missed opportunities |
| 1 | Poor — major process failures or waste |

**Grades:** 4–5 = 🟢, 3 = 🟡, 1–2 = 🔴

---

### Category 1: Context Engineering

**Good signals:** Subagents for discrete research, Read with offset/limit on large files, minimal re-reads, skills loaded only when relevant, parallel tool calls.

**Bad signals:** Multiple Reads of same file, large reads without offset/limit, Grep/Glob instead of Explore agent for open-ended searches, irrelevant skills loaded, TaskOutput called on background agents (loads full transcript).

---

### Category 2: Tool Usage

**Good signals:** Read (not Bash cat), Edit (not Bash sed), Explore agent for open-ended questions, skills invoked when applicable, parallel calls for independent ops.

**Bad signals:** Bash for file reading/editing, Grep/Glob for broad exploration, available skills not invoked (compare against Step 1 list), sequential calls that could parallelize, tools returning no useful information.

Include a tool inventory: tool name, approximate count, effectiveness.

---

### Category 3: Sub-agent Work

**Good signals:** Research delegated to Explore agents, complex tasks to general-purpose agents, background agents for builds/tests, appropriate agent types chosen, results used without re-doing work.

**Bad signals:** Long exploration in main context (should have delegated), TaskOutput on background agents, subagents needing excessive steering (unclear prompts), missed delegation opportunities.

If no subagents were used, assess whether delegation opportunities were missed.

---

### Category 4: Cost Efficiency

**Good signals:** Haiku for simple tasks (Task tool model param), minimal redundant calls, targeted file reads, concise subagent prompts.

**Bad signals:** All tasks on Opus when some could use Haiku, duplicate data fetching, full file reads for small portions, verbose subagent prompts causing extra iterations.

Include any cost/token metrics from Step 1.

---

### Category 5: Actionable Insights

**Not scored.** Synthesize findings into concrete recommendations:

- **Prompt improvements:** How could the initial prompt have been better structured?
- **Skill improvements:** Which skills used could be enhanced? Specific changes?
- **Process improvements:** What workflow changes for future sessions? Be specific.

## Step 3: Write Report

Write to the report path from Setup using this structure:

```markdown
# Session Retrospective — <repo> — <YYYY-MM-DD HH:MM>

## Session Summary
- **Goal**: [from initial prompt]
- **Duration**: [estimate if available]
- **Outcome**: [what was accomplished]

## Scorecard

| Category | Score | Grade |
|----------|-------|-------|
| Context Engineering | X/5 | 🟢/🟡/🔴 |
| Tool Usage | X/5 | 🟢/🟡/🔴 |
| Sub-agent Work | X/5 | 🟢/🟡/🔴 |
| Cost Efficiency | X/5 | 🟢/🟡/🔴 |
| **Overall** | **X.X/5** | **🟢/🟡/🔴** |

## 1. Context Engineering (X/5)
### What went well
### What could improve
### Key metrics
- Context utilization: [high/medium/low]
- Duplication detected: [yes/no + specifics]
- Unused context loaded: [yes/no + specifics]

## 2. Tool Usage (X/5)
### What went well
### What could improve
### Tool inventory
| Tool | Uses | Effective? | Notes |
|------|------|-----------|-------|

## 3. Sub-agent Work (X/5)
### What went well
### What could improve
### Agent inventory
| Agent | Task | Result | Context saved? |
|-------|------|--------|---------------|

## 4. Cost Efficiency (X/5)
### Metrics
### What could improve

## 5. Actionable Insights
### Prompt improvements
### Skill improvements
### Process improvements

## Top 3 Takeaways
1. [Most impactful]
2. [Second most impactful]
3. [Third most impactful]
```

Populate every section with specific findings. No placeholders — if a category has no issues, state "No issues identified" with brief rationale.

## Step 4: Print Inline Summary

After writing the report, print to conversation:
1. The scorecard table
2. Top 3 Takeaways
3. Report file path

Keep inline summary concise — full details are in the saved report.
