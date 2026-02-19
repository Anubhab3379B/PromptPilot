
use crate::security::AppState;
use ed25519_dalek::{Verifier, VerifyingKey, Signature};

fn load_admin_pubkey() -> Result<VerifyingKey, String> {
    // Expect PEM in resources as admin_public.pem
    let path = tauri::api::path::resource_dir().unwrap().join("admin_public.pem");
    let pem = std::fs::read_to_string(path).map_err(|e| format!("admin_public.pem missing: {}", e))?;
    let der = pem.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let bytes = base64::decode(der).map_err(|e| e.to_string())?;
    VerifyingKey::from_public_key_der(&bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn admin_get_nonce(state: tauri::State<AppState>) -> Result<String, String> {
    let n = nanoid::nanoid!(24);
    *state.admin_nonce.lock().unwrap() = Some(n.clone());
    Ok(n)
}

#[tauri::command]
pub fn admin_unlock(signature_b64: String, state: tauri::State<AppState>) -> Result<bool, String> {
    let nonce = state.admin_nonce.lock().unwrap().clone().ok_or("no nonce")?;
    let sig_bytes = base64::decode(signature_b64).map_err(|e| e.to_string())?;
    let sig = Signature::from_bytes(&sig_bytes).map_err(|e| e.to_string())?;
    let pk = load_admin_pubkey()?;
    pk.verify(nonce.as_bytes(), &sig).map_err(|e| e.to_string())?;
    *state.admin_unlocked.lock().unwrap() = true;
    Ok(true)
}

#[tauri::command]
pub fn admin_status(state: tauri::State<AppState>) -> Result<bool, String> {
    Ok(*state.admin_unlocked.lock().unwrap())
}

#[tauri::command]
pub fn request_user_consent(user_id: String, action: String, state: tauri::State<AppState>) -> Result<(String,String), String> {
    let nonce = nanoid::nanoid!(20);
    *state.pending_user_consent.lock().unwrap() = Some((user_id.clone(), nonce.clone()));
    Ok((user_id, nonce))
}

#[tauri::command]
pub fn verify_user_consent_and_authorize(user_id:String, consent_nonce:String, user_signature_b64:String, user_pubkey_b64:String, state: tauri::State<AppState>) -> Result<bool,String> {
    let pending = state.pending_user_consent.lock().unwrap().clone().ok_or("no pending consent")?;
    if pending.0 != user_id || pending.1 != consent_nonce { return Err("nonce mismatch".into()); }
    let user_pk = base64::decode(user_pubkey_b64).map_err(|e| e.to_string())?;
    let vk = ed25519_dalek::VerifyingKey::from_bytes(&user_pk.try_into().map_err(|_|"pk size")?).map_err(|e|e.to_string())?;
    let sig = ed25519_dalek::Signature::from_bytes(&base64::decode(user_signature_b64).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    vk.verify(consent_nonce.as_bytes(), &sig).map_err(|e| e.to_string())?;
    Ok(true)
}
