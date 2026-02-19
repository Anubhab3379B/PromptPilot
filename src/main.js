// ── Tauri invoke bridge (works with withGlobalTauri + v1/v2) ─────────────────
function invoke(cmd, args = {}) {
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke(cmd, args)
  if (window.__TAURI__?.tauri?.invoke) return window.__TAURI__.tauri.invoke(cmd, args)
  if (window.__TAURI_INVOKE__) return window.__TAURI_INVOKE__(cmd, args)
  // Dev fallback — mock responses
  console.warn('[DEV] Tauri not available, mocking:', cmd, args)
  return Promise.reject('Tauri runtime not found')
}

// ── Model settings (live, no save needed) ────────────────────────────────────
const getGenModel = () => document.getElementById('gen-model')?.value || 'mistral'
const getEmbedModel = () => document.getElementById('embed-model')?.value || 'nomic-embed-text'

// ── Toast ──────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' }
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.innerHTML = `<span class="toast-icon">${icons[type] ?? 'ℹ️'}</span><span class="toast-msg">${msg}</span>`
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 250) }, duration)
}

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(btn, on) {
  if (on) { btn._orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Working…'; btn.disabled = true }
  else { btn.innerHTML = btn._orig || btn.innerHTML; btn.disabled = false }
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => toast(label, 'success')).catch(() => toast('Copy failed', 'error'))
}

// ── Show/hide output ──────────────────────────────────────────────────────────
function showOut(el, text) { el.textContent = text; el.style.display = 'block' }
function hideOut(el) { el.style.display = 'none' }

// ── Sidebar navigation ─────────────────────────────────────────────────────────
const PANEL_TITLES = {
  prompts: '💡 Prompt Library',
  ai: '🤖 AI Coach',
  practice: '🎙️ Practice Mode',
  jobs: '💼 Job Analyzer',
  history: '📚 Answer History',
  vault: '🗄️ Resume Vault',
  audio: '🎧 Audio / Training',
  profiles: '👤 Profiles',
  admin: '🔐 Admin',
  logs: '📋 Audit Log',
  settings: '⚙️ Settings',
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
    item.classList.add('active')
    const panel = item.dataset.panel
    document.getElementById(`panel-${panel}`)?.classList.add('active')
    document.getElementById('topbar-title').textContent = PANEL_TITLES[panel] || ''
  })
})

// ── Ollama status ──────────────────────────────────────────────────────────────
async function checkOllama() {
  const dot = document.getElementById('ollama-dot')
  const label = document.getElementById('ollama-label')
  try {
    const models = await invoke('ollama_status')
    dot.style.background = 'var(--green)'
    dot.style.boxShadow = '0 0 8px var(--green)'
    label.textContent = `Ollama online (${models.length} models)`
    label.style.color = 'var(--green)'
    updateOllamaModelList(models)
    toast(`Ollama ready — ${models.length} model(s) available`, 'success', 2500)
  } catch (e) {
    dot.style.background = 'var(--red)'
    dot.style.boxShadow = '0 0 8px var(--red)'
    label.textContent = 'Ollama offline'
    label.style.color = 'var(--red)'
  }
}

function updateOllamaModelList(models) {
  const el = document.getElementById('ollama-model-list')
  if (!el) return
  el.innerHTML = models.length === 0
    ? '<div style="color:var(--text-muted);font-size:13px">No models pulled yet</div>'
    : models.map(m => `<div style="display:flex;align-items:center;gap:8px;font-size:13px">
        <span class="badge badge-green">●</span> ${m}</div>`).join('')
}

document.getElementById('check-ollama-btn').addEventListener('click', checkOllama)

