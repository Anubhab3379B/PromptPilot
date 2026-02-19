
use crate::security::open_db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

#[derive(Serialize, Deserialize, Clone)]
pub struct LogEntry {
    pub id: i64,
    pub ts: String,
    pub event: String,
    pub hash_prev: String,
    pub hash_curr: String,
}

fn head_hash(conn: &rusqlite::Connection) -> Option<String> {
    let mut stmt = conn.prepare("SELECT hash_curr FROM logs ORDER BY id DESC LIMIT 1").ok()?;
    let mut rows = stmt.query([]).ok()?;
    if let Some(row) = rows.next().ok()? {
        let h: String = row.get(0).ok()?; Some(h)
    } else { None }
}

fn ensure_logs_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT, ts DATETIME DEFAULT CURRENT_TIMESTAMP, event TEXT, hash_prev TEXT, hash_curr TEXT)",
        []
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn append_event(event: String) -> Result<String, String> {
    let conn = open_db("admin_logs.db");
    ensure_logs_table(&conn)?;
    let prev = head_hash(&conn).unwrap_or_else(|| "GENESIS".into());
    let mut hasher = Sha256::new(); hasher.update(prev.as_bytes()); hasher.update(event.as_bytes());
    let curr = format!("{:x}", hasher.finalize());
    conn.execute("INSERT INTO logs(event, hash_prev, hash_curr) VALUES(?1, ?2, ?3)",
        params![event, prev, curr]).map_err(|e| e.to_string())?;
    Ok(curr)
}

#[tauri::command]
pub fn get_admin_log_head() -> Result<String, String> {
    let conn = open_db("admin_logs.db");
    Ok(head_hash(&conn).unwrap_or_else(|| "GENESIS".into()))
}

#[tauri::command]
pub fn get_recent_logs(limit: u32) -> Result<Vec<LogEntry>, String> {
    let conn = open_db("admin_logs.db");
    ensure_logs_table(&conn)?;
    let safe_limit = limit.min(100);
    let mut stmt = conn.prepare(
        "SELECT id, COALESCE(ts,''), event, hash_prev, hash_curr FROM logs ORDER BY id DESC LIMIT ?1"
    ).map_err(|e| e.to_string())?;
    let entries: Result<Vec<LogEntry>, _> = stmt.query_map(params![safe_limit], |row| {
        Ok(LogEntry {
            id:        row.get(0)?,
            ts:        row.get(1)?,
            event:     row.get(2)?,
            hash_prev: row.get(3)?,
            hash_curr: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>();
    entries.map_err(|e| e.to_string())
}
