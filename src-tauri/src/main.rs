
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod security;
mod users;
mod admin;
mod logs;
mod policy;
mod ui;
use security::{AppState, load_config};

fn main() {
  load_config().ok();
  tauri::Builder::default()
    .manage(AppState::default())
    .invoke_handler(tauri::generate_handler![
      // User profiles
      users::create_profile,
      users::list_profiles,
      users::unlock_profile,
      users::get_public_key,
      // Admin
      admin::admin_get_nonce,
      admin::admin_unlock,
      admin::admin_status,
      admin::request_user_consent,
      admin::verify_user_consent_and_authorize,
      // Audit logs
      logs::append_event,
      logs::get_admin_log_head,
      logs::get_recent_logs,
      // Policy
      policy::policy_check,
      // UI / Settings
      ui::set_answer_style,
      ui::get_answer_style,
    ])
    .setup(|app| {
      let _ = tauri::WindowBuilder::new(
        app,
        "splash",
        tauri::WindowUrl::App("assets/brand.html".into())
      )
        .title("PromptPilot — Loading")
        .resizable(false)
        .inner_size(640.0, 360.0)
        .build();
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("PromptPilot failed to start");
}
