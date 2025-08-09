Param(
  [string]$Config = "training/axolotl.yaml"
)

Write-Host "Starting SFT (stub) using $Config" -ForegroundColor Cyan
# Replace the echo with your real Axolotl command once your A5000/A100 is ready, e.g.:
# accelerate launch -m axolotl.cli.train $Config
Start-Sleep -Seconds 2
Write-Host "SFT completed (stub). See adapters/sft/ for outputs." -ForegroundColor Green
