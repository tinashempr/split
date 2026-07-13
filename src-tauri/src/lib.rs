use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Mutex;
use sysinfo::{Disks, System};
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct EnvProfile {
    os_name: String,
    wm_session: String,
    kernel: String,
}

#[tauri::command]
fn get_env_profile() -> EnvProfile {
    let wm = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "Hyprland".to_string());

    // Read clean release identifiers from native platform files
    let os_name = fs::read_to_string("/etc/os-release")
        .unwrap_or_default()
        .lines()
        .find(|line| line.starts_with("NAME="))
        .map(|line| line.replace("NAME=", "").replace("\"", ""))
        .unwrap_or_else(|| "Arch Linux".to_string());

    let kernel = fs::read_to_string("/proc/version")
        .map(|v| v.split_whitespace().nth(2).unwrap_or("Linux").to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    EnvProfile {
        os_name,
        wm_session: wm,
        kernel,
    }
}

#[tauri::command]
fn get_orphaned_files() -> Vec<LargeFileInfo> {
    // Orphaned files (isolated cache logs/dead runtime files left over)
    let home_dir = std::env::var("HOME").unwrap_or_default();
    let target = format!("{}/.local/state", home_dir);
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(target) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() && meta.len() > 1_000_000 {
                    // Files > 1MB in state directory
                    files.push(LargeFileInfo {
                        name: entry.file_name().to_string_lossy().into_owned(),
                        path: entry.path().to_string_lossy().into_owned(),
                        size: format!("{:.1} MB", meta.len() as f64 / 1_048_576.0),
                    });
                }
            }
        }
    }
    files
}

#[tauri::command]
fn delete_target_file(path: String) -> Result<String, String> {
    let target_path = Path::new(&path);

    // Guardrail: Restrict deletion safety strictly to your own home directory profiles
    let home_dir = std::env::var("HOME").unwrap_or_default();
    if !path.starts_with(&home_dir) {
        return Err(
            "Permission Denied: Cannot delete files outside user home directory space context."
                .to_string(),
        );
    }

    if target_path.exists() && target_path.is_file() {
        fs::remove_file(target_path).map_err(|e| e.to_string())?;
        Ok("File securely removed from storage.".to_string())
    } else {
        Err("File target path not found.".to_string())
    }
}

#[derive(Serialize)]
pub struct LargeFileInfo {
    name: String,
    path: String,
    size: String,
}

#[tauri::command]
fn get_large_files() -> Result<Vec<LargeFileInfo>, String> {
    let home_dir =
        std::env::var("HOME").map_err(|_| "Could not find HOME directory".to_string())?;
    let mut large_files = Vec::new();

    // Scan user directories up to 3 levels deep to prevent infinite stalls
    for entry in WalkDir::new(&home_dir)
        .max_depth(3)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                let size_bytes = metadata.len();
                // 100 MB threshold = 104,857,600 bytes
                if size_bytes > 104_857_600 {
                    large_files.push(LargeFileInfo {
                        name: entry.file_name().to_string_lossy().into_owned(),
                        path: entry.path().to_string_lossy().into_owned(),
                        size: format!("{:.1} MB", size_bytes as f64 / 1_048_576.0),
                    });
                }
            }
        }
    }

    // Sort largest files first
    large_files.sort_by(|a, b| b.size.cmp(&a.size));
    Ok(large_files)
}

#[tauri::command]
fn clear_system_cache() -> Result<String, String> {
    let home_dir =
        std::env::var("HOME").map_err(|_| "Could not find HOME directory".to_string())?;

    // Paths to clean safely without risking core system configurations
    let cache_paths = vec![
        format!("{}/.cache/thumbnails", home_dir),
        format!("{}/.cache/fontconfig", home_dir),
    ];

    let mut removed_count = 0;
    for path_str in cache_paths {
        let path = Path::new(&path_str);
        if path.exists() {
            if let Ok(_) = fs::remove_dir_all(path) {
                removed_count += 1;
            }
        }
    }

    Ok(format!(
        "Successfully cleared {} temporary cache clusters.",
        removed_count
    ))
}

// 1. Create a persistent container for our monitor instance
pub struct AppState {
    pub sys: Mutex<System>,
}

#[derive(Serialize)]
pub struct DiskInfo {
    filesystem: String,
    size: String,
    used: String,
    avail: String,
    #[serde(rename = "usePercent")]
    use_percent: u8,
    mounted: String,
}

#[derive(Serialize)]
pub struct SystemStats {
    cpu_usage: f32,
    memory_used_percent: f32,
    swap_used_percent: f32,
}

