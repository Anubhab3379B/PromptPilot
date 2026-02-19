
//! Ollama local-LLM bridge
//! Requires: ollama running at http://localhost:11434
//! Install:  https://ollama.com  →  ollama pull mistral
//!           ollama pull nomic-embed-text

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const OLLAMA: &str = "http://127.0.0.1:11434";

fn client_gen() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(300)) // 5 min for generation
        .build()
        .unwrap()
}
fn client_fast() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap()
}

// ── Embedding ────────────────────────────────────────────────────────────────
#[derive(Serialize)]
struct EmbedReq { model: String, prompt: String }
#[derive(Deserialize)]
struct EmbedResp { embedding: Vec<f32> }

pub fn embed(text: &str, model: &str) -> Result<Vec<f32>, String> {
    let resp = client_fast()
        .post(format!("{OLLAMA}/api/embeddings"))
        .json(&EmbedReq { model: model.into(), prompt: text.into() })
        .send()
        .map_err(|e| format!("Ollama unreachable — is Ollama running? {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Embed error {}: {}", resp.status(), resp.text().unwrap_or_default()));
    }
    let r: EmbedResp = resp.json().map_err(|e| e.to_string())?;
    Ok(r.embedding)
}

// ── Generate ────────────────────────────────────────────────────────────────
#[derive(Serialize)]
struct GenReq { model: String, prompt: String, stream: bool }
#[derive(Deserialize)]
struct GenResp { response: String }

pub fn generate(prompt: &str, model: &str) -> Result<String, String> {
    let resp = client_gen()
        .post(format!("{OLLAMA}/api/generate"))
        .json(&GenReq { model: model.into(), prompt: prompt.into(), stream: false })
        .send()
        .map_err(|e| format!("Ollama unreachable: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Generate error {}: {}", resp.status(), resp.text().unwrap_or_default()));
    }
    let r: GenResp = resp.json().map_err(|e| e.to_string())?;
    Ok(r.response)
}

// ── Status ───────────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize)]
pub struct OllamaModel { pub name: String }
#[derive(Deserialize)]
struct TagsResp { models: Vec<OllamaModel> }

#[tauri::command]
pub fn ollama_status() -> Result<Vec<String>, String> {
    let resp = client_fast()
        .get(format!("{OLLAMA}/api/tags"))
        .send()
        .map_err(|_| "Ollama offline. Install: https://ollama.com  then run: ollama pull mistral && ollama pull nomic-embed-text".to_string())?;
    let r: TagsResp = resp.json().map_err(|e| e.to_string())?;
    Ok(r.models.into_iter().map(|m| m.name).collect())
}

// ── AI Answer Generation (with RAG context) ──────────────────────────────────
#[tauri::command]
pub fn generate_answer(
    prompt_title: String,
    prompt_body: String,
    rag_context: String,
    style: String,
    model: String,
) -> Result<String, String> {
    let context_block = if rag_context.trim().is_empty() {
        "No personal context provided — give a general example answer.".to_string()
    } else {
        format!("--- USER'S PERSONAL CONTEXT (from their resume/notes) ---\n{rag_context}\n---")
    };

    let prompt = format!(
        "You are an expert interview coach. Generate a personalized interview answer.\n\n\
         FORMAT: {style} style\n\
         - STAR: Situation → Task → Action → Result\n\
         - QUANT: Bullet points with specific metrics and numbers\n\
         - HYBRID: STAR structure + quantified bullets in the Result\n\n\
         INTERVIEW QUESTION / PROMPT:\n\
         Topic: {prompt_title}\n\
         Details: {prompt_body}\n\n\
         {context_block}\n\n\
         INSTRUCTIONS:\n\
         1. Use ONLY the personal context above to make the answer specific\n\
         2. Make every claim concrete — include numbers, timeframes, team sizes\n\
         3. Keep it under 280 words (≈ 2 minutes spoken)\n\
         4. Use first-person \"I\" statements, not \"we\"\n\
         5. Lead with the strongest signal for this role\n\n\
         Generate the answer now:"
    );
    generate(&prompt, &model)
}

// ── Answer Scorer ────────────────────────────────────────────────────────────
#[tauri::command]
pub fn score_answer(
    question: String,
    answer: String,
    style: String,
    model: String,
) -> Result<String, String> {
    let prompt = format!(
        "You are an expert interview coach. Evaluate this interview answer rigorously.\n\n\
         Question: {question}\n\
         Expected style: {style}\n\
         Candidate's answer:\n{answer}\n\n\
         Return ONLY valid JSON with this exact structure (no markdown, no explanation):\n\
         {{\n\
           \"overall\": 7,\n\
           \"dimensions\": {{\n\
             \"specificity\": 8,\n\
             \"quantification\": 6,\n\
             \"structure\": 7,\n\
             \"relevance\": 8,\n\
             \"confidence\": 7\n\
           }},\n\
           \"strengths\": [\"strength 1\", \"strength 2\"],\n\
           \"improvements\": [\"improvement 1\", \"improvement 2\"],\n\
           \"improved_closing\": \"A stronger 1-2 sentence closing for this answer.\"\n\
         }}"
    );
    generate(&prompt, &model)
}

// ── Job Description Analyzer ─────────────────────────────────────────────────
#[tauri::command]
pub fn analyze_job(job_text: String, model: String) -> Result<String, String> {
    let prompt = format!(
        "You are a career coach. Analyze this job description for interview preparation.\n\n\
         JOB DESCRIPTION:\n{job_text}\n\n\
         Return ONLY valid JSON (no markdown) with this structure:\n\
         {{\n\
           \"role\": \"exact job title\",\n\
           \"level\": \"junior/mid/senior/staff/lead\",\n\
           \"company_type\": \"startup/scale-up/enterprise/agency\",\n\
           \"key_competencies\": [\"6-8 core skills they MUST have\"],\n\
           \"likely_questions\": [\n\
             {{\"question\": \"...\", \"category\": \"Behavioural/Technical/Leadership/Product\"}}\n\
           ],\n\
           \"culture_signals\": [\"3-4 values/culture signals from the text\"],\n\
           \"red_flags\": [\"any concerning signals, or empty array\"],\n\
           \"preparation_tips\": [\"4 specific preparation tips for this exact role\"]\n\
         }}"
    );
    generate(&prompt, &model)
}
