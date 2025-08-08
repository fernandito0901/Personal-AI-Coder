"""
plan→retrieve→edit→test loop

Implements an iterative loop with planning, retrieval, implementation, testing, and
optional repair using model-proposed patches.
"""
import os
import subprocess
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from .tools import LLMClient, SandboxClient, AiderWrapper, Patch
from retrieval.index import query_symbols


@dataclass
class NodeIO:
    goal: str
    state: Dict[str, Any]
    logs: List[str]


class Orchestrator:
    def __init__(self, llm: LLMClient, sandbox: SandboxClient):
        self.llm = llm
        self.sandbox = sandbox
        self.use_aider = os.getenv("USE_AIDER", "false").lower() == "true"
        self.max_iters = int(os.getenv("MAX_ITERS", "3"))
        self.workspace = os.getenv("WORKSPACE_DIR", ".")
        self.aider = AiderWrapper() if self.use_aider else None

    def log(self, io: NodeIO, msg: str):
        io.logs.append(msg)
        print(msg)

    def _plan(self, io: NodeIO) -> Dict[str, Any]:
        system = "You are a planning agent. Produce a short next step with {action,target,notes}. Return JSON only."
        user = f"Goal: {io.goal}\nState: {io.state}"
        step = self.llm.complete_json(system, user)
        self.log(io, f"Plan: {step}")
        io.state["last_step"] = step
        return step

    def _retrieve(self, io: NodeIO, step: Dict[str, Any]) -> List[Dict[str, Any]]:
        q = (step.get("target") or step.get("action") or io.goal or "").strip()
        snippets = query_symbols(q, k=8)
        io.state["retrieved"] = snippets
        self.log(io, f"Retrieved {len(snippets)} snippets for query '{q}'.")
        return snippets

    def _implement(self, io: NodeIO, task: str, snippets: List[Dict[str, Any]], trace: Optional[str] = None) -> bool:
        patch: Patch = self.llm.propose_patch(task, snippets, trace)
        if self.use_aider and self.aider:
            try:
                out = self.aider.run(patch.diff)
                self.log(io, f"Aider output: {out[:500]}")
            except Exception as e:
                self.log(io, f"Aider error: {e}")
        ok = self.sandbox.apply_patch(patch)
        io.state["last_patch"] = patch
        io.state["last_patch_ok"] = ok
        self.log(io, f"Patch applied: {ok}")
        if ok:
            commit_msg = f"AI patch: {task[:60]}"
            self._git_commit(commit_msg)
        return ok

    def _git_commit(self, message: str):
        try:
            subprocess.run(["git", "add", "-A"], check=False, cwd=self.workspace)
            subprocess.run(["git", "commit", "-m", message], check=False, cwd=self.workspace)
        except Exception:
            pass
    def _test(self, io: NodeIO) -> Dict[str, Any]:
        res: Dict[str, Any] = self.sandbox.run_tests()
        io.state["test_result"] = res
        code = res.get("code")
        ok = res.get("ok")
        stdout = (res.get("stdout") or "")[:800]
        stderr = (res.get("stderr") or "")[:800]
        self.log(io, f"Test result: code={code}, ok={ok}")
        if stdout:
            self.log(io, f"stdout:\n{stdout}")
        if stderr:
            self.log(io, f"stderr:\n{stderr}")
        return res

    def run_once(self, goal: str, init_state: Optional[Dict[str, Any]] = None) -> NodeIO:
        io = NodeIO(goal=goal, state=init_state or {}, logs=[])
        for attempt in range(1, self.max_iters + 1):
            self.log(io, f"--- Iteration {attempt}/{self.max_iters} ---")
            step = self._plan(io)
            snippets = self._retrieve(io, step)
            self._implement(io, goal, snippets)
            result = self._test(io)
            io.state["last_result"] = result
            if result.get("ok"):
                self.log(io, "Green build!")
                break
            trace = ((result.get("stdout") or "") + "\n" + (result.get("stderr") or "")).strip()
            self._implement(io, goal, snippets, trace=trace)
            result = self._test(io)
            io.state["last_result"] = result
            if result.get("ok"):
                self.log(io, "Green build after repair!")
                break
        return io

