import { invoke } from '@tauri-apps/api/tauri'

// ── Toast system ─────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => {
    el.classList.add('fade-out')
    setTimeout(() => el.remove(), 220)
  }, duration)
}

// ── Loading helper ────────────────────────────────────────────────────────────
function setLoading(btn, loading) {
  if (loading) {
    btn._origText = btn.innerHTML
    btn.innerHTML = '<span class="spinner"></span> Working…'
    btn.disabled = true
  } else {
    btn.innerHTML = btn._origText || btn.innerHTML
    btn.disabled = false
  }
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => toast(`${label}`, 'success'))
}

function showOutput(el, text, visible = true) {
  el.textContent = text
  el.style.display = visible ? 'block' : 'none'
}

// ── Sidebar navigation ────────────────────────────────────────────────────────
const panelTitles = {
  prompts: '💡 Prompt Library',
  profiles: '👤 Profiles',
  admin: '🔐 Admin',
  consent: '🤝 Consent',
  logs: '📋 Audit Log',
  settings: '⚙️ Settings',
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
    item.classList.add('active')
    const panel = item.dataset.panel
    document.getElementById(`panel-${panel}`).classList.add('active')
    document.getElementById('topbar-title').textContent = panelTitles[panel] || ''
  })
})

// ── Built-in prompt library ───────────────────────────────────────────────────
const PROMPTS = [
  {
    id: 1, category: 'Behavioural', style: 'STAR',
    title: 'Tell me about a challenge you overcame',
    body: `Tell me about a time you faced a significant challenge at work.

[SITUATION] Set the scene: team size, timeline, and what made it hard.
[TASK] Be specific about your personal responsibility.
[ACTION] Walk through 3–5 concrete steps you took. Use "I", not "we".
[RESULT] Quantify: % improvement, time saved, revenue impact, or team outcome.

Tip: Keep it under 2 minutes. Lead with the result if the interviewer seems rushed.`,
  },
  {
    id: 2, category: 'Behavioural', style: 'STAR',
    title: 'Describe a time you led without authority',
    body: `Describe a situation where you influenced others without formal authority.

[SITUATION] What was the project and who were the stakeholders?
[TASK] Why did you need to lead, and what was your actual role?
[ACTION] How did you build buy-in? (1:1s, shared metrics, demos, etc.)
[RESULT] What shipped? What was the team's reaction? Any lasting change?

Tip: Show self-awareness — acknowledge where you could have done better.`,
  },
  {
    id: 3, category: 'Behavioural', style: 'HYBRID',
    title: 'Most impactful project you shipped',
    body: `Walk me through the most impactful project you've shipped.

[SITUATION] Company stage, team size, tech stack.
[TASK] Your ownership surface (end-to-end, or segment?).
[ACTION]
• Designed the architecture / API contract
• Drove alignment across X teams
• Shipped MVP in Y weeks, iterated to v2 in Z weeks
[RESULT]
• +N% metric improvement
• Saved $X / Y hours per week
• Led to [promotion / follow-on project / customer retention]

Tip: Use a 30-second elevator version first; expand on request.`,
  },
  {
    id: 4, category: 'Technical', style: 'QUANT',
    title: 'System design — scale an API',
    body: `Design an API that handles 10,000 requests per second.

Key areas to cover:
• Load balancing strategy (round-robin, least-conn, consistent hashing)
• Caching layer: Redis / Memcached — cache-hit rate target > 80 %
• Database: read replicas, connection pooling (pgBouncer)
• Rate limiting: token bucket at edge (Nginx / Envoy)
• Observability: p50 / p99 latency SLOs, error budget, alerting
• Failure modes: circuit breaker, bulkhead, retry with backoff

Numbers to know:
  10 k RPS = 864 M req/day
  Typical CDN offload: 60–70 % of static traffic
  DB read replica lag target: < 50 ms`,
  },
  {
    id: 5, category: 'Technical', style: 'QUANT',
    title: 'Reduce system latency by 50 %',
    body: `How would you reduce p99 latency by 50 % on a slow service?

Diagnosis checklist:
• Profile with flamegraph — find top 3 hot paths
• DB: N+1 queries? Missing indexes? Full-table scans?
• Network: serialisation overhead (JSON → protobuf = 3–10× smaller)
• Concurrency: async I/O, connection pool tuning
• Caching: memoize expensive computations, pre-compute at write time

Typical wins table:
  DB index         → 10–100× query speedup
  In-process cache → 5–50× for repeated lookups
  Async I/O        → 2–10× throughput increase
  Batching I/O     → 2–5× reduction in RTTs

Deliver: before/after p99 chart, load-test evidence.`,
  },
  {
    id: 6, category: 'Leadership', style: 'HYBRID',
    title: 'How do you manage underperformers?',
    body: `How do you handle an underperforming team member?

[SITUATION] Give a specific (anonymised) real example.
[TASK] What was your responsibility as their manager?
[ACTION]
• Set up weekly 1:1 with structured agenda
• Written PIP with clear, measurable 30/60/90-day goals
• Paired with senior engineer for knowledge transfer
• Weekly check-in with skip-level for early signal
[RESULT]
• 70 % of the time: person turned around within 60 days
• 30 % of the time: graceful off-boarding, preserving dignity

Key principle: separate the person from the performance. Document everything.`,
  },
  {
    id: 7, category: 'Leadership', style: 'STAR',
    title: 'Building team culture',
    body: `How have you intentionally built a strong team culture?

[SITUATION] New team, acquired team, or culture reset scenario.
[TASK] What cultural problems existed? What did you want to build instead?
[ACTION] Describe 3–5 concrete rituals or changes you introduced:
  e.g., blameless post-mortems, pairing rotations, demo Fridays, reading clubs.
[RESULT] Measurable culture signals:
  • eNPS score change
  • Attrition reduction
  • Time-to-onboard improvement
  • qualitative: "the team started shipping faster / fighting less"

Tip: Mention one culture attempt that DIDN'T work — shows self-reflection.`,
  },
  {
    id: 8, category: 'Product Sense', style: 'HYBRID',
    title: 'Design a product feature',
    body: `Design a new feature for [product]. Walk me through your process.

Framework (use explicitly in interview):
1. Clarify scope — who are the users? What platform? What's the business goal?
2. Define user segments — power user vs. casual; mobile vs. desktop
3. Pain points — list 3–5, rank by frequency × severity
4. Prioritise 1 pain point → define success metric (north-star + guardrails)
5. Generate 3 solutions → evaluate on: impact / effort / risk
6. Pick 1 → describe MVP (what's in/out of v1)
7. Measure: leading indicator (feature adoption rate), lagging (retention D30)

Common mistakes:
  • Jumping to solution before defining the user ❌
  • No clear success metric ❌
  • Ignoring technical feasibility ❌`,
  },
  {
    id: 9, category: 'Product Sense', style: 'QUANT',
    title: 'Improve a declining metric',
    body: `Daily active users dropped 10 % week-over-week. What do you do?

Step 1 — Is the data real?
  • Check instrumentation (SDK bug? Sampling change?)
  • Segment: all platforms or just iOS? All geos or one country?
  • Correlate with releases, outages, competitor news

Step 2 — Hypothesis tree
  Acquisition issue → paid/organic traffic drop?
  Activation issue → signup funnel regression?
  Retention issue  → D1 / D7 / D30 cohort comparison?
  Resurrection     → re-engagement campaign timing?

Step 3 — Prioritise hypothesis by:
  Effort to test × Likelihood of being root cause

Step 4 — Corrective action:
  Quick fix + medium-term feature + monitoring alert for future

Always close with: "What success looks like in 2 weeks"`,
  },
]

