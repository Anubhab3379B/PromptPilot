
//! RAG (Retrieval-Augmented Generation) vector store
//! Uses SQLite for storage, pure-Rust cosine similarity (no external extension needed)

use crate::security::{open_db, db_path};
use crate::llm;
use rusqlite::params;
use serde::{Deserialize, Serialize};

// ── Embedding helpers ────────────────────────────────────────────────────────
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() { return 0.0; }
    let dot: f32   = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 { 0.0 } else { dot / (norm_a * norm_b) }
}
fn emb_to_bytes(emb: &[f32]) -> Vec<u8> {
    emb.iter().flat_map(|f| f.to_le_bytes()).collect()
}
fn bytes_to_emb(bytes: &[u8]) -> Vec<f32> {
    bytes.chunks_exact(4)
         .map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
         .collect()
}

// ── Table ────────────────────────────────────────────────────────────────────
fn ensure_rag_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS rag_docs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            filename    TEXT    NOT NULL,
            chunk_idx   INTEGER NOT NULL,
            content     TEXT    NOT NULL,
            embedding   BLOB,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS rag_filename_idx ON rag_docs(filename);"
    ).map_err(|e| e.to_string())
}

// ── Chunking ─────────────────────────────────────────────────────────────────
fn chunk_text(text: &str, chunk_chars: usize, overlap: usize) -> Vec<String> {
    let chars: Vec<char> = text.chars().collect();
    let mut chunks = Vec::new();
    let mut start = 0;
    while start < chars.len() {
        let end = (start + chunk_chars).min(chars.len());
        let chunk: String = chars[start..end].iter().collect();
        chunks.push(chunk);
        if end == chars.len() { break; }
        start = end.saturating_sub(overlap);
    }
    chunks
}

// ── Structs ───────────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize, Clone)]
pub struct DocChunk {
    pub id:         i64,
    pub filename:   String,
    pub chunk_idx:  i64,
    pub content:    String,
    pub score:      Option<f32>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct IngestResult {
    pub filename: String,
    pub chunks:   usize,
    pub embedded: usize,
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Ingest a text document into the RAG store.
/// Chunks the text and embeds each chunk via Ollama.
#[tauri::command]
pub fn rag_ingest(filename: String, content: String, embed_model: String) -> Result<IngestResult, String> {
    let conn = open_db("rag.db");
    ensure_rag_table(&conn)?;

    // Remove old chunks for same filename
    conn.execute("DELETE FROM rag_docs WHERE filename = ?1", params![filename])
        .map_err(|e| e.to_string())?;

    let chunks = chunk_text(&content, 500, 80);
    let total  = chunks.len();
    let mut embedded = 0;

    for (i, chunk) in chunks.iter().enumerate() {
        let emb_opt = llm::embed(chunk, &embed_model).ok().map(|e| emb_to_bytes(&e));
        conn.execute(
            "INSERT INTO rag_docs(filename, chunk_idx, content, embedding) VALUES(?1,?2,?3,?4)",
            params![filename, i as i64, chunk, emb_opt],
        ).map_err(|e| e.to_string())?;
        if emb_opt.is_some() { embedded += 1; }
    }

    Ok(IngestResult { filename, chunks: total, embedded })
}

/// Retrieve the top-k most relevant chunks for a query.
#[tauri::command]
pub fn rag_retrieve(query: String, top_k: u32, embed_model: String) -> Result<Vec<DocChunk>, String> {
    let conn = open_db("rag.db");
    ensure_rag_table(&conn)?;

    let query_emb = llm::embed(&query, &embed_model)?;

    let mut stmt = conn.prepare(
        "SELECT id, filename, chunk_idx, content, embedding, COALESCE(created_at,'') FROM rag_docs WHERE embedding IS NOT NULL"
    ).map_err(|e| e.to_string())?;

    let mut scored: Vec<(f32, DocChunk)> = stmt
        .query_map([], |row| {
            let emb_bytes: Vec<u8> = row.get(4)?;
            Ok((
                emb_bytes,
                DocChunk {
                    id:         row.get(0)?,
                    filename:   row.get(1)?,
                    chunk_idx:  row.get(2)?,
                    content:    row.get(3)?,
                    score:      None,
                    created_at: row.get(5)?,
                },
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(|(bytes, mut chunk)| {
            let emb   = bytes_to_emb(&bytes);
            let score = cosine_similarity(&query_emb, &emb);
            chunk.score = Some(score);
            (score, chunk)
        })
        .collect();

    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    Ok(scored.into_iter().take(top_k.min(20) as usize).map(|(_, c)| c).collect())
}

/// Build a combined context string from top-k chunks (used by generate_answer).
#[tauri::command]
pub fn rag_build_context(query: String, top_k: u32, embed_model: String) -> Result<String, String> {
    let chunks = rag_retrieve(query, top_k, embed_model)?;
    if chunks.is_empty() {
        return Ok(String::new());
    }
    let context = chunks.iter()
        .enumerate()
        .map(|(i, c)| format!("[{}] (from: {})\n{}", i + 1, c.filename, c.content))
        .collect::<Vec<_>>()
        .join("\n\n");
    Ok(context)
}

/// List all ingested document filenames.
#[tauri::command]
pub fn rag_list_docs() -> Result<Vec<String>, String> {
    let conn = open_db("rag.db");
    ensure_rag_table(&conn)?;
    let mut stmt = conn.prepare(
        "SELECT filename, COUNT(*) as n FROM rag_docs GROUP BY filename ORDER BY MAX(created_at) DESC"
    ).map_err(|e| e.to_string())?;
    let names: Vec<String> = stmt
        .query_map([], |row| {
            let name: String  = row.get(0)?;
            let count: i64    = row.get(1)?;
            Ok(format!("{} ({} chunks)", name, count))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(names)
}

/// Delete all chunks for a document.
#[tauri::command]
pub fn rag_delete_doc(filename: String) -> Result<usize, String> {
    let conn = open_db("rag.db");
    let n = conn.execute("DELETE FROM rag_docs WHERE filename = ?1", params![filename])
        .map_err(|e| e.to_string())?;
    Ok(n)
}
