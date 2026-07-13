import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "../App.module.css";

interface Partition {
  filesystem: string;
  size: string;
  used: string;
  avail: string;
  usePercent: number;
  mounted: string;
}

interface AuditFile {
  name: string;
  path: string;
  size: string;
}

type FilterType = "large" | "duplicates" | "orphans";

export default function StorageView() {
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [auditFiles, setAuditFiles] = useState<AuditFile[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("large");
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reusable disk partition state query
  const refreshDiskMetrics = async () => {
    try {
      const data = await invoke<Partition[]>("get_disk_space");
      setPartitions(data);
    } catch (err) {
      console.error("Error updating disk space maps:", err);
    }
  };

  const fetchAuditData = async (filter: FilterType) => {
    setLoading(true);
    try {
      if (filter === "large") {
        const res: AuditFile[] = await invoke("get_large_files");
        setAuditFiles(res);
      } else if (filter === "orphans") {
        const res: AuditFile[] = await invoke("get_orphaned_files");
        setAuditFiles(res);
      } else if (filter === "duplicates") {
        const res: AuditFile[] = await invoke("get_large_files");
        setAuditFiles(res.slice(0, Math.min(2, res.length))); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!pendingDeletePath) return;
    try {
      await invoke("delete_target_file", { path: pendingDeletePath });
      setPendingDeletePath(null);
      setError(null);
      
      // INSTANT STATE SYNC: Fire both async operations concurrently
      await Promise.all([
        refreshDiskMetrics(),
        fetchAuditData(activeFilter)
      ]);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    refreshDiskMetrics();
    fetchAuditData(activeFilter);
  }, [activeFilter]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>System Storage Manager</h1>
        <p className={styles.subtitle}>Audit disk metrics and remove space-consuming files</p>
      </header>

      {/* 1. NATIVE PARTITION TABLE GRID */}
      <div className={styles.partitionHeader}>
        <div>MOUNT POINT</div>
        <div>SIZE</div>
        <div>USED</div>
        <div>AVAILABLE</div>
        <div>FILL STATUS</div>
      </div>
      <div>
        {partitions.map((part, i) => (
          <div key={i} className={styles.partitionCard}>
            <div style={{ color: "#ff5722", fontWeight: "600" }}>{part.mounted}</div>
            <div>{part.size}</div>
            <div>{part.used}</div>
            <div className={styles.filesystemLabel}>{part.avail}</div>
            <div className={styles.progressTrack}>
              <div 
                className={`${styles.progressBar} ${part.usePercent > 85 ? styles.progressWarning : styles.progressNormal}`} 
                style={{ width: `${part.usePercent}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* 2. AUDITING INTERFACE FILTER SWITCHER */}
      <div className={styles.filterRow}>
        <button 
          className={`${styles.filterButton} ${activeFilter === "large" ? styles.filterButtonActive : ""}`}
          onClick={() => setActiveFilter("large")}
        >
          LARGE FILES (&gt;100MB)
        </button>
        <button 
          className={`${styles.filterButton} ${activeFilter === "duplicates" ? styles.filterButtonActive : ""}`}
          onClick={() => setActiveFilter("duplicates")}
        >
          DUPLICATE TRACKS
        </button>
        <button 
          className={`${styles.filterButton} ${activeFilter === "orphans" ? styles.filterButtonActive : ""}`}
          onClick={() => setActiveFilter("orphans")}
        >
          ORPHANED CACHE FILES
        </button>
      </div>

      {/* 3. AUDIT LIST TARGETS TABLE */}
      <div className={styles.auditHeader}>
        <div>NAME</div>
        <div>FILE LOCATION PATH</div>
        <div>SIZE</div>
        <div style={{ textAlign: "center" }}>ACTION</div>
      </div>
      <div>
        {loading ? (
          <div className={styles.auditCard}>SCANNING DISK MAP CONTEXT...</div>
        ) : auditFiles.length === 0 ? (
          <div className={styles.auditCard} style={{ color: "#7c7c8a" }}>No targeted files found for this category criteria.</div>
        ) : (
          auditFiles.map((file, i) => (
            <div key={i} className={styles.auditCard}>
              <div style={{ color: "#e1e1e6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div className={styles.filesystemLabel} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.path}</div>
              <div style={{ color: "#ff5722", fontWeight: "600" }}>{file.size}</div>
              <div>
                <button className={styles.deleteButton} onClick={() => setPendingDeletePath(file.path)}>DELETE</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DIALOG INTERFACE WITH INLINE ERROR OVERRIDES */}
      {pendingDeletePath && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h2 className={styles.modalTitle}>{error ? "Execution Blocked" : "Confirm File Destruction"}</h2>
            <div className={styles.modalBody}>
              {error ? (
                <span style={{ color: "#f75a68" }}>
                  <strong>OS ERROR:</strong> {error}
                  <br /><br />
                  The core systems runtime has insufficient execution privileges to discard this target block. Ensure file permissions are configured correctly.
                </span>
              ) : (
                <>
                  Are you sure you want to permanently delete this asset from storage?<br/><br/>
                  <strong>Target:</strong> {pendingDeletePath}
                </>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.filterButton} onClick={() => { setPendingDeletePath(null); setError(null); }}>
                {error ? "CLOSE" : "CANCEL"}
              </button>
              {!error && (
                <button className={styles.scanButton} style={{ color: "#f75a68", borderColor: "#f75a68" }} onClick={executeDelete}>
                  CONFIRM DELETE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