const CATEGORIES = [...new Set(PROMPTS.map(p => p.category))]

function renderPrompts(category) {
  const list = document.getElementById('prompt-list')
  const filtered = category === 'All' ? PROMPTS : PROMPTS.filter(p => p.category === category)
  list.innerHTML = filtered.map(p => `
    <div class="prompt-item" data-id="${p.id}">
      <div class="prompt-item-title">${p.title}</div>
      <span class="prompt-item-style">${p.style}</span>
      <div class="prompt-item-preview">${p.body.split('\n')[0]}</div>
    </div>
  `).join('')

  list.querySelectorAll('.prompt-item').forEach(el => {
    el.addEventListener('click', () => {
      const prompt = PROMPTS.find(p => p.id === parseInt(el.dataset.id))
      if (!prompt) return
      const card = document.getElementById('prompt-detail-card')
      document.getElementById('prompt-detail-title').value = prompt.title
      document.getElementById('prompt-detail-style').value = prompt.style
      document.getElementById('prompt-detail-body').value = prompt.body
      card.style.display = 'block'
      card.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
}

function initPrompts() {
  const pills = document.getElementById('cat-pills')
  const all = ['All', ...CATEGORIES]
  pills.innerHTML = all.map((c, i) =>
    `<div class="cat-pill${i === 0 ? ' active' : ''}" data-cat="${c}">${c}</div>`
  ).join('')

  let activeCat = 'All'
  pills.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pills.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'))
      pill.classList.add('active')
      activeCat = pill.dataset.cat
      renderPrompts(activeCat)
    })
  })
  renderPrompts('All')
}

