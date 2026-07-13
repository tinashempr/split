import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "../App.module.css";

interface Profile {
  os_name: string;
  wm_session: string;
  kernel: string;
}

export default function OverviewView() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    invoke<Profile>("get_env_profile").then(setProfile).catch(console.error);
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>System Overview</h1>
        <p className={styles.subtitle}>Welcome to your split environment control center</p>
      </header>
      
      <div style={{ padding: "20px", background: "#161619", borderRadius: "6px", border: "1px solid #202024" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#ff5722", fontSize: "16px" }}>Environment Profile</h3>
        <p style={{ margin: "4px 0", color: "#c4c4cc", fontSize: "13px" }}>
          <strong>Host Shell:</strong> {profile?.os_name || "Querying host standard..."}
        </p>
        <p style={{ margin: "4px 0", color: "#c4c4cc", fontSize: "13px" }}>
          <strong>Window Manager / Composer:</strong> {profile?.wm_session || "Detecting active layer..."}
        </p>
        <p style={{ margin: "4px 0", color: "#c4c4cc", fontSize: "13px" }}>
          <strong>Kernel Architecture:</strong> {profile?.kernel || "Reading core context..."}
        </p>
      </div>
    </div>
  );
}
