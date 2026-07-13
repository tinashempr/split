import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "../App.module.css";

interface Service {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export default function SystemdView() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data: Service[] = await invoke("get_user_services");
      setServices(data);
    } catch (error) {
      console.error("Failed to load user systemd units:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (name: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "stop" : "start";
    try {
      await invoke("toggle_user_service", { name, action });
      fetchServices(); // Automatically refresh list matching updated runtime states
    } catch (error) {
      alert(`Failed to complete action: ${error}`);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Systemd Unit Services</h1>
        <p className={styles.subtitle}>Monitor and manage active system application runtimes</p>
      </header>

      <button onClick={fetchServices} disabled={loading} className={styles.scanButton}>
        {loading ? "POLLING UNITS..." : "REFRESH SERVICES"}
      </button>

      <div className={styles.partitionList}>
        <div className={styles.tableHeader}>
          <div>SERVICE NAME</div>
          <div>ACTIVE STATE</div>
          <div>SUB STATE</div>
          <div>DESCRIPTION</div>
          <div>ACTION</div>
        </div>

        {services.map((svc) => (
          <div key={svc.name} className={styles.card}>
            <div className={styles.mountPointColumn}>{svc.name}</div>
            
            <div style={{ color: svc.active === "active" ? "#00b37e" : "#7c7c8a" }}>
              {svc.active}
            </div>
            
            <div className={styles.filesystemLabel}>{svc.sub}</div>
            
            <div className={styles.filesystemLabel} style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {svc.description || "No unit details specified"}
            </div>

            <div>
              <button 
                onClick={() => handleAction(svc.name, svc.active)}
                className={styles.scanButton}
                style={{ padding: "4px 10px", fontSize: "11px", margin: 0 }}
              >
                {svc.active === "active" ? "STOP" : "START"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
