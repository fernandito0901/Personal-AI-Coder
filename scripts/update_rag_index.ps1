Param(
  [string]$Root = $env:WORKSPACE_DIR
)

if (-not $Root -or -not (Test-Path $Root)) {
  Write-Host "Set WORKSPACE_DIR in .env or pass -Root <path>" -ForegroundColor Yellow
  exit 1
}

Write-Host "Rebuilding symbol index for $Root ..." -ForegroundColor Cyan

$env:PYTHONPATH = "$PSScriptRoot\.."
python - << 'PY'
import os, json
from retrieval.index import build_index
root = os.environ.get("WORKSPACE_DIR") or os.getcwd()
index_path, n = build_index(root)
print(f"Index written to {index_path} with {n} symbols.")
PY