// ═══════════════════════════════════════════════════════════════════
// PROMPTS panel
// ═══════════════════════════════════════════════════════════════════
const PROMPTS = [
  {
    id: 1, category: 'Behavioural', style: 'STAR', title: 'Overcome a major challenge',
    body: `SITUATION: Set the scene — team size, deadline, what made it hard.\nTASK: Your specific personal responsibility.\nACTION: 3–5 concrete steps you took. Use "I" not "we".\nRESULT: Quantify — % improvement, time saved, revenue impact.\n\nTip: Lead with the result if the interviewer seems rushed.`
  },
  {
    id: 2, category: 'Behavioural', style: 'STAR', title: 'Lead without authority',
    body: `Describe influencing stakeholders without formal authority.\n\nSITUATION: Project and stakeholders.\nTASK: Why you needed to lead — your actual role.\nACTION: How you built buy-in (1:1s, shared metrics, demos).\nRESULT: What shipped and lasting team change.`
  },
  {
    id: 3, category: 'Behavioural', style: 'HYBRID', title: 'Most impactful project you shipped',
    body: `SITUATION: Company stage, team size, tech stack.\nTASK: Your ownership surface.\nACTION:\n• Designed the architecture / API contract\n• Drove alignment across N teams\n• Shipped MVP in X weeks\nRESULT:\n• +N% metric improvement\n• Saved $X per week\n• Led to promotion / follow-on project`
  },
  {
    id: 4, category: 'Technical', style: 'QUANT', title: 'Scale an API to 10k RPS',
    body: `Cover: load balancing, Redis caching (>80% hit rate), read replicas, rate limiting (token bucket), observability (p99 SLOs).\n\nNumbers:\n  10k RPS = 864M req/day\n  CDN offload: 60–70% of static\n  DB replica lag target: <50 ms`
  },
  {
    id: 5, category: 'Technical', style: 'QUANT', title: 'Reduce latency by 50%',
    body: `Diagnosis:\n• Flamegraph → top 3 hot paths\n• DB: N+1, missing indexes?\n• Async I/O, connection pool tuning\n• JSON → Protobuf (3–10× smaller)\n\nTypical wins:\n  DB index → 10–100× speedup\n  In-process cache → 5–50×\n  Async I/O → 2–10× throughput`
  },
  {
    id: 6, category: 'Leadership', style: 'HYBRID', title: 'Managing an underperformer',
    body: `SITUATION: Give an anonymised real example.\nACTION:\n• Weekly 1:1 with structured agenda\n• Written PIP — measurable 30/60/90-day goals\n• Paired with senior engineer\nRESULT:\n• 70% turned around in 60 days\n• 30% graceful off-boarding`
  },
  {
    id: 7, category: 'Leadership', style: 'STAR', title: 'Building team culture',
    body: `Describe intentional culture changes you made.\nACTION examples: blameless post-mortems, pairing rotations, demo Fridays.\nRESULT signals:\n  eNPS change, attrition reduction, time-to-onboard, shipping velocity`
  },
  {
    id: 8, category: 'Product', style: 'HYBRID', title: 'Design a product feature',
    body: `Framework:\n1. Clarify scope — users, platform, business goal\n2. Segment users — power vs. casual\n3. Pain points — rank by frequency × severity\n4. Pick 1 → define success metric (north-star + guardrails)\n5. Generate 3 solutions → evaluate impact/effort/risk\n6. MVP scope (in/out of v1)\n7. Measure: adoption rate (leading), D30 retention (lagging)`
  },
  {
    id: 9, category: 'Product', style: 'QUANT', title: 'Diagnose a metric drop',
    body: `DAU dropped 10% WoW.\n\nStep 1 — Is it real? Check SDK, segmentation, outages.\nStep 2 — Hypothesis tree:\n  Acquisition → traffic drop?\n  Activation → signup funnel regression?\n  Retention  → D1/D7/D30 cohort?\nStep 3 — Prioritise by effort × likelihood\nStep 4 — Fix + monitoring alert`
  },
]

const CATEGORIES = [...new Set(PROMPTS.map(p => p.category))]

let selectedPrompt = null

function renderPrompts(cat) {
  const list = document.getElementById('prompt-list')
  const items = cat === 'All' ? PROMPTS : PROMPTS.filter(p => p.category === cat)
  list.innerHTML = items.map(p => `
    <div class="prompt-item" data-id="${p.id}">
      <span class="prompt-item-style">${p.style}</span>
      <div class="prompt-item-title">${p.title}</div>
      <div class="prompt-item-preview">${p.body.split('\n')[0]}</div>
    </div>`).join('')
  list.querySelectorAll('.prompt-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedPrompt = PROMPTS.find(p => p.id === +el.dataset.id)
      if (!selectedPrompt) return
      document.getElementById('prompt-detail-title').value = selectedPrompt.title
      document.getElementById('prompt-detail-style').value = selectedPrompt.style
      document.getElementById('prompt-detail-body').value = selectedPrompt.body
      const card = document.getElementById('prompt-detail-card')
      card.style.display = 'block'
      card.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
}

function initPrompts() {
  const pills = document.getElementById('cat-pills')
  const cats = ['All', ...CATEGORIES]
  pills.innerHTML = cats.map((c, i) =>
    `<div class="cat-pill${i === 0 ? ' active' : ''}" data-cat="${c}">${c}</div>`).join('')
  pills.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pills.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'))
      pill.classList.add('active')
      renderPrompts(pill.dataset.cat)
    })
  })
  renderPrompts('All')
}

document.getElementById('copy-prompt-btn').addEventListener('click', () => {
  const body = document.getElementById('prompt-detail-body').value
  if (body) copyText(body, 'Prompt copied!')
})

document.getElementById('goto-ai-btn').addEventListener('click', () => {
  if (!selectedPrompt) return
  document.getElementById('ai-question').value = selectedPrompt.title + '\n' + selectedPrompt.body
  document.getElementById('ai-style').value = selectedPrompt.style
  document.querySelector('[data-panel="ai"]').click()
})

// ═══════════════════════════════════════════════════════════════════
// AI COACH panel
// ═══════════════════════════════════════════════════════════════════
let lastSavedHistId = null

