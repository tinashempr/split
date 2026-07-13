import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "../App.module.css";

export default function TitleBar() {
  const appWindow = getCurrentWindow();

  return (
    <div className={styles.titlebar}>
      {/* Native drag attribute avoids input focus lockups on Linux tiling WMs */}
      <div className={styles.titlebarDragRegion} data-tauri-drag-region />

      {/* Control Buttons */}
      <button className={styles.titlebarButton} onClick={() => appWindow.minimize()}>
        —
      </button>
      <button className={styles.titlebarButton} onClick={() => appWindow.toggleMaximize()}>
        ▢
      </button>
      <button 
        className={`${styles.titlebarButton} ${styles.closeButton}`} 
        onClick={() => appWindow.close()}
      >
        ✕
      </button>
    </div>
  );
}
