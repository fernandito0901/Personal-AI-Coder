param(
  [string]$ComposeFile = "docker/docker-compose.yml"
)

if (!(Test-Path $ComposeFile)) {
  Write-Host "Compose file not found: $ComposeFile" -ForegroundColor Yellow
  exit 0
}

$cmd = "docker compose -f `"$ComposeFile`" down"
Write-Host "Running: $cmd"
cmd /c $cmd