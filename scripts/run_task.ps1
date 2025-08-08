# run one end-to-end task
param(
  [Parameter(Mandatory=$true)][string]$Goal,
  [string]$Model = $env:DEFAULT_MODEL
)

$env:DEFAULT_MODEL = $Model

Write-Host "Running task with goal: $Goal"

$py = @'
from orchestrator.graph import Orchestrator
from orchestrator.tools import LLMClient, SandboxClient
import sys, json

goal = sys.argv[1] if len(sys.argv) > 1 else ""
orc = Orchestrator(LLMClient(), SandboxClient())
io = orc.run_once(goal=goal)
print("\n--- LOGS ---")
for line in io.logs:
    print(line)
print("\n--- STATE ---")
print(json.dumps(io.state, indent=2, default=str))
'@

python -c $py --% "$Goal"

