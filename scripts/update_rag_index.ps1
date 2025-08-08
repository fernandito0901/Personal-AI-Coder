param(
  [string]$Workspace = (Get-Location).Path
)

Write-Host "Building symbol index for: $Workspace"

$code = "from retrieval.index import build_index; import sys; root = sys.argv[1] if len(sys.argv) > 1 else '.'; print(build_index(root))"

$count = python -c "$code" --% "$Workspace"
Write-Host "Indexed symbols:" $count