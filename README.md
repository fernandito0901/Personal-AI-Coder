AI Coder

Mission: A minimal, trainable AI coding agent with a plan→retrieve→edit→test loop.

Prerequisites
- Windows 10/11 (PowerShell), Python 3.11+
- Docker Desktop (optional for sandboxed pytest)
- Ollama (optional; default local model: qwen2.5-coder:7b-instruct-q4_K_M)
- OpenAI API key (optional; uses OpenAI if provided)
- Aider (optional; set USE_AIDER=true to use aider for patching)

.env example
OPENAI_API_KEY=         # leave empty to use Ollama
SMART_MODEL=gpt-4o-mini # used when OPENAI_API_KEY set
FAST_MODEL=gpt-4o-mini
LOCAL_LLM=qwen2.5-coder:7b-instruct-q4_K_M
USE_AIDER=false
MAX_ITERS=3
TEST_CMD=pytest -q

Start sandbox (Docker)
- powershell -File scripts/start_sandbox.ps1
- powershell -File scripts/stop_sandbox.ps1

Build retrieval index
- powershell -File scripts/update_rag_index.ps1

Run one task
- powershell -File scripts/run_task.ps1 -Goal "Fix failing pytest tests"

Evaluate on dummy tasks
- python -m eval.run_eval

Training (Axolotl, sample)
- Adjust training/axolotl.yaml to your infra (GPU required)
- Datasets expected in data/task_to_patch/*.jsonl, data/error_to_fix/*.jsonl, data/api_usage/*.jsonl

Notes
- If docker/docker-compose.yml exists, tests run in Docker; else they run locally.
- If USE_AIDER=true, aider --yes --no-auto-commit is attempted; otherwise patches are applied directly and committed with message "AI patch".
- Retrieval index is Python-only today and writes to .ai_index/index.json.
