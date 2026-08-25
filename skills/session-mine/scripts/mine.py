#!/usr/bin/env python3
"""One pass over Claude Code (~/.claude/projects) and pi (~/.pi/agent/sessions) transcripts.

Writes to OUT:
  turns/<store>-<YYYY-MM>.jsonl   one human turn per line: ts, project, session, i, corr, slash, text
  sessions.tsv                    one row per session: turns, errors, models, top tools, skills, agents
  stats.md                        totals, per-month trends, tool/skill/agent/MCP/error tables
  skill-usage.md                  per-skill, per-month invocation counts across both harnesses

Usage: mine.py [--since YYYY-MM-DD] [--out DIR] [--store claude|pi|both] [--skills a,b,c|all]
"""
import argparse, collections, datetime, glob, json, os, re, statistics, sys

HOME = os.path.expanduser("~")
CORR = re.compile(
    r"^\s*(no\b|nope|stop\b|wrong|don'?t\b|do not\b|why did you|why are you|that'?s not|not what i|wtf|bruh|"
    r"you (didn'?t|ignored|forgot|missed|broke)|i said|i asked|i told|actually\b|revert|undo|never ?mind|"
    r"too (much|long|verbose)|shorter|simpler|stop asking|hold on|wait\b|not that|i meant|instead\b|"
    r"you'?re (wrong|not)|this is wrong|still (wrong|broken|failing)|didn'?t work|doesn'?t work|not working|"
    r"hallucinat|made up|fabricat|be honest|take a step back|over ?complicat|overkill)", re.I)
AUTONOMY = {"ScheduleWakeup", "Monitor", "CronCreate", "TeamCreate", "SendMessage", "Workflow", "EnterWorktree",
            "TaskCreate", "ExitPlanMode", "EnterPlanMode", "WebSearch", "WebFetch", "ToolSearch", "AskUserQuestion"}
ERRPAT = [("timeout", r"timed? ?out"), ("permission/denied", r"denied|not allowed|permission"),
          ("file-not-found", r"No such file|not found|does not exist|ENOENT"),
          ("old_string-mismatch", r"old_string|String to replace not found|not unique"),
          ("bash-exit", r"exit code|command failed"), ("mcp", r"MCP|mcp__"),
          ("interrupted", r"interrupted|aborted|cancel"), ("sandbox", r"sandbox|Operation not permitted"),
          ("json/schema", r"InputValidationError|schema|Invalid")]
SKILLMD = re.compile(r"skills?(?:-local)?/([\w.-]+)/SKILL\.md")


def text_of(content):
    if isinstance(content, str):
        return content
    return "\n".join(b.get("text", "") for b in content or [] if isinstance(b, dict) and b.get("type") == "text")


def err_kind(txt):
    for name, pat in ERRPAT:
        if re.search(pat, txt[:400], re.I):
            return name
    return "other"


