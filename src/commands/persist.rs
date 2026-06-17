use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use crate::models::{LifetimeStats, SavedSession};
use crate::storage;

#[tauri::command]
pub fn save_session(
    app: AppHandle,
    mode: String,
    topic: Option<String>,
    difficulty: Option<String>,
    duration_secs: u64,
    words: u64,
    characters: u64,
    wpm: f64,
    survived: bool,
    writing_content: Option<String>,
) -> Result<SavedSession, String> {
    // Sanity cap: max 24 hours per session
    let duration_secs = duration_secs.min(86400);
    let date = chrono::Utc::now().to_rfc3339();
    let id = format!("{:x}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos());

    let writing_filename = if let Some(ref content) = writing_content {
        if !content.trim().is_empty() {
            let safe_date = date.replace(':', "-").replace('+', "-");
            let filename = format!("{}-{}.txt", mode, safe_date);
            storage::save_writing_file(&app, &filename, content)?;
            Some(filename)
        } else {
            None
        }
    } else {
        None
    };

    let session = SavedSession {
        id,
        mode,
        date,
        duration_secs,
        words,
        characters,
        wpm,
        topic,
        difficulty,
        survived,
        writing_filename,
    };

    storage::save_session(&app, &session)?;
    Ok(session)
}

#[tauri::command]
pub fn get_sessions(app: AppHandle) -> Result<Vec<SavedSession>, String> {
    storage::load_sessions(&app)
}

#[tauri::command]
pub fn get_lifetime_stats(app: AppHandle) -> Result<LifetimeStats, String> {
    let sessions = storage::load_sessions(&app)?;
    let total_sessions = sessions.len() as u64;
    let total_words: u64 = sessions.iter().map(|s| s.words).sum();
    let total_writing_time_secs: u64 = sessions.iter().map(|s| s.duration_secs).sum();
    let longest_session_secs = sessions.iter().map(|s| s.duration_secs).max().unwrap_or(0);
    let most_words_session = sessions.iter().map(|s| s.words).max().unwrap_or(0);
    let highest_wpm = sessions.iter().map(|s| s.wpm).fold(0.0_f64, f64::max);

    Ok(LifetimeStats {
        total_sessions,
        total_words,
        total_writing_time_secs,
        longest_session_secs,
        most_words_session,
        highest_wpm,
    })
}

#[tauri::command]
pub fn get_app_data_path(app: AppHandle) -> Result<String, String> {
    storage::get_app_data_path(&app)
}

#[tauri::command]
pub fn open_app_folder(app: AppHandle, subdir: String) -> Result<(), String> {
    let path = storage::get_or_create_subdir(&app, &subdir)?;
    app.shell().open(path, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_display_paths(app: AppHandle) -> Result<Vec<(String, String)>, String> {
    storage::get_display_paths(&app)
}

#[tauri::command]
pub fn delete_all_data(app: AppHandle) -> Result<(), String> {
    storage::delete_all_data(&app)
}

#[tauri::command]
pub fn save_recovery_draft(app: AppHandle, content: String) -> Result<(), String> {
    storage::save_recovery_draft(&app, &content)
}

#[tauri::command]
pub fn load_recovery_draft(app: AppHandle) -> Result<Option<String>, String> {
    storage::load_recovery_draft(&app)
}

#[tauri::command]
pub fn clear_recovery_draft(app: AppHandle) -> Result<(), String> {
    storage::clear_recovery_draft(&app)
}