document.getElementById('copy-prompt-btn').addEventListener('click', () => {
  const body = document.getElementById('prompt-detail-body').value
  if (body) copyText(body, 'Prompt copied!')
})

// ── Settings – Answer Style ───────────────────────────────────────────────────
const saveStyleBtn = document.getElementById('save_style')
saveStyleBtn.addEventListener('click', async () => {
  const style = document.getElementById('style').value
  setLoading(saveStyleBtn, true)
  try {
    await invoke('set_answer_style', { style })
    const s = await invoke('get_answer_style')
    showOutput(document.getElementById('style_out'), `✅ Saved: ${s}`)
    toast(`Answer style set to "${s}"`, 'success')
  } catch (e) {
    showOutput(document.getElementById('style_out'), `Error: ${e}`)
    toast(`Failed to save style: ${e}`, 'error')
  } finally {
    setLoading(saveStyleBtn, false)
  }
})

async function loadAnswerStyle() {
  try {
    const s = await invoke('get_answer_style')
    if (s) document.getElementById('style').value = s
  } catch { }
}

// ── Profiles ──────────────────────────────────────────────────────────────────
async function loadProfiles() {
  const grid = document.getElementById('profile-grid')
  try {
    const profiles = await invoke('list_profiles')
    if (!profiles || profiles.length === 0) {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:13px">No profiles yet. Create one above!</div>'
      return
    }
    grid.innerHTML = profiles.map(p => `
      <div class="profile-card">
        <div class="profile-avatar">👤</div>
        <div class="profile-name">${p.display_name}</div>
        <div class="profile-id">@${p.user_id}</div>
        <div class="profile-pk">${p.pubkey_b64.slice(0, 32)}…</div>
      </div>
    `).join('')
  } catch (e) {
    grid.innerHTML = `<div style="color:var(--text-muted);font-size:13px">Error loading profiles: ${e}</div>`
  }
}

const createProfileBtn = document.getElementById('create_profile')
createProfileBtn.addEventListener('click', async () => {
  const userId = document.getElementById('uid').value.trim()
  const displayName = document.getElementById('name').value.trim()
  const passphrase = document.getElementById('pw').value
  if (!userId || !displayName || !passphrase) {
    toast('Please fill in all fields', 'error'); return
  }
  setLoading(createProfileBtn, true)
  const out = document.getElementById('create_out')
  try {
    const r = await invoke('create_profile', { userId, displayName, passphrase })
    showOutput(out, JSON.stringify(r, null, 2))
    toast(`Profile "${displayName}" created!`, 'success')
    document.getElementById('uid').value = ''
    document.getElementById('name').value = ''
    document.getElementById('pw').value = ''
    await loadProfiles()
  } catch (e) {
    showOutput(out, `Error: ${e}`)
    toast(`Create failed: ${e}`, 'error')
  } finally {
    setLoading(createProfileBtn, false)
  }
})