class Miner:
    def __init__(self, since, skills, installed):
        self.since = since
        self.skills = skills          # None = every skill seen; else restrict to these names
        self.installed = installed
        self.turns = collections.defaultdict(list)
        self.sessions = []
        self.month = collections.defaultdict(collections.Counter)      # month -> {user, asst, ask, compact, ...}
        self.by_month = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))  # kind -> month -> Counter
        self.totals = collections.defaultdict(collections.Counter)      # kind -> Counter
        # skill usage: skill -> month -> Counter(channel)
        self.skill_use = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))

    def skill_hit(self, name, month, channel):
        name = str(name).split(":")[-1]
        if name and (self.skills is None or name in self.skills):
            self.skill_use[name][month][channel] += 1

    def file_recent(self, path):
        if not self.since:
            return True
        return datetime.datetime.fromtimestamp(os.path.getmtime(path)).date() >= self.since

    def in_range(self, ts):
        return not self.since or not ts or ts[:10] >= self.since.isoformat()

    def new_session(self, store, path):
        return dict(store=store, project=os.path.basename(os.path.dirname(path)), session=os.path.basename(path)[:-6],
                    start=None, end=None, user=0, asst=0, tools=collections.Counter(), skills=[], agents=[],
                    models=set(), errors=0, corr=0, summary=None)

    def emit_turn(self, st, ts, idx, text, slash):
        mo = ts[:7]
        corr = bool(CORR.search(text[:200]))
        st["corr"] += corr
        self.month[mo]["user"] += 1
        self.turns[f"{st['store']}-{mo}"].append(dict(ts=ts, project=st["project"], session=st["session"], i=idx,
                                                      corr=corr, slash=slash, text=text[:2000]))

    # ---------------- Claude ----------------
    def claude(self):
        for path in glob.glob(os.path.join(HOME, ".claude/projects/*/*.jsonl")):
            if not self.file_recent(path):
                continue
            st = self.new_session("claude", path)
            idx = 0
            with open(path, errors="replace") as f:
                for line in f:
                    try:
                        o = json.loads(line)
                    except Exception:
                        continue
                    t, ts = o.get("type"), o.get("timestamp") or ""
                    if t == "summary":
                        st["summary"] = o.get("summary"); continue
                    if not self.in_range(ts):
                        continue
                    mo = ts[:7]
                    if ts:
                        st["start"] = st["start"] or ts; st["end"] = ts
                    m = o.get("message") or {}
                    if t == "user":
                        if o.get("isSidechain") or o.get("isMeta"):
                            continue
                        c = m.get("content")
                        if isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c):
                            for b in c:
                                if isinstance(b, dict) and b.get("type") == "tool_result" and b.get("is_error"):
                                    st["errors"] += 1
                                    self.totals["errors"][err_kind(text_of(b.get("content")) if not isinstance(b.get("content"), str) else b["content"])] += 1
                            continue
                        text = text_of(c).strip()
                        if not text or text.startswith(("<local-command-stdout", "<local-command-caveat", "<system-reminder>")):
                            continue
                        if "This session is being continued from a previous conversation" in text[:150]:
                            self.month[mo]["compact"] += 1; continue
                        slash = None
                        for cm in re.findall(r"<command-name>(/[\w:.-]+)</command-name>", text):
                            slash = cm
                            self.by_month["slash"][mo][cm] += 1
                            self.skill_hit(cm.lstrip("/"), mo, "claude:slash")
                        st["user"] += 1; idx += 1
                        self.emit_turn(st, ts, idx, text, slash)
                    elif t == "assistant":
                        st["asst"] += 1; self.month[mo]["asst"] += 1
                        if m.get("model"):
                            st["models"].add(m["model"]); self.totals["models"]["claude:" + m["model"]] += 1
                        for b in m.get("content") or []:
                            if not (isinstance(b, dict) and b.get("type") == "tool_use"):
                                continue
                            n, inp = b.get("name"), b.get("input") or {}
                            st["tools"][n] += 1; self.totals["tools"]["claude:" + str(n)] += 1
                            if n == "Skill":
                                s = inp.get("skill"); st["skills"].append(s)
                                self.by_month["skill"][mo][s] += 1; self.skill_hit(s, mo, "claude:Skill")
                            elif n in ("Agent", "Task"):
                                a = inp.get("subagent_type") or "default"; st["agents"].append(a)
                                self.by_month["agent"][mo][a] += 1
                            elif n == "Read":
                                mm = SKILLMD.search(str(inp.get("file_path", "")))
                                if mm:
                                    self.skill_hit(mm.group(1), mo, "claude:read")
                            if n == "AskUserQuestion":
                                self.month[mo]["ask"] += 1
                            if n in AUTONOMY:
                                self.by_month["autonomy"][mo][n] += 1
                            if n and n.startswith("mcp__"):
                                self.by_month["mcp"][mo][n.split("__")[1]] += 1
            if st["user"] or st["asst"]:
                self.sessions.append(st)

    # ---------------- pi ----------------
    def pi(self):
        for path in glob.glob(os.path.join(HOME, ".pi/agent/sessions/*/*.jsonl")):
            if not self.file_recent(path):
                continue
            st = self.new_session("pi", path)
            idx = 0
            with open(path, errors="replace") as f:
                for line in f:
                    try:
                        o = json.loads(line)
                    except Exception:
                        continue
                    t, ts = o.get("type"), o.get("timestamp") or ""
                    if t == "session_info":
                        st["summary"] = o.get("name"); continue
                    if not self.in_range(ts):
                        continue
                    mo = ts[:7]
                    if ts:
                        st["start"] = st["start"] or ts; st["end"] = ts
                    if t == "model_change":
                        mm = f"{o.get('provider')}/{o.get('modelId')}"; st["models"].add(mm)
                        self.totals["models"]["pi:" + mm] += 1; continue
                    if t != "message":
                        continue
                    m = o.get("message") or {}; role = m.get("role")
                    if role == "user":
                        text = text_of(m.get("content")).strip()
                        if not text:
                            continue
                        slash = None
                        sm = re.match(r"^/(skill:)?([\w.-]+)", text)
                        if sm:
                            slash = "/" + (sm.group(1) or "") + sm.group(2)
                            self.by_month["slash"][mo][slash] += 1
                            if sm.group(1):
                                self.skill_hit(sm.group(2), mo, "pi:slash")
                        for s in re.findall(r'<skill name="([\w.-]+)"', text):
                            self.skill_hit(s, mo, "pi:slash")
                        st["user"] += 1; idx += 1
                        self.emit_turn(st, ts, idx, text, slash)
                    elif role == "assistant":
                        st["asst"] += 1; self.month[mo]["asst"] += 1
                        for b in m.get("content") or []:
                            if not (isinstance(b, dict) and b.get("type") in ("toolCall", "tool_use", "toolUse")):
                                continue
                            n = b.get("name"); args = b.get("arguments") or b.get("input") or {}
                            st["tools"][n] += 1; self.totals["tools"]["pi:" + str(n)] += 1
                            if n in ("subagent", "Agent", "Task"):
                                a = args.get("agent") or args.get("subagent_type") or "default"; st["agents"].append(a)
                                self.by_month["agent"][mo]["pi:" + str(a)] += 1
                            mm = SKILLMD.search(json.dumps(args))
                            if mm and n in ("read", "Read", "bash"):
                                self.skill_hit(mm.group(1), mo, "pi:read")
                    elif role == "toolResult" and (m.get("isError") or m.get("is_error")):
                        st["errors"] += 1
                        self.totals["errors"][err_kind(text_of(m.get("content")))] += 1
            if st["user"] or st["asst"]:
                self.sessions.append(st)

    # ---------------- output ----------------
    def write(self, out):
        os.makedirs(os.path.join(out, "turns"), exist_ok=True)
        for k, recs in self.turns.items():
            with open(os.path.join(out, "turns", k + ".jsonl"), "w") as f:
                for r in sorted(recs, key=lambda r: r["ts"]):
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
        with open(os.path.join(out, "sessions.tsv"), "w") as f:
            f.write("store\tstart\tproject\tsession\tuser\tasst\terrors\tcorr\tmodels\ttop_tools\tskills\tagents\tsummary\n")
            for s in sorted(self.sessions, key=lambda s: s["start"] or ""):
                f.write("\t".join([s["store"], (s["start"] or "")[:16], s["project"], s["session"][:12], str(s["user"]),
                                   str(s["asst"]), str(s["errors"]), str(s["corr"]), ",".join(sorted(s["models"])),
                                   " ".join(f"{k}:{v}" for k, v in s["tools"].most_common(6)),
                                   ",".join(map(str, s["skills"]))[:200], ",".join(map(str, s["agents"]))[:200],
                                   (s["summary"] or "").replace("\t", " ").replace("\n", " ")[:160]]) + "\n")
        months = sorted(m for m in self.month if m)
        L = []
        L.append(f"# Session stats\n\nsince: {self.since or 'all'} · sessions: {len(self.sessions)} "
                 f"(claude {sum(s['store']=='claude' for s in self.sessions)}, pi {sum(s['store']=='pi' for s in self.sessions)}) · "
                 f"human turns: {sum(s['user'] for s in self.sessions)} · assistant turns: {sum(s['asst'] for s in self.sessions)} · "
                 f"tool errors: {sum(self.totals['errors'].values())} · correction-flagged turns: {sum(s['corr'] for s in self.sessions)}\n")
        L.append("## Per month\n\n| month | human | assistant | asst/human | AskUserQuestion | compactions |\n|---|---|---|---|---|---|")
        for mo in months:
            c = self.month[mo]
            L.append(f"| {mo} | {c['user']} | {c['asst']} | {c['asst']/max(1,c['user']):.1f} | {c['ask']} | {c['compact']} |")
        ul = [s["user"] for s in self.sessions] or [0]; al = [s["asst"] for s in self.sessions] or [0]
        L.append(f"\nsession shape: median human turns {statistics.median(ul)}, p90 {sorted(ul)[int(.9*(len(ul)-1))]}, max {max(ul)}; "
                 f"median assistant turns {statistics.median(al)}, p90 {sorted(al)[int(.9*(len(al)-1))]}; "
                 f"single-turn sessions {sum(1 for u in ul if u == 1)}\n")
        for kind, title, n in [("skill", "Skill tool invocations (Claude)", 12), ("slash", "Slash commands typed", 12),
                               ("agent", "Subagent types", 8), ("autonomy", "Autonomy / orchestration tools", 12), ("mcp", "MCP servers", 8)]:
            L.append(f"## {title} by month\n")
            for mo in months:
                c = self.by_month[kind].get(mo)
                if c:
                    L.append(f"- {mo}: " + ", ".join(f"{k} {v}" for k, v in c.most_common(n)))
            L.append("")
        for kind, title in [("models", "Models"), ("tools", "Tool usage"), ("errors", "Tool error kinds")]:
            L.append(f"## {title}\n")
            L += [f"- {k}: {v}" for k, v in self.totals[kind].most_common(40)]
            L.append("")
        with open(os.path.join(out, "stats.md"), "w") as f:
            f.write("\n".join(L))
        # skill usage table
        chans = ["claude:slash", "claude:Skill", "claude:read", "pi:slash", "pi:read"]
        # slash-only names are mostly built-ins (/clear, /model); keep a name if it is installed, explicitly
        # requested, or was loaded as a skill at least once (Skill tool or SKILL.md read) in the window.
        seen = {n for n, per in self.skill_use.items() if any(c[ch] for c in per.values() for ch in ("claude:Skill", "claude:read", "pi:read", "pi:slash"))}
        names = sorted(self.skills) if self.skills else sorted(self.installed | seen)
        U = ["# Skill usage by month\n", "channels: claude:slash = typed `/name`; claude:Skill = model invoked via Skill tool; "
             "claude:read = SKILL.md read directly; pi:slash = `/skill:name` or expanded `<skill name=…>`; pi:read = SKILL.md read (how pi loads skills)\n",
             "| skill | total | " + " | ".join(months) + " |", "|---|---|" + "---|" * len(months)]
        rows = []
        for name in names:
            per = self.skill_use.get(name, {})
            cells = []
            for mo in months:
                c = per.get(mo)
                cells.append(" ".join(f"{ch.split(':')[0][0]}{ch.split(':')[1][0]}{c[ch]}" for ch in chans if c and c[ch]) or "·")
            total = sum(sum(c.values()) for c in per.values())
            label = name if name in self.installed else f"{name} (not installed)"
            rows.append((total, f"| {label} | {total} | " + " | ".join(cells) + " |"))
        U += [r for _, r in sorted(rows, key=lambda x: -x[0])]
        U.append("\ncell codes: cs=claude slash, cS=claude Skill tool, cr=claude SKILL.md read, ps=pi slash, pr=pi SKILL.md read. `·` = no use.")
        zero = [r.split("|")[1].strip() for t, r in rows if t == 0]
        if zero:
            U.append(f"\nZERO use in range ({len(zero)}): " + ", ".join(zero))
        with open(os.path.join(out, "skill-usage.md"), "w") as f:
            f.write("\n".join(U) + "\n")
        return "\n".join(U)


