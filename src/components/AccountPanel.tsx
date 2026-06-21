"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  X,
  User,
  Lock,
  Trash2,
  LogOut,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Layers,
  Plus,
} from "lucide-react";
import styles from "./AccountPanel.module.css";

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
  };
  onNameUpdate?: (name: string) => void;
}

type ActiveView =
  | "menu"
  | "changeName"
  | "changePassword"
  | "deleteAccount"
  | "sessions";

export default function AccountPanel({
  isOpen,
  onClose,
  user,
  onNameUpdate,
}: AccountPanelProps) {
  const [activeView, setActiveView] = useState<ActiveView>("menu");

  // Form states
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Session states
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      // silently ignore
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "sessions") {
      fetchSessions();
    }
  }, [activeView, fetchSessions]);

  useEffect(() => {
    if (!isOpen) {
      // Reset to menu on close
      setTimeout(() => {
        setActiveView("menu");
        setMessage(null);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setDeleteConfirmText("");
      }, 300);
    }
  }, [isOpen]);

  const clearMessage = () => setMessage(null);

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessage();
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Name updated successfully!" });
        onNameUpdate?.(data.name);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update name" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessage();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update password" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessage();
    if (deleteConfirmText !== "DELETE") {
      setMessage({ type: "error", text: 'Type "DELETE" to confirm' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (res.ok) {
        signOut({ callbackUrl: "/login" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to delete account" });
        setLoading(false);
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const s = sessions.find((x) => x.id === sessionId);
    const sessionName = s ? s.name : "this session";
    if (!confirm(`Are you sure you want to delete "${sessionName}"? All subjects and attendance records for this term will be permanently deleted!`)) {
      return;
    }
    setDeletingId(sessionId);
    try {
      const res = await fetch(`/api/sessions?id=${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  const menuItems = [
    {
      id: "changeName" as ActiveView,
      icon: User,
      label: "Change Name",
      description: "Update your display name",
    },
    {
      id: "changePassword" as ActiveView,
      icon: Lock,
      label: "Change Password",
      description: "Update your login password",
    },
    {
      id: "sessions" as ActiveView,
      icon: Layers,
      label: "Manage Sessions",
      description: "View and remove academic terms",
    },
    {
      id: "deleteAccount" as ActiveView,
      icon: Trash2,
      label: "Delete Account",
      description: "Permanently delete your account",
      danger: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}

      {/* Panel */}
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}>
        {/* Panel Header */}
        <div className={styles.panelHeader}>
          {activeView !== "menu" ? (
            <button
              className={styles.backBtn}
              onClick={() => { setActiveView("menu"); setMessage(null); }}
            >
              ← Back
            </button>
          ) : (
            <div className={styles.panelHeaderUser}>
              <div className={styles.panelAvatar}>
                <User size={18} />
              </div>
              <div>
                <p className={styles.panelUserName}>{user.name}</p>
                <p className={styles.panelUserEmail}>{user.email}</p>
              </div>
            </div>
          )}
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Panel Body */}
        <div className={styles.panelBody}>
          {/* Status Message */}
          {message && (
            <div className={`${styles.statusMsg} ${styles[message.type]}`}>
              {message.type === "success" ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Main Menu */}
          {activeView === "menu" && (
            <div className={styles.menuList}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ""}`}
                    onClick={() => { setActiveView(item.id); setMessage(null); }}
                  >
                    <div className={`${styles.menuIcon} ${item.danger ? styles.menuIconDanger : ""}`}>
                      <Icon size={17} />
                    </div>
                    <div className={styles.menuItemText}>
                      <span className={styles.menuItemLabel}>{item.label}</span>
                      <span className={styles.menuItemDesc}>{item.description}</span>
                    </div>
                    <ChevronRight size={16} className={styles.menuArrow} />
                  </button>
                );
              })}

              <div className={styles.divider} />

              <button
                className={`${styles.menuItem} ${styles.menuItemLogout}`}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <div className={`${styles.menuIcon} ${styles.menuIconLogout}`}>
                  <LogOut size={17} />
                </div>
                <div className={styles.menuItemText}>
                  <span className={styles.menuItemLabel}>Sign Out</span>
                  <span className={styles.menuItemDesc}>Log out of this account</span>
                </div>
                <ChevronRight size={16} className={styles.menuArrow} />
              </button>
            </div>
          )}

          {/* Change Name */}
          {activeView === "changeName" && (
            <div className={styles.formView}>
              <h3 className={styles.viewTitle}>Change Display Name</h3>
              <form onSubmit={handleNameChange} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Your name"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Save Name"}
                </button>
              </form>
            </div>
          )}

          {/* Change Password */}
          {activeView === "changePassword" && (
            <div className={styles.formView}>
              <h3 className={styles.viewTitle}>Change Password</h3>
              <form onSubmit={handlePasswordChange} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {/* Manage Sessions */}
          {activeView === "sessions" && (
            <div className={styles.sessionsView}>
              <div className={styles.sessionsHeader}>
                <h3 className={styles.viewTitle}>Academic Sessions</h3>
                <button
                  className={styles.newSessionBtn}
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent("rubric:new-session"));
                  }}
                  title="Create new session"
                >
                  <Plus size={15} />
                  New
                </button>
              </div>
              {sessionsLoading ? (
                <div className={styles.sessionsLoading}>Loading…</div>
              ) : sessions.length === 0 ? (
                <div className={styles.sessionsEmpty}>
                  <Layers size={28} />
                  <p>No academic sessions yet.</p>
                </div>
              ) : (
                <ul className={styles.sessionsList}>
                  {sessions.map((s) => {
                    const start = new Date(s.startDate).getFullYear();
                    const end = new Date(s.endDate).getFullYear();
                    return (
                      <li key={s.id} className={styles.sessionItem}>
                        <div className={styles.sessionDot} />
                        <div className={styles.sessionInfo}>
                          <span className={styles.sessionName}>{s.name}</span>
                          <span className={styles.sessionDates}>
                            {start !== end ? `${start} – ${end}` : `${start}`}
                          </span>
                        </div>
                        <button
                          className={styles.sessionDeleteBtn}
                          onClick={() => handleDeleteSession(s.id)}
                          disabled={deletingId === s.id}
                          title="Delete session"
                        >
                          {deletingId === s.id ? (
                            <span className={styles.deletingSpinner} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Delete Account */}
          {activeView === "deleteAccount" && (
            <div className={styles.formView}>
              <div className={styles.dangerBanner}>
                <AlertCircle size={20} />
                <div>
                  <strong>Danger Zone</strong>
                  <p>
                    This will permanently delete your account, all sessions,
                    subjects, and attendance records. This action cannot be
                    undone.
                  </p>
                </div>
              </div>
              <form onSubmit={handleDeleteAccount} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    required
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  className={styles.deleteAccountBtn}
                  disabled={loading || deleteConfirmText !== "DELETE"}
                >
                  {loading ? "Deleting…" : "Delete My Account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
