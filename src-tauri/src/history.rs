
//! Answer history — save, retrieve, favourite, score, delete

use crate::security::open_db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AnswerRecord {
    pub id:           i64,
    pub prompt_title: String,
    pub prompt_style: String,
    pub question:     String,
    pub answer:       String,
    pub score_json:   Option<String>,
    pub favourite:    bool,
    pub created_at:   String,
}

fn ensure_history_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS answer_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_title TEXT    NOT NULL,
            prompt_style TEXT    NOT NULL,
            question     TEXT    NOT NULL DEFAULT '',
            answer       TEXT    NOT NULL,
            score_json   TEXT,
            favourite    INTEGER DEFAULT 0,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn history_save(
    prompt_title: String,
    prompt_style: String,
    question: String,
    answer: String,
) -> Result<i64, String> {
    let conn = open_db("history.db");
    ensure_history_table(&conn)?;
    conn.execute(
        "INSERT INTO answer_history(prompt_title, prompt_style, question, answer) VALUES(?1,?2,?3,?4)",
        params![prompt_title, prompt_style, question, answer],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn history_save_score(id: i64, score_json: String) -> Result<(), String> {
    let conn = open_db("history.db");
    conn.execute(
        "UPDATE answer_history SET score_json=?1 WHERE id=?2",
        params![score_json, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn history_toggle_fav(id: i64) -> Result<bool, String> {
    let conn = open_db("history.db");
    ensure_history_table(&conn)?;
    let current: i64 = conn.query_row(
        "SELECT favourite FROM answer_history WHERE id=?1",
        params![id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    let new_val = if current == 0 { 1i64 } else { 0i64 };
    conn.execute(
        "UPDATE answer_history SET favourite=?1 WHERE id=?2",
        params![new_val, id],
    ).map_err(|e| e.to_string())?;
    Ok(new_val == 1)
}

#[tauri::command]
pub fn history_list(limit: u32, favourites_only: bool) -> Result<Vec<AnswerRecord>, String> {
    let conn = open_db("history.db");
    ensure_history_table(&conn)?;
    let sql = if favourites_only {
        "SELECT id, prompt_title, prompt_style, COALESCE(question,''), answer, score_json, favourite, COALESCE(created_at,'') \
         FROM answer_history WHERE favourite=1 ORDER BY id DESC LIMIT ?1"
    } else {
        "SELECT id, prompt_title, prompt_style, COALESCE(question,''), answer, score_json, favourite, COALESCE(created_at,'') \
         FROM answer_history ORDER BY id DESC LIMIT ?1"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let records: Vec<AnswerRecord> = stmt
        .query_map(params![limit.min(200)], |row| {
            Ok(AnswerRecord {
                id:           row.get(0)?,
                prompt_title: row.get(1)?,
                prompt_style: row.get(2)?,
                question:     row.get(3)?,
                answer:       row.get(4)?,
                score_json:   row.get(5)?,
                favourite:    row.get::<_, i64>(6)? == 1,
                created_at:   row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(records)
}

#[tauri::command]
pub fn history_delete(id: i64) -> Result<(), String> {
    let conn = open_db("history.db");
    conn.execute("DELETE FROM answer_history WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn history_clear_all() -> Result<usize, String> {
    let conn = open_db("history.db");
    ensure_history_table(&conn)?;
    let n = conn.execute("DELETE FROM answer_history", [])
        .map_err(|e| e.to_string())?;
    Ok(n)
}
