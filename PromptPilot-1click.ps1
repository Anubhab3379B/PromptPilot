# PromptPilot 1‑Click Web Installer (Windows)
# Usage: Right-click > Run with PowerShell (as Administrator).
# Place this .ps1 in the same folder as "promptpilot-merged.zip".

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Elevating to Administrator..."
  $psi = New-Object System.Diagnostics.ProcessStartInfo "PowerShell"
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $psi.Verb = "runas"
  [System.Diagnostics.Process]::Start($psi) | Out-Null
  exit
}

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

$scriptDir = Split-Path -Parent $PSCommandPath
$zipPath = Join-Path $scriptDir "promptpilot-merged.zip"
if (!(Test-Path $zipPath)) {
  Write-Host "Could not find 'promptpilot-merged.zip' next to this script." -ForegroundColor Red
  exit 1
}

if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "winget is not available. Install 'App Installer' from Microsoft Store, then re-run." -ForegroundColor Red
  Start-Process "ms-windows-store://pdp/?productid=9NBLGGH4NNS1"
  exit 1
}

Step "Installing prerequisites (Node LTS, Rustup, VS Build Tools)"
winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements | Out-Null
winget install --id Rustlang.Rustup --exact --silent --accept-package-agreements --accept-source-agreements | Out-Null
winget install --id Microsoft.VisualStudio.2022.BuildTools --exact --silent --accept-package-agreements --accept-source-agreements | Out-Null

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

$dest = Join-Path $env:LOCALAPPDATA "PromptPilot"
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Step "Unzipping repo to $dest"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $dest)

Step "Installing npm deps"
Push-Location $dest
npm install

Step "Building MSI with Tauri"
npm run tauri build

$msiRoot = Join-Path $dest "src-tauri\\target\\release\\bundle\\msi"
if (!(Test-Path $msiRoot)) {
  Write-Host "Build finished but MSI folder not found. Check build logs above." -ForegroundColor Yellow
  Pop-Location
  exit 1
}

$msi = Get-ChildItem $msiRoot -Filter "*.msi" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($null -eq $msi) {
  Write-Host "No MSI produced. See build output above." -ForegroundColor Yellow
  Pop-Location
  exit 1
}

Step "Launching installer: $($msi.FullName)"
Start-Process -FilePath "$($msi.FullName)"
Pop-Location

Write-Host "`nAll set. If the installer doesn't open, double-click it here:`n$($msi.FullName)" -ForegroundColor Green
