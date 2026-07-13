import styles from "../App.module.css";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Overview" },
    { id: "storage", label: "Storage Management"},
    { id: "systemd", label: "Services" },
    { id: "users", label: "User Management" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandContainer}>
        <h2 className={styles.brandName}>split</h2>
        <p className={styles.brandTagline}>System Environment</p>
      </div>

      <nav className={styles.navMenu}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`${styles.navItem} ${
              activeTab === item.id ? styles.navItemActive : ""
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
