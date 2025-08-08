#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

fn start_backend() {
    // Start FastAPI backend in background (uvicorn)
    // Assumes Python in PATH and dependencies installed
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.arg("/C").arg("python -m uvicorn backend.app:app --host 127.0.0.1 --port 5173");
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-lc").arg("python -m uvicorn backend.app:app --host 127.0.0.1 --port 5173");
        c
    };

    let _child = cmd.stdout(Stdio::null()).stderr(Stdio::null()).spawn();
    // Give it a moment to start
    thread::spawn(|| {
        thread::sleep(Duration::from_secs(1));
    });
}

#[tauri::command]
fn backend_url() -> String {
    "http://127.0.0.1:5173".into()
}

fn main() {
    start_backend();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![backend_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