// Fetch RAG context
document.getElementById('ai-rag-btn').addEventListener('click', async () => {
  const q = document.getElementById('ai-question').value.trim()
  if (!q) { toast('Enter a question first', 'error'); return }
  const btn = document.getElementById('ai-rag-btn')
  setLoading(btn, true)
  try {
    const ctx = await invoke('rag_build_context', { query: q, topK: 5, embedModel: getEmbedModel() })
    document.getElementById('ai-context').value = ctx || '(No relevant context found — ingest your resume in the Resume Vault)'
    if (ctx) toast('RAG context retrieved!', 'success')
    else toast('No context found — add documents in Resume Vault', 'warn')
  } catch (e) {
    toast(`RAG error: ${e}`, 'error')
  } finally { setLoading(btn, false) }
})

// Generate AI answer
document.getElementById('ai-generate-btn').addEventListener('click', async () => {
  const q = document.getElementById('ai-question').value.trim()
  if (!q) { toast('Enter a question', 'error'); return }
  const btn = document.getElementById('ai-generate-btn')
  setLoading(btn, true)
  const resultCard = document.getElementById('ai-result-card')
  const out = document.getElementById('ai-output')
  out.textContent = '⏳ Generating… this may take 10-30 seconds depending on your hardware.'
  resultCard.style.display = 'block'
  document.getElementById('ai-score-card').style.display = 'none'
  try {
    const answer = await invoke('generate_answer', {
      promptTitle: q,
      promptBody: '',
      ragContext: document.getElementById('ai-context').value,
      style: document.getElementById('ai-style').value,
      model: getGenModel(),
    })
    typewriterEffect(out, answer)
    toast('Answer generated!', 'success')
  } catch (e) {
    out.textContent = `Error: ${e}`
    toast(`Generation failed: ${e}`, 'error')
  } finally { setLoading(btn, false) }
})

function typewriterEffect(el, text, speedMs = 8) {
  el.textContent = ''
  let i = 0
  const tick = () => {
    if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speedMs) }
  }
  tick()
}

document.getElementById('ai-copy-btn').addEventListener('click', () =>
  copyText(document.getElementById('ai-output').textContent, 'Answer copied!'))

document.getElementById('ai-save-btn').addEventListener('click', async () => {
  const answer = document.getElementById('ai-output').textContent.trim()
  if (!answer || answer.startsWith('⏳')) { toast('Nothing to save yet', 'error'); return }
  try {
    const id = await invoke('history_save', {
      promptTitle: document.getElementById('ai-question').value.slice(0, 80),
      promptStyle: document.getElementById('ai-style').value,
      question: document.getElementById('ai-question').value,
      answer,
    })
    lastSavedHistId = id
    toast('Saved to history!', 'success')
  } catch (e) { toast(`Save failed: ${e}`, 'error') }
})

document.getElementById('ai-score-btn').addEventListener('click', async () => {
  const answer = document.getElementById('ai-output').textContent.trim()
  if (!answer || answer.startsWith('⏳')) { toast('Generate an answer first', 'error'); return }
  const btn = document.getElementById('ai-score-btn')
  setLoading(btn, true)
  try {
    const raw = await invoke('score_answer', {
      question: document.getElementById('ai-question').value,
      answer,
      style: document.getElementById('ai-style').value,
      model: getGenModel(),
    })
    renderScoreCard('ai-score-card', 'ai-score-overall', 'ai-score-dims', 'score-feedback', raw)
    if (lastSavedHistId) await invoke('history_save_score', { id: lastSavedHistId, scoreJson: raw })
  } catch (e) { toast(`Scoring failed: ${e}`, 'error') }
  finally { setLoading(btn, false) }
})

document.getElementById('ai-practice-btn').addEventListener('click', () => {
  const answer = document.getElementById('ai-output').textContent
  const q = document.getElementById('ai-question').value
  document.getElementById('prac-question').value = q
  document.getElementById('prac-transcript').value = answer
  document.querySelector('[data-panel="practice"]').click()
})

