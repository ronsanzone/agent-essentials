#!/usr/bin/env python3
"""Find merged-by-you PRs, map their Jira ticket keys, and resolve the still-open ones.

    cleanup_prs.py scan [--since 180d] [--projects CLOUDP,MHOUSE] [--json]
    cleanup_prs.py resolve KEY [KEY...] [--apply] [--target-status Resolved|Closed]

scan: lists tickets assigned to you, still open, whose code is merged.
resolve: transitions them to the project's done status with resolution Fixed,
         fixVersions n/a (appended, never replacing existing versions) and
         "Documentation Changes" = Not Needed. Dry run unless --apply.

Auth: JIRA_API_TOKEN (falls back to ~/.config/.jira/.env). Uses Jira REST v2;
v3 redirects to SSO on jira.mongodb.org and does not accept the bearer token.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("JIRA_BASE", "https://jira.mongodb.org").rstrip("/") + "/rest/api/2"
# Project -> status a closed ticket lands in. Extend when you own tickets elsewhere.
PROJECT_TARGET = {"CLOUDP": "Resolved", "MHOUSE": "Closed"}
DOC_FIELD_NAME = "Documentation Changes"
DOC_FIELD_HINT = "Documentation"
DOC_VALUE = "Not Needed"
RESOLUTION = "Fixed"


# ---------------------------------------------------------------- auth / http
def token() -> str:
    tok = os.environ.get("JIRA_API_TOKEN")
    if tok:
        return tok
    env = os.path.expanduser("~/.config/.jira/.env")
    if os.path.exists(env):
        for line in open(env):
            m = re.match(r"\s*(?:export\s+)?JIRA_API_TOKEN=['\"]?([^'\"\s]+)", line)
            if m:
                os.environ["JIRA_API_TOKEN"] = m.group(1)
                return m.group(1)
    sys.exit("JIRA_API_TOKEN not set and not found in ~/.config/.jira/.env")


def api(method: str, path: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Authorization", "Bearer " + token())
    req.add_header("Accept", "application/json")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:800]


# ------------------------------------------------------------------ discovery
def merged_prs(since: str | None) -> list[dict]:
    if since and re.fullmatch(r"\d+d", since):
        days = int(since[:-1])
        since = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    cmd = ["gh", "search", "prs", "--author=@me", "--merged", "--limit", "1000",
           "--json", "url,title,body,closedAt"]
    if since:
        cmd[5:5] = ["--merged-at", ">=" + since]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("gh search failed: " + out.stderr.strip()[:400])
    # Keys come from the title plus the head of the body: a key buried deeper is
    # usually a ticket the PR mentions (origin bug, related work), not the one it closes.
    return [{"url": p["url"], "closed": p["closedAt"][:10],
             "text": (p.get("title") or "") + "\n" + (p.get("body") or "")[:300]}
            for p in json.loads(out.stdout)]


def tickets(keys: list[str]) -> dict[str, dict]:
    """JQL is applied per project: jira.mongodb.org silently drops other projects
    from a cross-project `key in (...)` when the query carries a project clause,
    and the jira CLI defaults to one project."""
    found: dict[str, dict] = {}
    by_project: dict[str, list[str]] = {}
    for k in keys:
        by_project.setdefault(k.split("-")[0], []).append(k)
    for proj, group in by_project.items():
        for i in range(0, len(group), 40):
            chunk = group[i:i + 40]
            jql = (f'project = {proj} AND key in ({",".join(chunk)}) '
                   f'AND assignee = currentUser() AND statusCategory != Done')
            code, res = api("GET", "/search?" + urllib.parse.urlencode(
                {"jql": jql, "maxResults": 100,
                 "fields": "status,summary,fixVersions,project,issuetype,resolution"}))
            if code >= 300:
                sys.exit(f"JQL failed for {proj}: {res}")
            for issue in res["issues"]:
                f = issue["fields"]
                found[issue["key"]] = {
                    "key": issue["key"], "project": f["project"]["key"],
                    "status": f["status"]["name"], "summary": f["summary"],
                    "fixVersions": [v["name"] for v in f["fixVersions"]],
                }
    return found


def scan(since: str | None, projects: set[str]) -> list[dict]:
    keyre = re.compile(r"\b(?:" + "|".join(sorted(projects)) + r")-\d{1,7}\b", re.I)
    keys: dict[str, list[str]] = {}
    for pr in merged_prs(since):
        for k in {m.upper() for m in keyre.findall(pr["text"])}:
            keys.setdefault(k, []).append(pr["url"])
    if not keys:
        return []
    rows = []
    for key, info in tickets(sorted(keys)).items():
        rows.append({**info, "prs": sorted(set(keys[key]))})
    rows.sort(key=lambda r: (r["project"], -int(r["key"].rsplit("-", 1)[1])))
    return rows


# -------------------------------------------------------------------- resolve
def na_version(project: str) -> str:
    """The 'n/a' release name, in whatever case that project spells it."""
    code, versions = api("GET", f"/project/{project}/versions")
    if code < 300:
        for v in versions:
            if re.fullmatch(r"n/?a", v["name"], re.I):
                return v["name"]
    return "n/a"


def doc_option(key: str) -> tuple[str, dict] | None:
    """(field id, value) for the Documentation Changes field, looked up by name.
    Several fields start with "Documentation"; the one that offers the option wins."""
    code, fields = api("GET", "/field")
    if code >= 300:
        return None
    cands = [f for f in fields if f["name"].startswith(DOC_FIELD_HINT)]
    cands.sort(key=lambda f: f["name"] != DOC_FIELD_NAME)
    code, meta = api("GET", f"/issue/{key}/editmeta")
    if code >= 300:
        return None
    for field in cands:
        allowed = (meta["fields"].get(field["id"]) or {}).get("allowedValues") or []
        option = next((o for o in allowed if o.get("value") == DOC_VALUE), None)
        if option:
            return field["id"], {"id": option["id"]}
    print(f"  ! no '{DOC_FIELD_HINT}' field offers '{DOC_VALUE}'; leaving it alone", file=sys.stderr)
    return None


def resolve(key: str, apply: bool, target: str | None, merge_versions: bool = True):
    project = key.split("-")[0]
    code, issue = api("GET", f"/issue/{key}?fields=status,resolution,fixVersions,project")
    if code >= 300:
        return {"key": key, "error": f"read failed ({code}): {issue}"}
    cur = {
        "status": issue["fields"]["status"]["name"],
        "resolution": (issue["fields"]["resolution"] or {}).get("name"),
        "fixVersions": [v["name"] for v in issue["fields"]["fixVersions"]],
    }
    if cur["resolution"]:
        return {"key": key, "skipped": f"already resolved ({cur['resolution']})", "before": cur}

    want = target or PROJECT_TARGET.get(project, "Resolved")
    code, tr = api("GET", f"/issue/{key}/transitions?expand=transitions.fields")
    if code >= 300:
        return {"key": key, "error": f"transitions failed ({code}): {tr}"}
    hits = [t for t in tr["transitions"] if t["to"]["name"] == want]
    if not hits:
        done = [f"{t['name']}=>{t['to']['name']}" for t in tr["transitions"]
                if t["to"]["statusCategory"]["key"] == "done"]
        return {"key": key, "error": f"no transition to {want}; done transitions: {done or 'none'}"}
    step = hits[0]

    versions = list(cur["fixVersions"])
    na = na_version(project)
    if merge_versions and na not in versions:
        versions.append(na)
    fields = {"resolution": {"name": RESOLUTION}, "fixVersions": [{"name": v} for v in versions]}
    doc = doc_option(key)
    if doc:
        fields[doc[0]] = doc[1]

    plan = {"key": key, "transition": f"{step['name']}=>{step['to']['name']}",
            "from": cur, "fields": fields}
    if not apply:
        return plan
    code, resp = api("POST", f"/issue/{key}/transitions",
                     {"transition": {"id": step["id"]}, "fields": fields})
    plan["http"] = code
    if code >= 300:
        plan["error"] = resp
    plan["after"] = read_state(key, doc[0] if doc else None)
    return plan


def read_state(key: str, doc_field: str | None = None) -> dict:
    """Re-read what was written. Jira returns only the fields asked for, so the
    Documentation field has to be named explicitly or the check silently passes null."""
    wanted = "status,resolution,fixVersions" + (f",{doc_field}" if doc_field else "")
    code, issue = api("GET", f"/issue/{key}?fields={wanted}")
    f = issue["fields"] if code < 300 else {}
    return {"status": (f.get("status") or {}).get("name"),
            "resolution": (f.get("resolution") or {}).get("name"),
            "fixVersions": [v["name"] for v in f.get("fixVersions", [])],
            "doc": (f.get(doc_field) or {}).get("value") if doc_field else None}


# ----------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan")
    s.add_argument("--since", help="only PRs merged since, e.g. 2026-01-01 or 180d")
    s.add_argument("--projects", default="CLOUDP,MHOUSE")
    s.add_argument("--json", action="store_true")
    r = sub.add_parser("resolve")
    r.add_argument("keys", nargs="+")
    r.add_argument("--apply", action="store_true")
    r.add_argument("--target-status")
    a = ap.parse_args()

    if a.cmd == "scan":
        rows = scan(a.since, {p.strip().upper() for p in a.projects.split(",") if p.strip()})
        if a.json:
            print(json.dumps(rows, indent=1))
        elif not rows:
            print("Nothing to clean up: no open tickets of yours have merged code.")
        else:
            for row in rows:
                print(f"{row['key']}\t{row['status']}\t"
                      f"fix={','.join(row['fixVersions']) or '-'}\t{row['summary']}\t"
                      f"{' '.join(row['prs'])}")
            print(f"\n{len(rows)} ticket(s).")
        return

    for key in a.keys:
        print(json.dumps(resolve(key, a.apply, a.target_status)))


if __name__ == "__main__":
    main()
