# PromptPilot 1‑Click Installer (DEBUG)
# - Runs in the current PowerShell window (no auto re-launch)
# - Writes a transcript log on Desktop
# - Shows every command & error (no Out-Null)
# Usage: Open PowerShell as Administrator, then:  .\PromptPilot-1click-Debug.ps1

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$logPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "PromptPilot-Installer-Log.txt"
Start-Transcript -Path $logPath -Append | Out-Null
Write-Host "Logging to: $logPath" -ForegroundColor Yellow

function Step([string]$msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# 0) Sanity checks
Step "Environment check"
Write-Host ("PSVersion: " + $PSVersionTable.PSVersion)
Write-Host ("ExecutionPolicy (Process/User/Machine): " + (Get-ExecutionPolicy -List | Out-String))

# 1) Locate repo zip next to script
$scriptDir = Split-Path -Parent $PSCommandPath
$zipPath = Join-Path $scriptDir "promptpilot-merged.zip"
if (!(Test-Path $zipPath)) {
  Write-Host "ERROR: 'promptpilot-merged.zip' is not next to this script: $scriptDir" -ForegroundColor Red
  Stop-Transcript
  exit 1
}
Write-Host "Found repo zip at: $zipPath"

# 2) winget check
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: 'winget' not found. Install 'App Installer' from Microsoft Store, then re-run." -ForegroundColor Red
  Write-Host "Store link: ms-windows-store://pdp/?productid=9NBLGGH4NNS1"
  Stop-Transcript
  exit 1
}
Step "winget version"
winget --version

# 3) Install prerequisites
Step "Installing prerequisites (Node LTS, Rustup, VS Build Tools)"
winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
winget install --id Rustlang.Rustup  --exact --accept-package-agreements --accept-source-agreements
winget install --id Microsoft.VisualStudio.2022.BuildTools --exact --accept-package-agreements --accept-source-agreements

# 4) Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")
Step "Versions after install"
node -v
npm -v
rustup --version
rustc -V

# 5) Workspace
$dest = Join-Path $env:LOCALAPPDATA "PromptPilot"
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Step "Unzipping to $dest"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $dest, $true)

# 6) npm install & build
Step "Installing npm deps"
Push-Location $dest
npm install

Step "Building MSI with Tauri"
npm run tauri build

# 7) Locate MSI
$msiRoot = Join-Path $dest "src-tauri\target\release\bundle\msi"
if (!(Test-Path $msiRoot)) {
  Write-Host "ERROR: MSI folder not found: $msiRoot" -ForegroundColor Red
  Pop-Location
  Stop-Transcript
  exit 1
}
$msi = Get-ChildItem $msiRoot -Filter "*.msi" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($null -eq $msi) {
  Write-Host "ERROR: No MSI produced." -ForegroundColor Red
  Pop-Location
  Stop-Transcript
  exit 1
}
Write-Host "MSI: $($msi.FullName)"
Step "Launching installer"
Start-Process -FilePath "$($msi.FullName)"
Pop-Location

Write-Host "`nSUCCESS. Installer launched. If it didn't open, double-click: $($msi.FullName)" -ForegroundColor Green
Stop-Transcript