document.getElementById('refresh-profiles').addEventListener('click', async () => {
  await loadProfiles()
  toast('Profiles refreshed', 'info')
})

// ── Settings – Unlock Profile ─────────────────────────────────────────────────
const unlockBtn = document.getElementById('unlock-btn')
unlockBtn.addEventListener('click', async () => {
  const userId = document.getElementById('unlock-uid').value.trim()
  const passphrase = document.getElementById('unlock-pw').value
  if (!userId || !passphrase) { toast('Enter user ID and passphrase', 'error'); return }
  setLoading(unlockBtn, true)
  const out = document.getElementById('unlock_out')
  try {
    const ok = await invoke('unlock_profile', { userId, passphrase })
    showOutput(out, ok ? `✅ Profile "${userId}" unlocked` : `❌ Unlock failed`)
    toast(ok ? `Profile "${userId}" unlocked!` : 'Unlock failed — wrong passphrase?', ok ? 'success' : 'error')
  } catch (e) {
    showOutput(out, `Error: ${e}`)
    toast(`Unlock error: ${e}`, 'error')
  } finally {
    setLoading(unlockBtn, false)
  }
})

// ── Admin ─────────────────────────────────────────────────────────────────────
let currentNonce = ''

document.getElementById('admin_nonce').addEventListener('click', async () => {
  try {
    const n = await invoke('admin_get_nonce')
    currentNonce = n
    const display = document.getElementById('nonce-display')
    display.innerHTML = `${n}<button class="output-copy" id="copy-nonce-btn">Copy</button>`
    document.getElementById('copy-nonce-btn').addEventListener('click', () => copyText(n, 'Nonce copied!'))
    toast('Nonce generated — sign it with your admin key', 'info')
  } catch (e) {
    toast(`Nonce error: ${e}`, 'error')
  }
})

const adminUnlockBtn = document.getElementById('admin_unlock')
adminUnlockBtn.addEventListener('click', async () => {
  const sig = document.getElementById('sig').value.trim()
  if (!sig) { toast('Paste the base64 signature first', 'error'); return }
  setLoading(adminUnlockBtn, true)
  const out = document.getElementById('admin_out')
  try {
    const r = await invoke('admin_unlock', { signatureB64: sig })
    showOutput(out, `Admin unlocked: ${r}`)
    updateAdminBanner(true)
    toast('Admin mode unlocked! 🎉', 'success')
  } catch (e) {
    showOutput(out, `Error: ${e}`)
    toast(`Unlock failed: ${e}`, 'error')
  } finally {
    setLoading(adminUnlockBtn, false)
  }
})

document.getElementById('admin_status').addEventListener('click', async () => {
  try {
    const r = await invoke('admin_status')
    updateAdminBanner(r)
    document.getElementById('admin_out').style.display = 'none'
    toast(`Admin status: ${r ? '🔓 Unlocked' : '🔒 Locked'}`, r ? 'success' : 'info')
  } catch (e) {
    toast(`Status error: ${e}`, 'error')
  }
})

function updateAdminBanner(unlocked) {
  const el = document.getElementById('admin-status-banner')
  if (unlocked) {
    el.className = 'admin-unlocked-banner'
    el.innerHTML = '🔓 &nbsp;Admin mode is <strong>unlocked</strong>.'
  } else {
    el.className = 'admin-locked'
    el.innerHTML = '🔒 &nbsp;Admin mode is <strong>locked</strong>. Sign a nonce with your admin private key to unlock.'
  }
}