function renderScoreCard(cardId, overallId, dimsId, feedId, raw) {
  let parsed
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { toast('Score parse error', 'warn'); return }
  const card = document.getElementById(cardId)
  card.style.display = 'block'
  document.getElementById(overallId).textContent = `${parsed.overall ?? '?'}/10`
  const dims = parsed.dimensions || {}
  document.getElementById(dimsId).innerHTML = Object.entries(dims).map(([k, v]) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="text-transform:capitalize;color:var(--text-dim)">${k}</span>
        <span style="font-weight:600">${v}/10</span>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${v * 10}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:3px;transition:width .6s ease"></div>
      </div>
    </div>`).join('')
  const strengths = (parsed.strengths || []).map(s => `<li style="color:var(--green);font-size:13px">✓ ${s}</li>`).join('')
  const improvements = (parsed.improvements || []).map(s => `<li style="color:var(--amber);font-size:13px">→ ${s}</li>`).join('')
  const closing = parsed.improved_closing ? `<div style="margin-top:8px;padding:10px;background:rgba(99,102,241,.08);border-radius:8px;font-size:13px;color:var(--text-dim)"><strong style="color:var(--accent)">Stronger closing:</strong><br/>${parsed.improved_closing}</div>` : ''
  document.getElementById(feedId).innerHTML = `<ul style="padding-left:16px;margin-bottom:8px">${strengths}${improvements}</ul>${closing}`
  card.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ═══════════════════════════════════════════════════════════════════
// PRACTICE MODE
// ═══════════════════════════════════════════════════════════════════
let practiceTimer = null
let practiceSeconds = 120
let recognition = null
let isRecording = false

function updateTimerDisplay() {
  const m = Math.floor(practiceSeconds / 60).toString()
  const s = (practiceSeconds % 60).toString().padStart(2, '0')
  const el = document.getElementById('prac-timer')
  el.textContent = `${m}:${s}`
  el.style.color = practiceSeconds <= 20 ? 'var(--red)' : practiceSeconds <= 40 ? 'var(--amber)' : 'var(--accent)'
}

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.continuous = true
  r.interimResults = true
  r.lang = 'en-US'
  let final = ''
  r.onresult = e => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) final += t + ' '
      else interim = t
    }
    document.getElementById('prac-transcript').value = final + interim
  }
  r.onerror = e => toast(`Mic error: ${e.error}`, 'error')
  return r
}

document.getElementById('prac-start-btn').addEventListener('click', () => {
  if (isRecording) return
  isRecording = true
  practiceSeconds = 120
  updateTimerDisplay()
  document.getElementById('prac-status').textContent = '🔴 Recording'
  document.getElementById('prac-status').className = 'badge badge-red'
  document.getElementById('prac-start-btn').disabled = true
  document.getElementById('prac-stop-btn').disabled = false
  document.getElementById('prac-transcript').value = ''

  practiceTimer = setInterval(() => {
    practiceSeconds--
    updateTimerDisplay()
    if (practiceSeconds <= 0) { document.getElementById('prac-stop-btn').click() }
  }, 1000)

  recognition = setupSpeechRecognition()
  if (recognition) recognition.start()
  else toast('Web Speech API not available on this platform — type your answer manually', 'warn')
})

document.getElementById('prac-stop-btn').addEventListener('click', () => {
  if (!isRecording) return
  isRecording = false
  clearInterval(practiceTimer)
  if (recognition) { try { recognition.stop() } catch { } }
  document.getElementById('prac-status').textContent = '✅ Done'
  document.getElementById('prac-status').className = 'badge badge-green'
  document.getElementById('prac-start-btn').disabled = false
  document.getElementById('prac-stop-btn').disabled = true
  toast('Recording stopped — review your transcript', 'info')
})

document.getElementById('prac-reset-btn').addEventListener('click', () => {
  practiceSeconds = 120
  updateTimerDisplay()
  isRecording = false
  clearInterval(practiceTimer)
  if (recognition) { try { recognition.stop() } catch { } }
  document.getElementById('prac-status').textContent = 'Ready'
  document.getElementById('prac-status').className = 'badge badge-amber'
  document.getElementById('prac-start-btn').disabled = false
  document.getElementById('prac-stop-btn').disabled = true
})

document.getElementById('prac-score-btn').addEventListener('click', async () => {
  const q = document.getElementById('prac-question').value.trim()
  const a = document.getElementById('prac-transcript').value.trim()
  if (!q || !a) { toast('Fill in both question and transcript', 'error'); return }
  const btn = document.getElementById('prac-score-btn')
  setLoading(btn, true)
  try {
    const raw = await invoke('score_answer', { question: q, answer: a, style: 'STAR', model: getGenModel() })
    renderScoreCard('prac-score-card', 'prac-score-overall', 'prac-score-dims', 'prac-score-feedback', raw)
  } catch (e) { toast(`Scoring error: ${e}`, 'error') }
  finally { setLoading(btn, false) }
})

document.getElementById('prac-save-btn').addEventListener('click', async () => {
  const q = document.getElementById('prac-question').value.trim()
  const a = document.getElementById('prac-transcript').value.trim()
  if (!a) { toast('Nothing to save', 'error'); return }
  try {
    await invoke('history_save', { promptTitle: q.slice(0, 80), promptStyle: 'PRACTICE', question: q, answer: a })
    toast('Practice session saved!', 'success')
  } catch (e) { toast(`Save failed: ${e}`, 'error') }
})

// ═══════════════════════════════════════════════════════════════════
// JOB ANALYZER
// ═══════════════════════════════════════════════════════════════════
document.getElementById('jd-analyze-btn').addEventListener('click', async () => {
  const jd = document.getElementById('jd-input').value.trim()
  if (!jd) { toast('Paste a job description first', 'error'); return }
  const btn = document.getElementById('jd-analyze-btn')
  setLoading(btn, true)
  document.getElementById('jd-results').style.display = 'none'
  try {
    const raw = await invoke('analyze_job', { jobText: jd, model: getGenModel() })
    let parsed
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch {
      toast('Could not parse AI response. Try again.', 'error'); return
    }
    document.getElementById('jd-overview').innerHTML = `
      <div><span style="color:var(--text-muted);font-size:11px">ROLE</span><br/><strong>${parsed.role || '—'}</strong></div>
      <div><span style="color:var(--text-muted);font-size:11px">LEVEL</span><br/><strong>${parsed.level || '—'}</strong></div>
      <div><span style="color:var(--text-muted);font-size:11px">COMPANY TYPE</span><br/><strong>${parsed.company_type || '—'}</strong></div>`
    document.getElementById('jd-competencies').innerHTML =
      (parsed.key_competencies || []).map(c => `<span class="cat-pill active" style="cursor:default">${c}</span>`).join('')
    document.getElementById('jd-questions').innerHTML =
      (parsed.likely_questions || []).map(q => `
        <div class="prompt-item" style="cursor:default">
          <span class="prompt-item-style">${q.category || 'General'}</span>
          <div class="prompt-item-title">${q.question || q}</div>
        </div>`).join('')
    const tips = (parsed.preparation_tips || []).map(t => `<li style="font-size:13px;color:var(--text-dim);margin-bottom:6px">${t}</li>`).join('')
    const culture = (parsed.culture_signals || []).map(c => `<li style="font-size:13px;color:var(--cyan);margin-bottom:4px">${c}</li>`).join('')
    document.getElementById('jd-tips-culture').innerHTML = `
      <div><strong style="color:var(--text-muted);font-size:11px;text-transform:uppercase">Prep Tips</strong><ul style="padding-left:16px;margin-top:8px">${tips}</ul></div>
      <div><strong style="color:var(--text-muted);font-size:11px;text-transform:uppercase">Culture Signals</strong><ul style="padding-left:16px;margin-top:8px">${culture}</ul></div>`
    document.getElementById('jd-results').style.display = 'block'
    toast('Job description analyzed!', 'success')
    document.getElementById('jd-results').scrollIntoView({ behavior: 'smooth' })
  } catch (e) { toast(`Analysis failed: ${e}`, 'error') }
  finally { setLoading(btn, false) }
})

// ═══════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════
let histFavsOnly = false

async function loadHistory() {
  const el = document.getElementById('history-list')
  try {
    const records = await invoke('history_list', { limit: 100, favouritesOnly: histFavsOnly })
    if (!records.length) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:16px">No saved answers yet</div>'; return
    }
    el.innerHTML = records.map(r => {
      let scoreLabel = ''
      if (r.score_json) {
        try {
          const s = JSON.parse(r.score_json.match(/\{[\s\S]*\}/)?.[0] || r.score_json)
          if (s.overall) scoreLabel = `<span class="badge badge-indigo">Score: ${s.overall}/10</span>`
        } catch { }
      }
      const fav = r.favourite ? '⭐' : '☆'
      return `
        <div class="history-item" data-id="${r.id}" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <span class="badge badge-indigo" style="margin-right:6px">${r.prompt_style}</span>
              ${scoreLabel}
              <span style="font-weight:600;font-size:13px;margin-left:6px">${r.prompt_title}</span>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn-sm btn-icon hist-fav-btn" data-id="${r.id}" title="Favourite">${fav}</button>
              <button class="btn-sm btn-icon hist-copy-btn" data-id="${r.id}" title="Copy">📋</button>
              <button class="btn-sm btn-icon btn-danger hist-del-btn" data-id="${r.id}" title="Delete">🗑️</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${r.created_at}</div>
          <div style="font-size:13px;color:var(--text-dim);white-space:pre-wrap;max-height:120px;overflow:hidden;text-overflow:ellipsis">${r.answer.slice(0, 400)}${r.answer.length > 400 ? '…' : ''}</div>
        </div>`
    }).join('')

    el.querySelectorAll('.hist-fav-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = +btn.dataset.id
        await invoke('history_toggle_fav', { id })
        await loadHistory()
      })
    })
    el.querySelectorAll('.hist-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const record = records.find(r => r.id === +btn.dataset.id)
        if (record) copyText(record.answer, 'Answer copied!')
      })
    })
    el.querySelectorAll('.hist-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this answer?')) return
        await invoke('history_delete', { id: +btn.dataset.id })
        toast('Deleted', 'info')
        await loadHistory()
      })
    })
  } catch (e) {
    el.innerHTML = `<div style="color:var(--red);font-size:13px">Error: ${e}</div>`
  }
}

document.getElementById('hist-all-btn').addEventListener('click', () => {
  histFavsOnly = false
  document.getElementById('hist-all-btn').classList.add('active')
  document.getElementById('hist-fav-btn').classList.remove('active')
  loadHistory()
})
document.getElementById('hist-fav-btn').addEventListener('click', () => {
  histFavsOnly = true
  document.getElementById('hist-fav-btn').classList.add('active')
  document.getElementById('hist-all-btn').classList.remove('active')
  loadHistory()
})
document.getElementById('hist-refresh-btn').addEventListener('click', () => { loadHistory(); toast('Refreshed', 'info') })
document.getElementById('hist-clear-btn').addEventListener('click', async () => {
  if (!confirm('Clear ALL saved answers? This cannot be undone.')) return
  await invoke('history_clear_all')
  toast('All history cleared', 'info')
  await loadHistory()
})

// ═══════════════════════════════════════════════════════════════════
// RESUME VAULT
// ═══════════════════════════════════════════════════════════════════
async function loadVaultDocs() {
  const el = document.getElementById('vault-doc-list')
  try {
    const docs = await invoke('rag_list_docs')
    el.innerHTML = docs.length === 0
      ? '<div style="color:var(--text-muted);font-size:13px">No documents ingested yet</div>'
      : docs.map(d => {
        const name = d.split(' (')[0]
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
            <span style="font-size:13px">${d}</span>
            <button class="btn-sm btn-danger vault-del-btn" data-name="${name}">🗑️</button>
          </div>`
      }).join('')
    el.querySelectorAll('.vault-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete "${btn.dataset.name}"?`)) return
        await invoke('rag_delete_doc', { filename: btn.dataset.name })
        toast('Document deleted', 'info')
        await loadVaultDocs()
      })
    })
  } catch (e) { el.innerHTML = `<div style="color:var(--red)">Error: ${e}</div>` }
}

