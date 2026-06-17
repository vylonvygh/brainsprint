use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::models::SavedSession;

fn get_app_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))
}

fn ensure_dirs(app: &AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let base = get_app_dir(app)?;
    let sessions_dir = base.join("sessions");
    let writings_dir = base.join("writings");
    fs::create_dir_all(&sessions_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&writings_dir).map_err(|e| e.to_string())?;
    Ok((sessions_dir, writings_dir))
}

pub fn save_session(app: &AppHandle, session: &SavedSession) -> Result<(), String> {
    let (sessions_dir, _) = ensure_dirs(app)?;
    let sessions_file = sessions_dir.join("sessions.json");

    let mut sessions: Vec<SavedSession> = if sessions_file.exists() {
        let content = fs::read_to_string(&sessions_file).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    sessions.push(session.clone());
    let json = serde_json::to_string_pretty(&sessions).map_err(|e| e.to_string())?;
    fs::write(&sessions_file, json).map_err(|e| e.to_string())
}

pub fn load_sessions(app: &AppHandle) -> Result<Vec<SavedSession>, String> {
    let (sessions_dir, _) = ensure_dirs(app)?;
    let sessions_file = sessions_dir.join("sessions.json");

    if !sessions_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&sessions_file).map_err(|e| e.to_string())?;
    let sessions: Vec<SavedSession> = serde_json::from_str(&content).unwrap_or_default();
    let original_len = sessions.len();
    let clean: Vec<SavedSession> = sessions.into_iter().filter(|s| s.duration_secs <= 86400).collect();
    if clean.len() < original_len {
        if let Ok(json) = serde_json::to_string_pretty(&clean) {
            let _ = fs::write(&sessions_file, json);
        }
    }
    Ok(clean)
}

pub fn save_writing_file(app: &AppHandle, filename: &str, content: &str) -> Result<(), String> {
    let (_, writings_dir) = ensure_dirs(app)?;
    fs::write(writings_dir.join(filename), content).map_err(|e| e.to_string())
}

pub fn get_app_data_path(app: &AppHandle) -> Result<String, String> {
    let base = get_app_dir(app)?;
    Ok(base.to_string_lossy().to_string())
}

pub fn get_or_create_subdir(app: &AppHandle, name: &str) -> Result<String, String> {
    let base = get_app_dir(app)?;
    let dir = base.join(name);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    Ok(dir.to_string_lossy().to_string())
}

pub fn get_display_paths(app: &AppHandle) -> Result<Vec<(String, String)>, String> {
    let base = get_app_dir(app)?;
    let home = std::env::var("HOME").unwrap_or_default();
    let display = |p: &std::path::Path| -> String {
        let s = p.to_string_lossy().to_string();
        if !home.is_empty() && s.starts_with(&home) {
            s.replacen(&home, "~", 1)
        } else {
            s
        }
    };
    Ok(vec![
        ("App Data".into(), display(&base)),
        ("Writings".into(), display(&base.join("writings"))),
        ("Sessions".into(), display(&base.join("sessions"))),
    ])
}

pub fn delete_all_data(app: &AppHandle) -> Result<(), String> {
    let base = get_app_dir(app)?;
    let _ = fs::remove_dir_all(base.join("sessions"));
    let _ = fs::remove_dir_all(base.join("writings"));
    let _ = fs::remove_file(base.join("recovery-draft.txt"));
    Ok(())
}

pub fn save_recovery_draft(app: &AppHandle, content: &str) -> Result<(), String> {
    let base = get_app_dir(app)?;
    fs::write(base.join("recovery-draft.txt"), content).map_err(|e| e.to_string())
}

pub fn load_recovery_draft(app: &AppHandle) -> Result<Option<String>, String> {
    let base = get_app_dir(app)?;
    let path = base.join("recovery-draft.txt");
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() {
        let _ = fs::remove_file(&path);
        return Ok(None);
    }
    Ok(Some(content))
}

pub fn clear_recovery_draft(app: &AppHandle) -> Result<(), String> {
    let base = get_app_dir(app)?;
    let _ = fs::remove_file(base.join("recovery-draft.txt"));
    Ok(())
}
