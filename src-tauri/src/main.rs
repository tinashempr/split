fn main() {
    split_lib::run()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

