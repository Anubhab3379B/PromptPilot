
use crate::security::{open_db, AppState};

fn ensure_settings_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT)",
        []
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_answer_style(style: String, state: tauri::State<AppState>) -> Result<(), String> {
    // Validate
    match style.as_str() {
        "STAR" | "QUANT" | "HYBRID" => {},
        _ => return Err(format!("Unknown style: {}", style)),
    }
    // Persist to SQLite
    let conn = open_db("settings.db");
    ensure_settings_table(&conn)?;
    conn.execute(
        "INSERT OR REPLACE INTO settings(key, value) VALUES('answer_style', ?1)",
        rusqlite::params![style]
    ).map_err(|e| e.to_string())?;
    // Update in-memory
    *state.answer_style.lock().unwrap() = style;
    Ok(())
}

#[tauri::command]
pub fn get_answer_style(state: tauri::State<AppState>) -> Result<String, String> {
    // Prefer in-memory; fall back to DB on startup
    let mem = state.answer_style.lock().unwrap().clone();
    if !mem.is_empty() {
        return Ok(mem);
    }
    // Load from DB
    let conn = open_db("settings.db");
    ensure_settings_table(&conn)?;
    let val: Option<String> = conn.query_row(
        "SELECT value FROM settings WHERE key='answer_style'",
        [],
        |row| row.get(0)
    ).ok();
    let loaded = val.unwrap_or_else(|| "STAR".into());
    *state.answer_style.lock().unwrap() = loaded.clone();
    Ok(loaded)
}
