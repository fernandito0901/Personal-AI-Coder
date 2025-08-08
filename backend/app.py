from __future__ import annotations
import asyncio
import os
import threading
import uuid
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from orchestrator.graph import Orchestrator
from orchestrator.tools import LLMClient, SandboxClient
from retrieval.index import build_index

try:
    import keyring  # type: ignore
except Exception:
    keyring = None

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    def load_dotenv(*args, **kwargs):
        return False


class RunTaskReq(BaseModel):
    repo_path: str
    instruction: str
    max_iters: Optional[int] = None
    use_aider: Optional[bool] = None


class ReindexReq(BaseModel):
    repo_path: str


class TrainReq(BaseModel):
    kind: str  # sft | dpo


class LoadAdapterReq(BaseModel):
    path: str


class EvalReq(BaseModel):
    repo_path: str


class Job:
    def __init__(self, job_id: str):
        self.id = job_id
        self.status = "pending"
        self.logs: List[Dict[str, Any]] = []
        self.result: Optional[Dict[str, Any]] = None
        self._event_listeners: List[asyncio.Queue] = []

    def emit(self, event: Dict[str, Any]):
        self.logs.append(event)
        for q in list(self._event_listeners):
            try:
                q.put_nowait(event)
            except Exception:
                pass

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._event_listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._event_listeners:
            self._event_listeners.remove(q)


class JobManager:
    def __init__(self):
        self.jobs: Dict[str, Job] = {}

    def create(self) -> Job:
        jid = str(uuid.uuid4())
        job = Job(jid)
        self.jobs[jid] = job
        return job

    def get(self, jid: str) -> Optional[Job]:
        return self.jobs.get(jid)


jobs = JobManager()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri file:// origin compatibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    load_dotenv()
    # hydrate OPENAI_API_KEY from Windows Credential Manager
    if keyring:
        try:
            val = keyring.get_password("ai-coder", "OPENAI_API_KEY")
            if val:
                os.environ["OPENAI_API_KEY"] = val
        except Exception:
            pass


@app.post("/tasks/run")
async def run_task(req: RunTaskReq):
    job = jobs.create()
    job.status = "running"

    def on_event(evt: Dict[str, Any]):
        job.emit(evt)

    # Ensure index
    try:
        count = build_index(req.repo_path)
        on_event({"type": "index", "count": count})
    except Exception as e:
        on_event({"type": "index_error", "error": str(e)})

    def worker():
        try:
            # set env for orchestrator
            if req.max_iters is not None:
                os.environ["MAX_ITERS"] = str(req.max_iters)
            if req.use_aider is not None:
                os.environ["USE_AIDER"] = "true" if req.use_aider else "false"
            os.environ["WORKSPACE_DIR"] = req.repo_path
            # Run orchestrator
            orc = Orchestrator(LLMClient(), SandboxClient(), on_event=on_event)
            io = orc.run_once(goal=req.instruction)
            job.result = {"ok": bool(io.state.get("last_result", {}).get("ok")), "state": io.state}
            job.status = "done"
        except Exception as e:
            job.result = {"ok": False, "error": str(e)}
            job.status = "error"

    threading.Thread(target=worker, daemon=True).start()
    return JSONResponse({"job_id": job.id})


@app.get("/tasks/{job_id}")
async def get_task(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return JSONResponse({"error": "not_found"}, status_code=404)
    return JSONResponse({"id": job.id, "status": job.status, "result": job.result, "logs": job.logs})


@app.websocket("/tasks/{job_id}/stream")
async def stream(job_id: str, ws: WebSocket):
    job = jobs.get(job_id)
    if not job:
        await ws.close(code=4404)
        return
    await ws.accept()
    q = job.subscribe()
    try:
        # Send backlog first
        for evt in job.logs:
            await ws.send_json(evt)
        # Then stream live
        while True:
            evt = await q.get()
            await ws.send_json(evt)
    except WebSocketDisconnect:
        pass
    finally:
        job.unsubscribe(q)


@app.post("/rag/reindex")
async def reindex(req: ReindexReq):
    count = build_index(req.repo_path)
    return {"count": count}


@app.post("/train/sft")
async def train_sft():
    # Launch Axolotl via subprocess; user must have it available
    import subprocess
    def worker():
        # Placeholder: echo; replace with real axolotl command
        subprocess.run(["cmd", "/c", "echo Training SFT... && timeout /t 2 >NUL"], check=False)
    threading.Thread(target=worker, daemon=True).start()
    return {"ok": True}


@app.post("/train/dpo")
async def train_dpo():
    import subprocess
    def worker():
        subprocess.run(["cmd", "/c", "echo Training DPO... && timeout /t 2 >NUL"], check=False)
    threading.Thread(target=worker, daemon=True).start()
    return {"ok": True}


@app.get("/train/datasets")
async def dataset_counts():
    def count_lines(path: str) -> int:
        total = 0
        for base, _, files in os.walk(path):
            for f in files:
                if f.endswith(".jsonl"):
                    try:
                        with open(os.path.join(base, f), "r", encoding="utf-8", errors="ignore") as fh:
                            total += sum(1 for _ in fh if _.strip())
                    except Exception:
                        pass
        return total
    root = "data"
    return {
        "task_to_patch": count_lines(os.path.join(root, "task_to_patch")),
        "error_to_fix": count_lines(os.path.join(root, "error_to_fix")),
        "api_usage": count_lines(os.path.join(root, "api_usage")),
        "prefs": count_lines(os.path.join(root, "prefs")),
    }


@app.post("/adapters/load")
async def adapters_load(req: LoadAdapterReq):
    os.environ["ADAPTER_PATH"] = req.path
    return {"ok": True}


@app.post("/eval/run")
async def eval_run(req: EvalReq):
    import subprocess
    # Run evaluation script
    proc = subprocess.run(["cmd", "/c", f"python eval\\run_eval.py"], capture_output=True, text=True)
    return {"ok": proc.returncode == 0, "stdout": proc.stdout, "stderr": proc.stderr}


@app.post("/settings/save")
async def settings_save(data: Dict[str, Any]):
    # Store to .env and Windows Credential Manager for secrets
    openai_key = data.get("OPENAI_API_KEY")
    local_llm = data.get("LOCAL_LLM")
    docker = data.get("USE_DOCKER")
    test_cmd = data.get("TEST_CMD")
    # write non-secrets to env
    if local_llm:
        os.environ["LOCAL_LLM"] = str(local_llm)
    if docker is not None:
        os.environ["USE_DOCKER"] = "true" if docker else "false"
    if test_cmd:
        os.environ["TEST_CMD"] = str(test_cmd)
    if keyring and openai_key:
        try:
            keyring.set_password("ai-coder", "OPENAI_API_KEY", openai_key)
        except Exception:
            pass
    return {"ok": True}


@app.get("/settings")
async def settings_get():
    # Never return secrets
    return {
        "LOCAL_LLM": os.getenv("LOCAL_LLM"),
        "USE_DOCKER": os.getenv("USE_DOCKER", "true"),
        "TEST_CMD": os.getenv("TEST_CMD", "pytest -q"),
    }
