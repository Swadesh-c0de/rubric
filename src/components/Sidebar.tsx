"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Menu, X, Settings } from "lucide-react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  user: {
    name: string;
    email: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "History & Logs", href: "/dashboard/history", icon: History },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className={`${styles.mobileToggle} ${isOpen ? styles.mobileToggleOpen : ""}`} 
        onClick={toggleSidebar} 
        aria-label="Toggle Sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && <div className={styles.backdrop} onClick={toggleSidebar} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`} style={{ viewTransitionName: "app-sidebar" }}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <svg className={styles.logoBracket} width="10" height="26" viewBox="0 0 12 32" fill="currentColor">
              <path d="M 12 0 L 4 0 L 0 4 L 0 28 L 4 32 L 12 32 L 12 28.5 L 6.5 28.5 L 3.5 25.5 L 3.5 6.5 L 6.5 3.5 L 12 3.5 Z" />
            </svg>
            <span className={styles.brandText}>rubric</span>
            <span className={styles.brandDot}>.</span>
            <svg className={styles.logoBracket} width="10" height="26" viewBox="0 0 12 32" fill="currentColor">
              <path d="M 0 0 L 8 0 L 12 4 L 12 28 L 8 32 L 0 32 L 0 28.5 L 5.5 28.5 L 8.5 25.5 L 8.5 6.5 L 5.5 3.5 L 0 3.5 Z" />
            </svg>
          </div>
        </div>

        <nav className={styles.navigation}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          {/* Account Manage Link */}
          <Link
            href="/dashboard/account"
            className={styles.accountBtn}
            onClick={() => setIsOpen(false)}
            title="Manage Account"
          >
            <div className={styles.accountAvatar}>
              <span className={styles.accountAvatarInitial}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={styles.accountInfo}>
              <span className={styles.accountName}>{user.name}</span>
              <span className={styles.accountSubtext}>Manage Account</span>
            </div>
            <Settings size={15} className={styles.accountSettingsIcon} />
          </Link>
        </div>
      </aside>
    </>
  );
}
