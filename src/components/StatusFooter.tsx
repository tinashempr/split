import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "../App.module.css";

interface Stats {
  cpu_usage: number;
  memory_used_percent: number;
  swap_used_percent: number;
}

export default function StatusFooter() {
  const [stats, setStats] = useState<Stats>({
    cpu_usage: 0,
    memory_used_percent: 0,
    swap_used_percent: 0,
  });
  const [time, setTime] = useState("");

  useEffect(() => {
    // 1. Fetch system metrics from Rust
    const fetchStats = async () => {
      try {
        const data: Stats = await invoke("get_system_stats");
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch system stats:", err);
      }
    };

    // 2. Keep the system clock current
    const updateTime = () => {
      const now = new Date();
      setTime(now.toTimeString().split(" ")[0]); // Formats as HH:MM:SS
    };

    fetchStats();
    updateTime();

    const statsInterval = setInterval(fetchStats, 2000); // Poll every 2 seconds
    const timeInterval = setInterval(updateTime, 1000);  // Update clock every second

    return () => {
      clearInterval(statsInterval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <footer className={styles.statusFooter}>
      <div className={styles.statGroup}>
        <span className={styles.statLabel}>CPU</span>
        <span className={styles.statValue + " " + styles.statHighlight}>{stats.cpu_usage.toFixed(1)}%</span>
      </div>
      
      <div className={styles.statGroup}>
        <span className={styles.statLabel}>MEM</span>
        <span className={styles.statValue + " " + styles.statHighlight}>{stats.memory_used_percent.toFixed(1)}%</span>
      </div>

      <div className={styles.statGroup}>
        <span className={styles.statLabel}>SWAP</span>
        <span className={styles.statValue + " " + styles.statHighlight}>{stats.swap_used_percent.toFixed(1)}%</span>
      </div>

      <div className={styles.footerTime}>{time}</div>
    </footer>
  );
}
