---
name: adversary-code-review-opencode
description: >
  Use when code changes need independent adversarial review from a different model.
  Accepts git SHA range and optional spec file for compliance checking.
---

# Adversary Code Review (OpenCode)

Route code changes to opencode for adversarial review. The reviewing model assumes
the implementation has defects and independently verifies correctness — not trusting
claims, commit messages, or test results at face value.

**This skill composes on `opencode-consult`.** It constructs the adversarial prompt;
opencode-consult handles the transport.

## When to Use

- After implementation — before merging or creating a PR
- When you want a genuinely independent code review (different model, different biases)
- When Claude already reviewed the code and you want a second opinion
- With `--spec` when you need to verify implementation matches a spec or plan

**When NOT to use:**
- For quick reviews — use `quick-review` or `pr-review` (faster, no server dependency)
- For plan review — use `adversary-plan-review-opencode` instead
- When the diff is very large (>500 changed lines) — split into logical chunks first

## Arguments

Parse `$ARGUMENTS` for:
- **SHA range** — in `base..head` format (e.g., `main..HEAD`, `abc123..def456`)
- **`--spec` flag** — optional path to a plan or spec file for compliance checking

If no arguments provided, default to `main..HEAD`.

Examples:
- `/adversary-code-review-opencode` -> reviews `main..HEAD`
- `/adversary-code-review-opencode abc123..def456` -> reviews that range
- `/adversary-code-review-opencode main..HEAD --spec docs/plan.md` -> reviews with spec compliance

## Process

### Step 1: Resolve git range

Parse the SHA range from arguments. Default to `main..HEAD` if not provided.

Split on the `..` delimiter (not individual dots — refs can contain dots):

```bash
BASE="${RANGE%%%..*}"
HEAD="${RANGE##*..}"
```

Verify both refs are valid:

```bash
git rev-parse --verify "$BASE" >/dev/null 2>&1
git rev-parse --verify "$HEAD" >/dev/null 2>&1
```

If invalid: "Invalid git range `$RANGE`. Use format `base..head`." **Stop.**

Get the diff stat to understand scope:

```bash
git diff --stat "$BASE".."$HEAD"
```

If empty diff: "No changes found in range `$RANGE`." **Stop.**

### Step 2: Resolve spec file (if provided)

If `--spec` was passed, verify the file exists. If not: "Spec file not found at
`$SPEC_FILE`." **Stop.**

### Step 3: Build the inline context string

The adversarial rubric (review categories, calibration rules, severity, output format)
lives in the static file `prompt.md` alongside this skill. The inline string provides
the dynamic context — what to review and how.

Replace `<BASE>` and `<HEAD>` with actual resolved values.

**Base context (always included):**

```
You are performing an adversarial code review. The implementation may be incomplete,
incorrect, or subtly broken. Do not assume it works — verify independently.

DO NOT: Trust commit messages. Assume tests prove correctness. Take any claim at face value.
DO: Run git diff <BASE>..<HEAD>. Read changed files in full. Trace logic paths. Check edge cases.
```

**Spec compliance addendum (appended when `--spec` is provided):**

```
ADDITIONAL: Read the spec at <SPEC_FILE>. Verify every requirement has a corresponding
implementation, nothing was silently dropped, and nothing extra was added beyond spec.
Add a Spec Compliance section to your output between Files Reviewed and Critical Issues.
```

### Step 4: Dispatch via opencode-consult

Spawn a `general-purpose` subagent that follows the `opencode-consult` dispatch pattern
(server check, `--dir`, `--file`, model env var, output noise filtering).

The subagent must:

1. Follow `opencode-consult` Step 2 to verify the server and resolve `PROJECT_DIR` and `MODEL`.

2. Run the consultation with the static rubric file:
   ```bash
   SKILL_DIR="$HOME/.claude/skills/adversary-code-review-opencode"
   opencode run --attach "$SERVER_URL" --dir "$PROJECT_DIR" -m "$MODEL" \
     "<inline context string from Step 3>" \
     --file "$SKILL_DIR/prompt.md"
   ```

3. Filter tool call noise from the output (per opencode-consult guidance) and return:
   ```
   ## OpenCode Adversarial Code Review
   **Model:** <model used>
   **Range:** <base>..<head>
   **Spec:** <spec file path, or "none">

   ### Review Result
   <Structured review output only — verdict, findings, strengths. No tool call traces.>
   ```

### Step 5: Present result

Display the subagent's structured result to the user. Add guidance based on verdict:

- **APPROVE:** "OpenCode adversarial review found no blocking issues."
- **REQUEST CHANGES:** "OpenCode found issues that should be addressed. Review
  findings above and decide how to proceed."

The user decides what to do with the findings. This skill does not modify anything.

## Configuration

| Setting | Default | Override |
|---------|---------|---------|
| Model | `github-copilot/gpt-5.4` | `OPENCODE_REVIEW_MODEL` env var |
| Port | `4096` | First argument to `check-server.sh` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reviewing a huge diff (500+ lines) | Split into logical chunks. Large diffs overwhelm the reviewing model — findings get shallow. |
| Omitting `--spec` when a spec exists | Without spec compliance, the review only checks code quality — not whether you built the right thing. |
| Treating opencode findings as authoritative | OpenCode is advisory. Findings may be wrong — the reviewing model lacks Claude's full context. Verify before acting. |
| Using `main..HEAD` when main is stale | Make sure main is up to date (`git fetch origin main`) or the diff will include changes already merged. |

## Failure Handling

| Failure | What to Tell the User |
|---------|----------------------|
| `check-server.sh` exits 1 | "OpenCode server is not running on port 4096. Start it before retrying." |
| `git diff --stat` returns empty | "No changes found in range. Verify the SHA range is correct." |
| `opencode run` returns empty output | "OpenCode returned no response. The server may have timed out. Check http://localhost:4096 for session details." |
| `opencode run` returns truncated output | "OpenCode response appears incomplete. The diff may be too large. Try a smaller SHA range or split the review." |
| Subagent fails for any other reason | "Consultation failed. Check that opencode is configured correctly (`opencode auth list`) and the server is healthy." |
