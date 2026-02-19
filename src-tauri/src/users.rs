
use crate::security::{open_db, db_path};
use ed25519_dalek::{SigningKey, VerifyingKey, Signer};
use rand::rngs::OsRng;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use xchacha20poly1305::{XChaCha20Poly1305, aead::{Aead, KeyInit}, XNonce};

fn profile_dir(user_id: &str) -> std::path::PathBuf { db_path(&format!("profiles/{user_id}")) }
fn kdf(pass: &str) -> [u8;32] {
    let mut h = Sha256::new(); h.update(pass.as_bytes());
    let out = h.finalize(); let mut key=[0u8;32]; key.copy_from_slice(&out[..32]); key
}
fn encrypt_private(sk: &[u8], pass: &str) -> Vec<u8> {
    let key = kdf(pass); let cipher = XChaCha20Poly1305::new(&key.into());
    let nonce_bytes: [u8;24] = rand::random(); let nonce = XNonce::from_slice(&nonce_bytes);
    let mut blob = Vec::with_capacity(24+sk.len()+16); blob.extend_from_slice(&nonce_bytes);
    let ct = cipher.encrypt(nonce, sk).expect("encrypt"); blob.extend_from_slice(&ct); blob
}
fn decrypt_private(blob: &[u8], pass: &str) -> Option<Vec<u8>> {
    if blob.len()<24 {return None;} let key=kdf(pass);
    let cipher=XChaCha20Poly1305::new(&key.into()); let nonce=XNonce::from_slice(&blob[..24]);
    cipher.decrypt(nonce, &blob[24..]).ok()
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Profile { pub user_id:String, pub display_name:String, pub pubkey_b64:String }

fn ensure_profiles_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY, display_name TEXT, pubkey BLOB)",
        []
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_profile(user_id:String, display_name:String, passphrase:String)->Result<Profile,String>{
    let mut rng=OsRng{}; let signing=SigningKey::generate(&mut rng); let verify:VerifyingKey=signing.verifying_key();
    let enc=encrypt_private(&signing.to_bytes(), &passphrase);
    let dir=profile_dir(&user_id); std::fs::create_dir_all(&dir).map_err(|e|e.to_string())?;
    std::fs::write(dir.join("priv.enc"), &enc).map_err(|e|e.to_string())?;
    std::fs::write(dir.join("pub.bin"), verify.as_bytes()).map_err(|e|e.to_string())?;
    let conn=open_db("profiles.db");
    ensure_profiles_table(&conn)?;
    conn.execute("INSERT OR REPLACE INTO profiles(user_id, display_name, pubkey) VALUES(?1, ?2, ?3)",
        params![user_id,display_name,verify.as_bytes()]).map_err(|e|e.to_string())?;
    Ok(Profile{ user_id, display_name, pubkey_b64: base64::encode(verify.as_bytes()) })
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, String> {
    let conn = open_db("profiles.db");
    ensure_profiles_table(&conn)?;
    let mut stmt = conn.prepare(
        "SELECT user_id, display_name, pubkey FROM profiles ORDER BY rowid DESC"
    ).map_err(|e| e.to_string())?;
    let profiles: Result<Vec<Profile>, _> = stmt.query_map([], |row| {
        let uid: String = row.get(0)?;
        let dn: String  = row.get(1)?;
        let pk: Vec<u8> = row.get(2)?;
        Ok(Profile { user_id: uid, display_name: dn, pubkey_b64: base64::encode(&pk) })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>();
    profiles.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unlock_profile(user_id:String, passphrase:String)->Result<bool,String>{
    let dir=profile_dir(&user_id); let blob=std::fs::read(dir.join("priv.enc")).map_err(|e|e.to_string())?;
    let sk=decrypt_private(&blob,&passphrase).ok_or("decrypt failed")?; Ok(sk.len()==32)
}

#[tauri::command]
pub fn get_public_key(user_id:String)->Result<String,String>{
    let dir=profile_dir(&user_id); let pk=std::fs::read(dir.join("pub.bin")).map_err(|e|e.to_string())?;
    Ok(base64::encode(pk))
}
