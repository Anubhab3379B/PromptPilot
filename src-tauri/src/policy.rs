
/// Simple built-in policy engine.
/// Allowlist of permitted capability strings.
const ALLOWED_CAPABILITIES: &[&str] = &[
    "admin.unlock",
    "admin.view_logs",
    "user.create_profile",
    "user.unlock_profile",
    "consent.request",
    "consent.verify",
    "logs.append",
    "logs.read",
    "settings.write",
];

#[tauri::command]
pub fn policy_check(capability: String) -> Result<bool, String> {
    let allowed = ALLOWED_CAPABILITIES.contains(&capability.as_str());
    Ok(allowed)
}
