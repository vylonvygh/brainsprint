use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub built_in: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    pub words: u64,
    pub characters: u64,
    pub wpm: f64,
    pub time_elapsed_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifetimeStats {
    pub total_sessions: u64,
    pub total_words: u64,
    pub total_writing_time_secs: u64,
    pub longest_session_secs: u64,
    pub most_words_session: u64,
    pub highest_wpm: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSession {
    pub id: String,
    pub mode: String,
    pub date: String,
    pub duration_secs: u64,
    pub words: u64,
    pub characters: u64,
    pub wpm: f64,
    pub topic: Option<String>,
    pub difficulty: Option<String>,
    pub survived: bool,
    pub writing_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub follow_system_theme: bool,
    pub theme: String, // "light" or "dark"
    pub launch_fullscreen: bool,
    pub sprint_timeout_secs: u64,
    pub practice_timeout_secs: u64,
    pub save_recovery_drafts: bool,
    pub save_prompt_after_session: bool,
    pub enable_statistics: bool,
    pub show_personal_best_card: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            follow_system_theme: true,
            theme: "dark".to_string(),
            launch_fullscreen: false,
            sprint_timeout_secs: 5,
            practice_timeout_secs: 15,
            save_recovery_drafts: true,
            save_prompt_after_session: true,
            enable_statistics: true,
            show_personal_best_card: true,
        }
    }
}
