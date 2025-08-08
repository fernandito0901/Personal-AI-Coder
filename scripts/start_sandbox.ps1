# docker compose up
param(
  [string]$ComposeFile = "docker/docker-compose.yml"
)

if (!(Test-Path $ComposeFile)) {
  Write-Host "Compose file not found: $ComposeFile" -ForegroundColor Red
  exit 1
}

$cmd = "docker compose -f `"$ComposeFile`" up -d"
Write-Host "Running: $cmd"
cmd /c $cmd