// ── Consent ───────────────────────────────────────────────────────────────────
const reqConsentBtn = document.getElementById('req_consent')
reqConsentBtn.addEventListener('click', async () => {
  const userId = document.getElementById('c_user').value.trim()
  if (!userId) { toast('Enter a user ID', 'error'); return }
  setLoading(reqConsentBtn, true)
  const out = document.getElementById('consent_out')
  try {
    const r = await invoke('request_user_consent', { userId, action: 'DEMO_ACTION' })
    out.textContent = JSON.stringify({ userId: r[0], nonce: r[1] }, null, 2)
    out.style.display = 'block'
    document.getElementById('consent_nonce').value = r[1]
    toast('Consent request created — give nonce to user to sign', 'info')
  } catch (e) {
    out.textContent = `Error: ${e}`
    out.style.display = 'block'
    toast(`Error: ${e}`, 'error')
  } finally {
    setLoading(reqConsentBtn, false)
  }
})

const verifyConsentBtn = document.getElementById('verify_consent')
verifyConsentBtn.addEventListener('click', async () => {
  const userId = document.getElementById('c_user').value.trim()
  const consentNonce = document.getElementById('consent_nonce').value.trim()
  const userSignatureB64 = document.getElementById('user_sig').value.trim()
  const userPubkeyB64 = document.getElementById('user_pub').value.trim()
  if (!userId || !consentNonce || !userSignatureB64 || !userPubkeyB64) {
    toast('Fill in all consent fields', 'error'); return
  }
  setLoading(verifyConsentBtn, true)
  const out = document.getElementById('verify_out')
  try {
    const ok = await invoke('verify_user_consent_and_authorize', {
      userId, consentNonce, userSignatureB64, userPubkeyB64
    })
    showOutput(out, `✅ Authorized: ${ok}`)
    toast('User consent verified and authorized!', 'success')
  } catch (e) {
    showOutput(out, `❌ Error: ${e}`)
    toast(`Verify failed: ${e}`, 'error')
  } finally {
    setLoading(verifyConsentBtn, false)
  }
})

// ── Logs ──────────────────────────────────────────────────────────────────────
async function loadLogTable() {
  const tbody = document.getElementById('log-table-body')
  try {
    const entries = await invoke('get_recent_logs', { limit: 20 })
    if (!entries || entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:20px">No log entries yet</td></tr>'
      return
    }
    tbody.innerHTML = entries.map(e => `
      <tr>
        <td>${e.id}</td>
        <td class="ts-cell">${e.ts}</td>
        <td class="event-cell">${e.event}</td>
        <td class="hash-cell">${e.hash_prev.slice(0, 16)}…</td>
        <td class="hash-cell">${e.hash_curr.slice(0, 16)}…</td>
      </tr>
    `).join('')
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:20px">Logs not available yet</td></tr>'
  }
}

const appendLogBtn = document.getElementById('append_log')
appendLogBtn.addEventListener('click', async () => {
  const event = document.getElementById('log_event').value.trim()
  if (!event) { toast('Enter an event description', 'error'); return }
  setLoading(appendLogBtn, true)
  const out = document.getElementById('log_out')
  try {
    const h = await invoke('append_event', { event })
    showOutput(out, `✅ Appended. Head hash: ${h}`)
    document.getElementById('log_event').value = ''
    toast('Event logged to audit chain!', 'success')
    await loadLogTable()
  } catch (e) {
    showOutput(out, `Error: ${e}`)
    toast(`Log error: ${e}`, 'error')
  } finally {
    setLoading(appendLogBtn, false)
  }
})

document.getElementById('log_head').addEventListener('click', async () => {
  try {
    const h = await invoke('get_admin_log_head')
    showOutput(document.getElementById('log_out'), `🔗 Head hash: ${h}`)
    toast('Head hash retrieved', 'info')
  } catch (e) {
    toast(`Error: ${e}`, 'error')
  }
})

document.getElementById('refresh-logs').addEventListener('click', async () => {
  await loadLogTable()
  toast('Logs refreshed', 'info')
})

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  initPrompts()
  await loadAnswerStyle()
  await loadProfiles()
  await loadLogTable()
}

init()