def installed_skills():
    names = set()
    for d in (os.path.join(HOME, ".claude/skills"), os.path.join(HOME, ".agents/skills")):
        if os.path.isdir(d):
            names |= {n for n in os.listdir(d) if not n.startswith(".")}
    return names


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--since", help="YYYY-MM-DD; default all")
    ap.add_argument("--out", help="default ~/notes/context-engineering/session-mine/<today>")
    ap.add_argument("--store", choices=["claude", "pi", "both"], default="both")
    ap.add_argument("--skills", help="comma list, or 'all' (default: every installed skill plus any skill seen loading in the window, marked '(not installed)')", default="all")
    a = ap.parse_args()
    since = datetime.date.fromisoformat(a.since) if a.since else None
    out = a.out or os.path.join(HOME, "notes/context-engineering/session-mine", datetime.date.today().isoformat())
    installed = installed_skills()
    skills = None if a.skills == "all" else set(a.skills.split(","))
    m = Miner(since, skills, installed)
    if a.store in ("claude", "both"):
        m.claude()
    if a.store in ("pi", "both"):
        m.pi()
    usage = m.write(out)
    print(usage)
    print(f"\nwrote {out}/{{turns/,sessions.tsv,stats.md,skill-usage.md}} · {len(m.sessions)} sessions, "
          f"{sum(len(v) for v in m.turns.values())} human turns", file=sys.stderr)


if __name__ == "__main__":
    main()