#[tauri::command]
fn get_disk_space() -> Vec<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|disk| {
            let total = disk.total_space();
            let avail = disk.available_space();
            let used = total - avail;
            let percent = if total > 0 {
                ((used as f64 / total as f64) * 100.0) as u8
            } else {
                0
            };

            DiskInfo {
                filesystem: disk.file_system().to_string_lossy().into_owned(),
                size: format!("{:.1} GiB", total as f64 / 1_073_741_824.0),
                used: format!("{:.1} GiB", used as f64 / 1_073_741_824.0),
                avail: format!("{:.1} GiB", avail as f64 / 1_073_741_824.0),
                use_percent: percent,
                mounted: disk.mount_point().to_string_lossy().into_owned(),
            }
        })
        .collect()
}

#[tauri::command]
fn get_system_stats(state: tauri::State<'_, AppState>) -> SystemStats {
    // 2. Lock our persistent system monitor state safely
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_all(); // Refreshing on a persistent instance correctly computes CPU delta!

    let cpu_usage = sys.global_cpu_usage();

    let total_mem = sys.total_memory() as f32;
    let memory_used_percent = if total_mem > 0.0 {
        (sys.used_memory() as f32 / total_mem) * 100.0
    } else {
        0.0
    };

    let total_swap = sys.total_swap() as f32;
    let swap_used_percent = if total_swap > 0.0 {
        (sys.used_swap() as f32 / total_swap) * 100.0
    } else {
        0.0
    };

    SystemStats {
        cpu_usage,
        memory_used_percent,
        swap_used_percent,
    }
}

#[derive(Serialize)]
pub struct SystemdService {
    name: String,
    load: String,
    active: String,
    sub: String,
    description: String,
}

#[tauri::command]
fn get_user_services() -> Result<Vec<SystemdService>, String> {
    // Execute standard systemctl tracking argument securely
    let output = Command::new("systemctl")
        .args([
            "--user",
            "list-units",
            "--type=service",
            "--no-legend",
            "--plain",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut services = Vec::new();

    for line in stdout_str.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        // systemctl list-units output splits into: UNIT, LOAD, ACTIVE, SUB, DESCRIPTION...
        if parts.len() >= 4 {
            let name = parts[0].replace(".service", "");
            let load = parts[1].to_string();
            let active = parts[2].to_string();
            let sub = parts[3].to_string();

            // Recombine the remaining elements into a clean description string
            let description = parts[4..].join(" ");

            services.push(SystemdService {
                name,
                load,
                active,
                sub,
                description,
            });
        }
    }

    Ok(services)
}

#[tauri::command]
fn toggle_user_service(name: String, action: String) -> Result<String, String> {
    // Restrict inputs to explicit systemctl safe actions only
    if !["start", "stop", "restart"].contains(&action.as_str()) {
        return Err("Invalid systemctl action requested".to_string());
    }

    let output = Command::new("systemctl")
        .args(["--user", &action, &format!("{}.service", name)])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!(
            "Service {} successfully applied to {}",
            action, name
        ))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[derive(Serialize)]
pub struct LocalUser {
    username: String,
    session_id: String,
    is_active: bool,
}

#[tauri::command]
fn get_local_users() -> Result<Vec<LocalUser>, String> {
    // Queries loginctl for active local seats and sessions
    let output = Command::new("loginctl")
        .args(["list-sessions", "--no-legend"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut users = Vec::new();

    for line in stdout_str.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let session_id = parts[0].to_string();
            let username = parts[2].to_string();

            // If loginctl show-session says state is active
            let state_output = Command::new("loginctl")
                .args(["show-session", &session_id, "-p", "State"])
                .output();

            let is_active = match state_output {
                Ok(out) => String::from_utf8_lossy(&out.stdout).contains("active"),
                _ => false,
            };

            users.push(LocalUser {
                username,
                session_id,
                is_active,
            });
        }
    }

    Ok(users)
}

#[tauri::command]
fn trigger_power_action(action: String) -> Result<String, String> {
    // Strict guardrails to only allow specific systemctl/loginctl power flags
    let cmd_args = match action.as_str() {
        "poweroff" => vec!["poweroff"],
        "reboot" => vec!["reboot"],
        "suspend" => vec!["suspend"],
        _ => return Err("Invalid power action requested".to_string()),
    };

    // systemctl handles power actions gracefully without password prompts for local users
    let output = Command::new("systemctl")
        .args(&cmd_args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Executing {}", action))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Builder<tauri::Wry> {
    // 3. Initialize our shared manager instance
    let mut initial_sys = System::new_all();
    initial_sys.refresh_all();

    tauri::Builder::default()
        // 4. Register the state tracker so commands can borrow it
        .manage(AppState {
            sys: Mutex::new(initial_sys),
        })
        .invoke_handler(tauri::generate_handler![
            get_disk_space,
            get_system_stats,
            get_user_services,
            toggle_user_service,
            get_local_users,
            trigger_power_action,
            get_large_files,
            clear_system_cache,
            get_env_profile,
            get_orphaned_files,
            delete_target_file
        ])
}
