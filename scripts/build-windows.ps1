Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if(!(Get-Command rustup -ErrorAction SilentlyContinue)){throw 'Install Rust: https://rustup.rs'}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Install Node 18+: https://nodejs.org'}
npm install
npm run tauri build
Write-Host 'Done. MSI: src-tauri/target/release/bundle/msi/'
