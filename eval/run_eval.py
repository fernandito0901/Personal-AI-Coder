"""
runs up to 20 seeded tasks, logs pass rate, attempts, time, lines changed
"""
from __future__ import annotations
import json
import os
import random
import shutil
import tempfile
import time
from datetime import datetime
from orchestrator.graph import Orchestrator
from orchestrator.tools import LLMClient, SandboxClient


def load_tasks(path: str) -> list[dict]:
    tasks = []
    for root, _, files in os.walk(path):
        for f in files:
            if not f.endswith(".json") and not f.endswith(".jsonl"):
                continue
            fp = os.path.join(root, f)
            with open(fp, "r", encoding="utf-8") as fh:
                if f.endswith(".jsonl"):
                    for line in fh:
                        if line.strip():
                            tasks.append(json.loads(line))
                else:
                    tasks.append(json.load(fh))
    return tasks


def count_repo_lines(root: str) -> int:
    total = 0
    for base, _, files in os.walk(root):
        for f in files:
            if f.endswith((".py", ".md", ".txt")):
                try:
                    with open(os.path.join(base, f), "r", encoding="utf-8", errors="ignore") as fh:
                        total += sum(1 for _ in fh)
                except Exception:
                    pass
    return total


def main():
    random.seed(0)
    tasks = load_tasks("data/task_to_patch")
    random.shuffle(tasks)
    tasks = tasks[:20]

    tmpdir = tempfile.mkdtemp(prefix="eval_repo_")
    # copy current repo to tmpdir
    for item in os.listdir("."):
        if item in {".git", "__pycache__", "dist", "build"}:
            continue
        src = os.path.join(".", item)
        dst = os.path.join(tmpdir, item)
        try:
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
        except Exception:
            pass

    os.chdir(tmpdir)

    orc = Orchestrator(LLMClient(), SandboxClient())

    passes = 0
    results = []
    t0 = time.time()
    for i, t in enumerate(tasks, 1):
        goal = t.get("prompt") or t.get("goal") or str(t)
        before = count_repo_lines(".")
        io = orc.run_once(goal=goal)
        after = count_repo_lines(".")
        ok = bool(io.state.get("last_result", {}).get("ok"))
        passes += 1 if ok else 0
        results.append({
            "goal": goal,
            "ok": ok,
            "lines_changed": after - before,
            "state": io.state,
        })
        print(f"Task {i}: {'PASS' if ok else 'FAIL'}")

    rate = passes / max(1, len(results))
    os.makedirs("eval/results", exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    latest_path = "eval/results/latest.json"
    with open(f"eval/results/run_{ts}.json", "w", encoding="utf-8") as f:
        json.dump({"pass_rate": rate, "results": results, "seconds": time.time() - t0}, f, indent=2)
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump({"pass_rate": rate, "results": results, "seconds": time.time() - t0}, f, indent=2)
    print(f"Pass rate: {rate:.2%}")


if __name__ == "__main__":
    main()
