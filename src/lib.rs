use tauri::Manager;
use tauri::webview::Color;

mod commands;
mod models;
mod storage;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::save_session,
            commands::get_sessions,
            commands::get_lifetime_stats,
            commands::get_app_data_path,
            commands::open_app_folder,
            commands::get_display_paths,
            commands::delete_all_data,
            commands::save_recovery_draft,
            commands::load_recovery_draft,
            commands::clear_recovery_draft,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
