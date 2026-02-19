<div align="center">
  <h1>🧭 PromptPilot</h1>
  <p><strong>Secure, privacy-first interview prep & prompt management</strong><br/>
  by <a href="#">Next Problem?</a></p>

  <img src="https://img.shields.io/badge/version-1.1.0-6366f1?style=flat-square"/>
  <img src="https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square&logo=windows"/>
  <img src="https://img.shields.io/badge/built_with-Tauri_v2-FFC131?style=flat-square&logo=tauri"/>
  <img src="https://img.shields.io/badge/Rust-stable-CE422B?style=flat-square&logo=rust"/>
  <img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square"/>
</div>

---

## ✨ Features

| Feature | Details |
|---|---|
| 💡 **Prompt Library** | 9 built-in templates across Behavioural, Technical, Leadership & Product Sense categories |
| 🤝 **Consent Flows** | Users sign nonces to authorize admin actions |
| 📋 **Audit Log** | Hash-chained append-only log stored in SQLite |
| ⚙️ **Answer Style** | STAR / Quant Bullets / Hybrid — persisted across sessions |
| 🎬 **Animated Splash** | Premium installer/first-run brand animation |
| 📦 **One-click Installer** | Windows MSI + NSIS via GitHub Actions |

---

## 🚀 Quick Start

### Prerequisites
- [Rust stable](https://rustup.rs) + `cargo`
- [Node.js 18+](https://nodejs.org)

### Dev Mode
```powershell
npm install
npm run tauri dev
```

### Build Installer (Windows)
```powershell
.\scripts\build-windows.ps1
# MSI: src-tauri\target\release\bundle\msi\
# NSIS: src-tauri\target\release\bundle\nsis\
```

### CI / GitHub Actions
Push a tag to trigger an automatic release:
```bash
git tag v1.2.0 && git push origin v1.2.0
```
The workflow builds the MSI + NSIS installers and uploads them as a GitHub Release.

---

## 🏗️ Architecture

```
promptpilot/
├── src/                    # Frontend (HTML + CSS + JS)
│   ├── index.html          # Sidebar app with 6 panels
│   ├── styles.css          # Glassmorphism design system
│   ├── main.js             # Tauri invoke calls, toast system, prompt library
│   └── assets/brand.html   # Animated splash screen
├── src-tauri/src/          # Rust backend
│   ├── admin.rs            # Ed25519 nonce challenge & consent
│   ├── users.rs            # Profile creation, keypair management
│   ├── logs.rs             # Hash-chained SQLite audit log
│   ├── ui.rs               # Answer style (persisted to SQLite)
│   ├── policy.rs           # Capability allowlist engine
│   └── security.rs         # AppState, DB helpers
├── .github/workflows/      # CI: MSI + NSIS build & GitHub Release
└── scripts/                # build-windows.ps1 one-click builder
```

---

## 📄 License

[MIT](LICENSE) © 2025 Next Problem?
