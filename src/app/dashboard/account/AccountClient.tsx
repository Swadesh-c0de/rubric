"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  User,
  Trash2,
  LogOut,
  CheckCircle,
  AlertCircle,
  Layers,
  Plus,
  Mail,
  Shield,
  Clock,
} from "lucide-react";
import styles from "./AccountClient.module.css";

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standardClassDuration: number;
}

interface AccountClientProps {
  user: {
    name: string;
    email: string;
  };
  initialSessions: Session[];
}

type SettingsTab = "profile" | "security" | "sessions" | "danger";

export default function AccountClient({ user, initialSessions }: AccountClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Form states
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // New Session states
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionDuration, setNewSessionDuration] = useState(60);

  // Session list states
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const sessionsLoading = false;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // UI status states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        // Update local storage or session state if needed
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

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessage();
    if (!newSessionName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSessionName,
          standardClassDuration: newSessionDuration,
        }),
      });

      if (res.ok) {
        const newSession = await res.json();
        setSessions((prev) => [newSession, ...prev]);
        setNewSessionName("");
        setNewSessionDuration(60);
        setShowAddSession(false);
        setMessage({ type: "success", text: "Academic session created successfully!" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to create session" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to server" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const s = sessions.find((x) => x.id === sessionId);
    const sessionName = s ? s.name : "this session";
    if (
      !confirm(
        `Are you sure you want to delete "${sessionName}"? All subjects and attendance records for this term will be permanently deleted!`
      )
    ) {
      return;
    }
    setDeletingId(sessionId);
    try {
      const res = await fetch(`/api/sessions?id=${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setMessage({ type: "success", text: "Academic session deleted." });
      }
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
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

  return (
    <div className={styles.container}>
      {/* Header Panel */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>Account Settings</h2>
          <p className={styles.headerSubtitle}>
            Configure settings, manage active terms, and customize your dashboard preferences.
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`btn btn-secondary ${styles.signOutBtn}`}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className={styles.settingsLayout}>
        {/* Left Settings Navigation Menu */}
        <div className={styles.leftCol}>
          <div className={`glass-card ${styles.tabsCard}`}>
            <button
              onClick={() => { setActiveTab("profile"); clearMessage(); }}
              className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
            >
              <User size={16} />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => { setActiveTab("security"); clearMessage(); }}
              className={`${styles.tabBtn} ${activeTab === "security" ? styles.tabBtnActive : ""}`}
            >
              <Shield size={16} />
              <span>Security</span>
            </button>
            <button
              onClick={() => { setActiveTab("sessions"); clearMessage(); }}
              className={`${styles.tabBtn} ${activeTab === "sessions" ? styles.tabBtnActive : ""}`}
            >
              <Layers size={16} />
              <span>Manage Terms</span>
            </button>
            <button
              onClick={() => { setActiveTab("danger"); clearMessage(); }}
              className={`${styles.tabBtn} ${styles.tabBtnDanger} ${activeTab === "danger" ? styles.tabBtnActiveDanger : ""}`}
            >
              <Trash2 size={16} />
              <span>Danger Zone</span>
            </button>
          </div>
        </div>

        {/* Right Active View Panel */}
        <div className={styles.rightCol}>
          {message && (
            <div className={`${styles.statusMsg} ${styles[message.type]}`}>
              {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Edit Profile Tab */}
          {activeTab === "profile" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Profile Information</h3>
                <p className={styles.cardSubtitle}>
                  Update your display name and review account registration details.
                </p>
              </div>

              <form onSubmit={handleNameChange} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className={styles.readOnlyInput}>
                    <Mail size={16} className={styles.inputIcon} />
                    <span>{user.email}</span>
                  </div>
                  <span className={styles.helpText}>Contact support to modify email address.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Enter full name"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving changes..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Change Password</h3>
                <p className={styles.cardSubtitle}>
                  Secure your account by updating your current password.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Updating password..." : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {/* Manage Terms Tab */}
          {activeTab === "sessions" && (
            <div className={`glass-card ${styles.settingsCard}`}>
              <div className={styles.cardHeaderInline}>
                <div>
                  <h3 className={styles.cardTitle}>Academic Term Sessions</h3>
                  <p className={styles.cardSubtitle}>
                    Create, edit, and organize terms to track specific attendance limits.
                  </p>
                </div>
                {!showAddSession && (
                  <button
                    onClick={() => setShowAddSession(true)}
                    className={`btn btn-primary ${styles.addNewBtn}`}
                  >
                    <Plus size={14} />
                    <span>Add Term</span>
                  </button>
                )}
              </div>

              {showAddSession && (
                <div className={styles.addSessionBox}>
                  <h4 className={styles.inlineFormTitle}>Add New Academic Term</h4>
                  <form onSubmit={handleCreateSession} className={styles.form}>
                    <div className="form-group">
                      <label className="form-label">Term Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        required
                        placeholder="e.g. Autumn Semester 2026"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Standard Class Duration (Minutes)</label>
                      <div className={styles.durationInputRow}>
                        <Clock size={16} className={styles.inputIcon} />
                        <input
                          type="number"
                          className="input-field"
                          value={newSessionDuration}
                          onChange={(e) => setNewSessionDuration(parseInt(e.target.value, 10))}
                          required
                          min={5}
                          max={300}
                        />
                      </div>
                    </div>
                    <div className={styles.inlineFormActions}>
                      <button
                        type="button"
                        onClick={() => setShowAddSession(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        Create Term
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {sessionsLoading ? (
                <div className={styles.sessionsLoading}>
                  <div className="spinner" />
                  <p>Loading academic sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className={styles.sessionsEmpty}>
                  <Layers size={40} />
                  <p>No academic terms configured. Add a term to start tracking subjects.</p>
                </div>
              ) : (
                <div className={styles.sessionsListContainer}>
                  {sessions.map((s) => {
                    const startYear = new Date(s.startDate).getFullYear();
                    const endYear = new Date(s.endDate).getFullYear();
                    const yearDisplay = startYear !== endYear ? `${startYear} – ${endYear}` : `${startYear}`;
                    return (
                      <div key={s.id} className={styles.sessionCard}>
                        <div className={styles.sessionMeta}>
                          <span className={styles.sessionNameText}>{s.name}</span>
                          <span className={styles.sessionMetaInfo}>
                            Academic Year: {yearDisplay} • Class duration: {s.standardClassDuration} mins
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          disabled={deletingId === s.id}
                          className={styles.sessionDeleteBtn}
                          title="Delete Academic Session"
                        >
                          {deletingId === s.id ? (
                            <span className={styles.spinnerTiny} />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === "danger" && (
            <div className={`glass-card ${styles.settingsCard} ${styles.dangerZoneBorder}`}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} ${styles.dangerTitle}`}>Danger Zone</h3>
                <p className={styles.cardSubtitle}>
                  Irreversible administrative options. Please proceed with caution.
                </p>
              </div>

              <div className={styles.dangerNotice}>
                <AlertCircle size={20} />
                <div>
                  <strong>Permanently delete account</strong>
                  <p>
                    All logs, courses, sessions, and academic details will be wiped. This action
                    cannot be recovered.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">
                    To confirm deletion, type <strong>DELETE</strong> below
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
                  className={styles.deleteAccountActionBtn}
                  disabled={loading || deleteConfirmText !== "DELETE"}
                >
                  {loading ? "Deleting account..." : "Delete Account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
