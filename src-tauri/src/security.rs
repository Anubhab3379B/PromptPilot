
use rusqlite::Connection;
use std::{fs, path::PathBuf};

#[derive(Default)]
pub struct AppState {
    pub admin_unlocked: std::sync::Mutex<bool>,
    pub admin_nonce: std::sync::Mutex<Option<String>>,
    pub pending_user_consent: std::sync::Mutex<Option<(String, String)>>,
    pub answer_style: std::sync::Mutex<String>,
}

pub fn data_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or(std::env::current_dir().unwrap());
    base.join("promptpilot")
}
pub fn db_path(name: &str) -> PathBuf { data_dir().join(name) }
pub fn open_db(name: &str) -> Connection {
    let path = db_path(name);
    fs::create_dir_all(path.parent().unwrap()).ok();
    let conn = Connection::open(path).expect("open db");
    conn.execute_batch("PRAGMA journal_mode=WAL;").unwrap();
    conn
}
pub fn load_config() -> Result<(), String> { Ok(()) }
