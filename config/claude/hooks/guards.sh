#!/usr/bin/env bash
# PreToolUse guards for Claude Code. Reads the hook JSON on stdin, prints a
# permission decision on stdout. Wired from config/claude/settings.json for
# matchers "Write|Edit" and "Bash". Fast path: exit 0 with no output = allow.
#
#  (a) Write/Edit of an untracked .md inside a work monorepo  -> ask
#      (notes, plans, handoffs belong in ~/notes/<project>/)
#  (b) Bash: --clean-db, reset --hard, push -f/--force (not --force-with-lease) -> ask
#  (c) Bash: rm touching ~/.claude/projects/*/memory -> deny

set -u
input="$(cat)"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"

decide() { # $1=ask|deny $2=reason
  jq -cn --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$d,permissionDecisionReason:$r}}'
  exit 0
}

case "$tool" in
  Write|Edit|MultiEdit)
    path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
    [[ "$path" == *.md ]] || exit 0
    path="${path/#\~/$HOME}"
    case "$path" in
      "$HOME"/mms/*|"$HOME"/code/mms*|"$HOME"/code/worktrees/mms/*|"$HOME"/code/mongohouse*|"$HOME"/code/worktrees/mongohouse/*|"$HOME"/code/mms-automation*) ;;
      *) exit 0 ;;
    esac
    dir="$(dirname "$path")"
    if [[ -d "$dir" ]] && git -C "$dir" ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
      exit 0  # already tracked: editing repo docs is fine
    fi
    decide ask "notes/plans/handoffs go to ~/notes/<project>/ — confirm this .md belongs in the repo: $path"
    ;;
  Bash)
    cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"
    if printf '%s' "$cmd" | grep -Eq '(^|[[:space:];&|])rm[[:space:]]' && printf '%s' "$cmd" | grep -Eq '\.claude/projects/[^[:space:]]*/memory'; then
      decide deny "rm under ~/.claude/projects/*/memory is blocked: back up to ~/notes/claude-resources/memory-backup/ first, or edit MEMORY.md instead"
    fi
    if printf '%s' "$cmd" | grep -Eq -- '--clean-db'; then
      decide ask "destructive: --clean-db wipes the local mms db"
    fi
    if printf '%s' "$cmd" | grep -Eq 'reset[[:space:]]+--hard'; then
      decide ask "destructive: git reset --hard"
    fi
    if printf '%s' "$cmd" | grep -Eq '(^|[[:space:];&|])(git[[:space:]]+)?push[[:space:]]' && printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])(-f|--force)([[:space:]]|$)'; then
      decide ask "force push: only on a graphite history rewrite; never to resolve a merge conflict"
    fi
    exit 0
    ;;
  *) exit 0 ;;
esac