document.getElementById('vault-ingest-btn').addEventListener('click', async () => {
  const name = document.getElementById('vault-name').value.trim()
  const content = document.getElementById('vault-content').value.trim()
  if (!name || !content) { toast('Fill in document name and content', 'error'); return }
  const btn = document.getElementById('vault-ingest-btn')
  setLoading(btn, true)
  try {
    const r = await invoke('rag_ingest', { filename: name, content, embedModel: getEmbedModel() })
    showOut(document.getElementById('vault-out'), `✅ Ingested "${r.filename}"\n${r.chunks} chunks, ${r.embedded} embedded`)
    toast(`"${name}" ingested — ${r.embedded} chunks embedded`, 'success')
    document.getElementById('vault-name').value = ''
    document.getElementById('vault-content').value = ''
    await loadVaultDocs()
  } catch (e) {
    showOut(document.getElementById('vault-out'), `Error: ${e}`)
    toast(`Ingest failed: ${e}`, 'error')
  } finally { setLoading(btn, false) }
})

document.getElementById('vault-refresh-btn').addEventListener('click', () => { loadVaultDocs(); toast('Refreshed', 'info') })

document.getElementById('vault-test-btn').addEventListener('click', async () => {
  const q = document.getElementById('vault-test-query').value.trim()
  if (!q) { toast('Enter a query', 'error'); return }
  const btn = document.getElementById('vault-test-btn')
  setLoading(btn, true)
  try {
    const chunks = await invoke('rag_retrieve', { query: q, topK: 3, embedModel: getEmbedModel() })
    const el = document.getElementById('vault-test-out')
    el.innerHTML = chunks.length === 0
      ? '<div style="color:var(--text-muted);font-size:13px">No matching chunks found</div>'
      : chunks.map(c => `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
            <div style="font-size:11px;color:var(--cyan);margin-bottom:6px">${c.filename} — chunk ${c.chunk_idx} — score ${c.score?.toFixed(3)}</div>
            <div style="font-size:12px;color:var(--text-dim)">${c.content}</div>
          </div>`).join('')
    toast(`Retrieved ${chunks.length} chunks`, 'success')
  } catch (e) { toast(`Retrieve error: ${e}`, 'error') }
  finally { setLoading(btn, false) }
})

