param(
  [string]$Workspace = (Get-Location).Path
)

Write-Host "Building symbol index for: $Workspace"

$py = @'
from retrieval.index import build_index
import sys
root = sys.argv[1] if len(sys.argv) > 1 else "."
count = build_index(root)
print(count)
'@

$count = python -c $py --% "$Workspace"
Write-Host "Indexed symbols:" $count