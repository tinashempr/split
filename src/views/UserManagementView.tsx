import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "../App.module.css";

interface LocalUser {
  username: string;
  session_id: string;
  is_active: boolean;
}

export default function UserManagementView() {
  const [users, setUsers] = useState<LocalUser[]>([]);

  const fetchUsers = async () => {
    try {
      const data: LocalUser[] = await invoke("get_local_users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch local sessions:", err);
    }
  };

  const handlePower = async (action: "poweroff" | "reboot" | "suspend") => {
    try {
      await invoke("trigger_power_action", { action });
    } catch (err) {
      alert(`Power action failed: ${err}`);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>User & Power Control</h1>
        <p className={styles.subtitle}>Manage local sessions and environmental status states</p>
      </header>

      {/* --- Power Menu Grid Section --- */}
      <h3 style={{ color: "#7c7c8a", fontSize: "12px", letterSpacing: "1px", marginTop: "20px" }}>SYSTEM ACTIONS</h3>
      <div style={{ display: "flex", gap: "16px", marginBottom: "30px" }}>
        <button onClick={() => handlePower("suspend")} className={styles.scanButton}>
          SLEEP / SUSPEND
        </button>
        <button onClick={() => handlePower("reboot")} className={styles.scanButton}>
          REBOOT SYSTEM
        </button>
        <button 
          onClick={() => handlePower("poweroff")} 
          className={styles.scanButton}
          style={{ borderColor: "#f75a68", color: "#f75a68" }} // Dangerous action red accent
        >
          SHUTDOWN
        </button>
      </div>

      {/* --- Active Session Tracking Table --- */}
      <h3 style={{ color: "#7c7c8a", fontSize: "12px", letterSpacing: "1px" }}>ACTIVE USER SESSIONS</h3>
      <div className={styles.partitionList}>
        <div className={styles.tableHeader}>
          <div>USERNAME</div>
          <div>SESSION ID</div>
          <div>SESSION STATUS</div>
        </div>

        {users.map((u) => (
          <div key={u.session_id} className={styles.card}>
            <div className={styles.mountPointColumn}>{u.username}</div>
            <div>ID: {u.session_id}</div>
            <div style={{ color: u.is_active ? "#00b37e" : "#7c7c8a" }}>
              {u.is_active ? "● ACTIVE CONSOLE" : "○ IDLE / BACKGROUND"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