// ═══════════════════════════════════════════════════════════════════
// AUDIO / TRAINING panel
// ═══════════════════════════════════════════════════════════════════
const DATASETS = [
  { name: 'Mozilla Common Voice 13 (English)', size: '~28 GB', license: 'CC0', url: 'https://commonvoice.mozilla.org/en/datasets', cmd: 'python scripts/audio_datasets.py --dataset common_voice --language en' },
  { name: 'LibriSpeech (clean 100h)', size: '~6.3 GB', license: 'CC BY 4.0', url: 'https://www.openslr.org/12', cmd: 'python scripts/audio_datasets.py --dataset librispeech --split train-clean-100' },
  { name: 'VoxPopuli (English, 400h)', size: '~41 GB', license: 'CC0', url: 'https://github.com/facebookresearch/voxpopuli', cmd: 'python scripts/audio_datasets.py --dataset voxpopuli --language en' },
  { name: 'TEDLIUM 3 (interview-style speech)', size: '~19 GB', license: 'CC BY-NC-ND', url: 'https://www.openslr.org/51', cmd: 'python scripts/audio_datasets.py --dataset tedlium3' },
]

function renderDatasets() {
  const el = document.getElementById('dataset-list')
  el.innerHTML = DATASETS.map(d => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;flex-wrap:wrap;gap:6px">
        <strong style="font-size:13px">${d.name}</strong>
        <div style="display:flex;gap:6px">
          <span class="badge badge-amber">${d.size}</span>
          <span class="badge badge-green">${d.license}</span>
        </div>
      </div>
      <div class="output-box" style="font-size:11px;color:var(--text-muted);min-height:unset;padding:6px 10px;margin-bottom:8px">${d.cmd}</div>
      <div style="display:flex;gap:8px">
        <button class="btn-sm" onclick="copyText('${d.cmd}','Command copied!')">📋 Copy</button>
        <a href="${d.url}" target="_blank" style="color:var(--accent);font-size:12px;line-height:32px">🌐 Dataset page</a>
      </div>
    </div>`).join('')
}

const TRAIN_CMD = `python scripts/whisper_finetune.py \\
  --dataset_name mozilla-foundation/common_voice_13_0 \\
  --language en \\
  --model_name openai/whisper-small \\
  --output_dir ./models/whisper-interview \\
  --num_epochs 3 \\
  --batch_size 8`

document.getElementById('copy-train-cmd-btn')?.addEventListener('click', () => copyText(TRAIN_CMD, 'Training command copied!'))

// ═══════════════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════════════
async function loadProfiles() {
  const grid = document.getElementById('profile-grid')
  try {
    const profiles = await invoke('list_profiles')
    if (!profiles?.length) { grid.innerHTML = '<div style="color:var(--text-muted);font-size:13px">No profiles yet</div>'; return }
    grid.innerHTML = profiles.map(p => `
      <div class="profile-card">
        <div class="profile-avatar">👤</div>
        <div class="profile-name">${p.display_name}</div>
        <div class="profile-id">@${p.user_id}</div>
        <div class="profile-pk">${p.pubkey_b64.slice(0, 32)}…</div>
      </div>`).join('')
  } catch (e) { grid.innerHTML = `<div style="color:var(--red)">Error: ${e}</div>` }
}

document.getElementById('create_profile').addEventListener('click', async () => {
  const userId = document.getElementById('uid').value.trim()
  const displayName = document.getElementById('name').value.trim()
  const passphrase = document.getElementById('pw').value
  if (!userId || !displayName || !passphrase) { toast('Fill in all fields', 'error'); return }
  const btn = document.getElementById('create_profile')
  setLoading(btn, true)
  try {
    const r = await invoke('create_profile', { userId, displayName, passphrase })
    showOut(document.getElementById('create_out'), JSON.stringify(r, null, 2))
    toast(`Profile "${displayName}" created!`, 'success')
    document.getElementById('uid').value = ''; document.getElementById('name').value = ''; document.getElementById('pw').value = ''
    await loadProfiles()
  } catch (e) { showOut(document.getElementById('create_out'), `Error: ${e}`); toast(`Error: ${e}`, 'error') }
  finally { setLoading(btn, false) }
})
document.getElementById('refresh-profiles').addEventListener('click', () => { loadProfiles(); toast('Refreshed', 'info') })

// ═══════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════
document.getElementById('admin_nonce').addEventListener('click', async () => {
  try {
    const n = await invoke('admin_get_nonce')
    const d = document.getElementById('nonce-display')
    d.innerHTML = `${n}<button class="output-copy" id="nonce-copy">Copy</button>`
    document.getElementById('nonce-copy').addEventListener('click', () => copyText(n, 'Nonce copied!'))
    toast('Nonce generated', 'info')
  } catch (e) { toast(`Error: ${e}`, 'error') }
})
document.getElementById('admin_unlock').addEventListener('click', async () => {
  const sig = document.getElementById('sig').value.trim()
  if (!sig) { toast('Paste signature first', 'error'); return }
  try {
    const r = await invoke('admin_unlock', { signatureB64: sig })
    showOut(document.getElementById('admin_out'), `Admin unlocked: ${r}`)
    updateAdminBanner(true); toast('Admin mode unlocked! 🎉', 'success')
  } catch (e) { showOut(document.getElementById('admin_out'), `Error: ${e}`); toast(`Unlock failed: ${e}`, 'error') }
})
document.getElementById('admin_status').addEventListener('click', async () => {
  try {
    const r = await invoke('admin_status'); updateAdminBanner(r)
    toast(`Admin: ${r ? '🔓 Unlocked' : '🔒 Locked'}`, r ? 'success' : 'info')
  } catch (e) { toast(`Error: ${e}`, 'error') }
})
function updateAdminBanner(unlocked) {
  const el = document.getElementById('admin-status-banner')
  el.className = unlocked ? 'admin-unlocked-banner' : 'admin-locked'
  el.innerHTML = unlocked ? '🔓 &nbsp;Admin mode is <strong>unlocked</strong>.' : '🔒 &nbsp;Admin mode is <strong>locked</strong>.'
}
document.getElementById('req_consent').addEventListener('click', async () => {
  const userId = document.getElementById('c_user').value.trim()
  if (!userId) { toast('Enter user ID', 'error'); return }
  try {
    const r = await invoke('request_user_consent', { userId, action: 'DEMO_ACTION' })
    document.getElementById('consent_out').textContent = JSON.stringify({ userId: r[0], nonce: r[1] }, null, 2)
    document.getElementById('consent_nonce').value = r[1]
    toast('Consent requested', 'info')
  } catch (e) { toast(`Error: ${e}`, 'error') }
})
document.getElementById('verify_consent').addEventListener('click', async () => {
  const userId = document.getElementById('c_user').value.trim()
  const consentNonce = document.getElementById('consent_nonce').value.trim()
  const userSignatureB64 = document.getElementById('user_sig').value.trim()
  const userPubkeyB64 = document.getElementById('user_pub').value.trim()
  if (!userId || !consentNonce || !userSignatureB64 || !userPubkeyB64) { toast('Fill all fields', 'error'); return }
  try {
    const ok = await invoke('verify_user_consent_and_authorize', { userId, consentNonce, userSignatureB64, userPubkeyB64 })
    showOut(document.getElementById('verify_out'), `✅ Authorized: ${ok}`)
    toast('Consent verified!', 'success')
  } catch (e) { showOut(document.getElementById('verify_out'), `❌ ${e}`); toast(`Verify failed: ${e}`, 'error') }
})

// ═══════════════════════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════════════════════
async function loadLogTable() {
  const tbody = document.getElementById('log-table-body')
  try {
    const entries = await invoke('get_recent_logs', { limit: 20 })
    if (!entries?.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No entries</td></tr>'; return
    }
    tbody.innerHTML = entries.map(e => `<tr>
      <td>${e.id}</td><td class="ts-cell">${e.ts}</td><td class="event-cell">${e.event}</td>
      <td class="hash-cell">${e.hash_prev.slice(0, 12)}…</td>
      <td class="hash-cell">${e.hash_curr.slice(0, 12)}…</td></tr>`).join('')
  } catch { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">Not available</td></tr>' }
}
document.getElementById('append_log').addEventListener('click', async () => {
  const event = document.getElementById('log_event').value.trim()
  if (!event) { toast('Enter event text', 'error'); return }
  try {
    const h = await invoke('append_event', { event })
    showOut(document.getElementById('log_out'), `Head: ${h}`)
    document.getElementById('log_event').value = ''
    toast('Event logged!', 'success'); await loadLogTable()
  } catch (e) { toast(`Error: ${e}`, 'error') }
})
document.getElementById('log_head').addEventListener('click', async () => {
  try { const h = await invoke('get_admin_log_head'); showOut(document.getElementById('log_out'), `Head: ${h}`) }
  catch (e) { toast(`Error: ${e}`, 'error') }
})
document.getElementById('refresh-logs').addEventListener('click', () => { loadLogTable(); toast('Refreshed', 'info') })

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════
document.getElementById('save_style').addEventListener('click', async () => {
  const style = document.getElementById('style').value
  try {
    await invoke('set_answer_style', { style })
    const s = await invoke('get_answer_style')
    showOut(document.getElementById('style_out'), `✅ Saved: ${s}`)
    toast(`Style set to "${s}"`, 'success')
  } catch (e) { toast(`Error: ${e}`, 'error') }
})
document.getElementById('unlock-btn').addEventListener('click', async () => {
  const userId = document.getElementById('unlock-uid').value.trim()
  const passphrase = document.getElementById('unlock-pw').value
  if (!userId || !passphrase) { toast('Fill both fields', 'error'); return }
  try {
    const ok = await invoke('unlock_profile', { userId, passphrase })
    showOut(document.getElementById('unlock_out'), ok ? `✅ Unlocked "${userId}"` : '❌ Wrong passphrase')
    toast(ok ? 'Profile unlocked!' : 'Wrong passphrase', ok ? 'success' : 'error')
  } catch (e) { showOut(document.getElementById('unlock_out'), `Error: ${e}`); toast(`Error: ${e}`, 'error') }
})

async function loadAnswerStyle() {
  try { const s = await invoke('get_answer_style'); if (s) document.getElementById('style').value = s } catch { }
}

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
async function init() {
  initPrompts()
  updateTimerDisplay()
  renderDatasets()
  await Promise.allSettled([
    loadAnswerStyle(),
    loadProfiles(),
    loadLogTable(),
    loadHistory(),
    loadVaultDocs(),
    checkOllama(),
  ])
}

init()
