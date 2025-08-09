"""
plan→retrieve→edit→test loop

Implements an iterative loop with planning, retrieval, implementation, testing, and
optional repair using model-proposed patches.
"""
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Callable
import os

from .tools import LLMClient, SandboxClient, AiderWrapper
from retrieval.index import query_symbols, build_index


@dataclass
class NodeIO:
    goal: str
    state: Dict[str, Any]
    logs: List[str]


class Orchestrator:
    def __init__(self, llm: LLMClient, sandbox: SandboxClient, on_event: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.llm = llm
        self.sandbox = sandbox
        self.use_aider = os.getenv("USE_AIDER", "false").lower() == "true"
        self.max_iters = int(os.getenv("MAX_ITERS", "3"))
        self.workspace = os.getenv("WORKSPACE_DIR", ".")
        self.aider = AiderWrapper() if self.use_aider else None
        self.on_event = on_event

    def log(self, io: NodeIO, msg: str, evt_type: str = "log", **kw):
        io.logs.append(msg)
        if self.on_event:
            self.on_event({"type": evt_type, "message": msg, **kw})
        print(msg)

    def _plan(self, io: NodeIO) -> Dict[str, Any]:
        system = "You are a planning agent. Produce a short next step with {action,target,notes}. Return JSON only."
        user = f"Goal: {io.goal}\nState: {io.state}"
        step = self.llm.complete_json(system, user)
        self.log(io, f"Plan: {step}", evt_type="plan", plan=step)
        return step

    def _retrieve(self, io: NodeIO, step: Dict[str, Any]) -> List[Dict[str, Any]]:
        # Rebuild index each iteration to reflect recent edits
        try:
            count = build_index(self.workspace)
            self.log(io, f"Index updated: {count} symbols", evt_type="index", count=count)
        except Exception as e:
            self.log(io, f"Index error: {e}", evt_type="index_error")
        q = (step.get("target") or step.get("action") or io.goal or "").strip()
        snippets = query_symbols(q, k=8)
        self.log(io, f"Retrieved {len(snippets)} snippets for query '{q}'.", evt_type="retrieve", count=len(snippets))
        return snippets

    def _implement(self, io: NodeIO, task: str, snippets: List[Dict[str, Any]], trace: Optional[str] = None) -> bool:
        patch = self.llm.propose_patch(task, snippets, trace)
        if self.use_aider and self.aider:
            out = self.aider.run(patch.diff)
            self.log(io, f"Aider output: {out[:500]}", evt_type="aider")
        ok = self.sandbox.apply_patch(patch)
        self.log(io, f"Patch applied: {ok}", evt_type="patch", diff=patch.diff)
        # commit only if tests will pass later; we keep staging but commit on green
        return ok

    def _git_commit(self, message: str):
        try:
            subprocess = __import__("subprocess")
            subprocess.run(["git", "add", "-A"], check=False)
            subprocess.run(["git", "commit", "-m", message], check=False)
        except Exception:
            pass

    def _test(self, io: NodeIO) -> Dict[str, Any]:
        res = self.sandbox.run_tests()
        self.log(io, f"Test exit code {res.get('code')}, ok={res.get('ok')}", evt_type="test", stdout=res.get("stdout"), stderr=res.get("stderr"))
        return res

    def run_once(self, goal: str, init_state: Optional[Dict[str, Any]] = None) -> NodeIO:
        io = NodeIO(goal=goal, state=init_state or {}, logs=[])
        for attempt in range(1, self.max_iters + 1):
            self.log(io, f"--- Iteration {attempt}/{self.max_iters} ---", evt_type="iter")
            step = self._plan(io)
            snippets = self._retrieve(io, step)
            self._implement(io, goal, snippets)
            result = self._test(io)
            io.state["last_result"] = result
            if result.get("ok"):
                self._git_commit(f"AI patch: {goal[:60]}")
                self.log(io, "Green build!", evt_type="done")
                break
            # repair using trace
            trace = (result.get("stdout", "") + "\n" + result.get("stderr", "")).strip()
            self._implement(io, goal, snippets, trace=trace)
            result = self._test(io)
            io.state["last_result"] = result
            if result.get("ok"):
                self._git_commit(f"AI patch: {goal[:60]}")
                self.log(io, "Green build after repair!", evt_type="done")
                break
        return io

