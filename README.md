# split // System Environment Control Center

A high-performance, minimalist desktop control panel built for native Linux environments. `split` hooks directly into hardware subsystems to deliver real-time storage diagnostics, systemd tracking, and resource telemetry through a zero-bloat, custom-rendered terminal aesthetic.

![System Preview](https://your-screenshot-url-here.png)

## 🚀 Features

*   **Instant Real-Time Telemetry:** Tightly coupled hardware metrics stream (CPU, MEM, SWAP) featuring a custom SVG wave-sparkline and block-segmented digital matrix bars.
*   **Storage & Partition Mapping:** Live tracking of disk mount point fill status, block limits, and partition capacities.
*   **Targeted Storage Auditing:** Deep-scan utilities categorizing large files (>100MB), duplicate audio tracks, and orphaned caches with instantaneous disk sync upon execution.
*   **OS Privileged Safeguards:** Integrated custom dialog modal system protecting against unauthorized system file deletions with native OS execution error logging.
*   **Terminal Design Ergonomics:** Built entirely using the `JetBrains Mono` font face, a dark workspace palette, and high-contrast orange (`#ff5722`) warning indicators.

## 🛠️ Tech Stack

*   **Frontend Environment:** React, Vite, TypeScript, CSS Modules
*   **Desktop App Engine:** Tauri v2 (Rust Core)
*   **Target Workspace Platform:** Optimized for Arch Linux / Hyprland

## 📂 Project Architecture

```text
├── src/
│   ├── App.tsx               # Main application layout & frame wrapper
│   ├── App.module.css        # Global CSS module variables, grid layouts, & keyframes
│   ├── components/
│   │   ├── TitleBar.tsx      # Frameless native window controls
│   │   ├── Sidebar.tsx       # Vertical navigation menu
│   │   └── StatusFooter.tsx  # SVG sparkline and segmented telemetry dashboard
│   └── views/
│       ├── OverviewView.tsx  # Host shell, kernel architecture, and environment status
│       ├── StorageView.tsx   # Partition grid, category filters, and file elimination table
│       ├── SystemdView.tsx   # Service logs and tracking metrics
│       └── UserManagement.tsx# Client and account privilege controls
```

## ⚡ Setup & Installation
1. Install System Dependencies

Ensure you have your core development tools, Node.js, and Rust/Cargo installed on your system (Arch Linux example):

```Bash
sudo pacman -S git nodejs npm rust libsoup3 webkit2gtk-4.1

2. Configure GitHub & Push Locally

If you are initializing this project on GitHub for the first time, navigate to your project root folder and run the following sequence in your terminal:
Bash

# Initialize local git repository
git init

# Configure your Git identity (if not already done globally)
git config user.name "YOUR_GITHUB_USERNAME"
git config user.email "your.email@example.com"

# Stage all project configuration files and code
git add .

# Commit project environment files
git commit -m "feat: initialize split client environment and telemetry layout"

# Point default main branch to modern standard
git branch -M main

# Link your local machine to your remote GitHub repository
git remote add origin [https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git)

# Push upstream to GitHub
git push -u origin main
```

3. Install & Launch Local Run

Once cloned or set up, quickly spin up your local Tauri environment:

```Bash

# Install frontend package dependencies
npm install

# Launch the application in native Tauri development mode
npm run tauri dev
