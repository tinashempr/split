import { useState } from "react";
import Sidebar from "./components/Sidebar";
import OverviewView from "./views/OverviewView";
import StorageView from "./views/StorageView";
import StatusFooter from "./components/StatusFooter";
import SystemdView from "./views/SystemdView";
import UserManagementView from "./views/UserManagementView";
import TitleBar from "./components/TitleBar";
import styles from "./App.module.css";

function App() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className={styles.appLayout}>
      <TitleBar />

      <div className={styles.windowWrapper}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
        <main className={styles.mainContent}>
          {activeTab === "overview" && <OverviewView />}
          {activeTab === "storage" && <StorageView />}
          {activeTab === "systemd" && <SystemdView />}
          {activeTab === "users" && <UserManagementView />}
        </main>
      </div>

      <StatusFooter />
    </div>
  );}

export default App;
