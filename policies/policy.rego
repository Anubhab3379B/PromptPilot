package promptpilot.policy

default allow = false

allow { input.capability == "MIC"; input.session_live; not input.privacy_mode }
allow { input.capability == "NETWORK_CLOUD_LLM"; input.consent_cloud_llm; not input.privacy_mode }
allow { input.capability == "ADMIN_APPROVED_ACTION"; input.role == "admin"; input.user_consent_valid }
