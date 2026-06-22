"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";

import SubjectList from "@/components/dashboard/SubjectList";
import Calendar from "@/components/dashboard/Calendar";
import DailyLogger from "@/components/dashboard/DailyLogger";
import LoggedClasses from "@/components/dashboard/LoggedClasses";
import CustomSelect from "@/components/CustomSelect";
import styles from "./DashboardClient.module.css";

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  standardClassDuration: number;
}

interface Subject {
  id: string;
  name: string;
  colorCode: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes: string | null;
  classTiming: string | null;
  subjectId: string;
}

interface DashboardClientProps {
  user: {
    name: string;
    email: string;
  };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  // Session States
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [sessionDuration, setSessionDuration] = useState<number>(60);

  // Subject States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#7c3aed");
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  // Attendance & Calendar States
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0) {
          setActiveSession(data[0]);
        } else {
          setLoading(false);
        }
      }
    } catch {
      setError("Failed to load sessions");
      setLoading(false);
    }
  };

  const fetchSubjectsAndRecords = async (sessionId: string | null) => {
    if (!sessionId) {
      await Promise.resolve();
      setSubjects([]);
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch subjects
      const subRes = await fetch(`/api/subjects?sessionId=${sessionId}`);
      const subData = await subRes.json();
      setSubjects(subData);

      // Fetch attendance records
      const attRes = await fetch(`/api/attendance?sessionId=${sessionId}`);
      const attData = await attRes.json();
      setRecords(attData.records || []);

      // Data loaded successfully
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial sessions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Listen for new session event dispatched from AccountPanel
  useEffect(() => {
    const handler = () => setIsCreateSessionOpen(true);
    window.addEventListener("rubric:new-session", handler);
    return () => window.removeEventListener("rubric:new-session", handler);
  }, []);

  // Fetch subjects and records when activeSession changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubjectsAndRecords(activeSession?.id || null);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeSession]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!sessionName) {
      setError("Session name is required");
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionName,
          standardClassDuration: sessionDuration,
        }),
      });

      if (res.ok) {
        const newSession = await res.json();
        setSessions([newSession, ...sessions]);
        setActiveSession(newSession);
        setIsCreateSessionOpen(false);
        setSessionName("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create session");
      }
    } catch {
      setError("Something went wrong");
    }
  };




  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setError("");

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subjectName,
          colorCode: subjectColor,
          sessionId: activeSession.id,
        }),
      });

      if (res.ok) {
        const newSub = await res.json();
        setSubjects([...subjects, newSub]);
        setIsAddSubjectOpen(false);
        setSubjectName("");
        setSubjectColor("#7c3aed");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add subject");
      }
    } catch {
      setError("Something went wrong");
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to delete this subject? All associated attendance logs will be permanently deleted!")) return;
    try {
      const res = await fetch(`/api/subjects?id=${subjectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
        setRecords((prev) => prev.filter((r) => r.subjectId !== subjectId));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete subject");
      }
    } catch {
      setError("Failed to delete subject");
    }
  };

  const handleEditSubject = async (subjectId: string, name: string, colorCode: string) => {
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subjectId,
          name,
          colorCode,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubjects((prev) => prev.map((s) => (s.id === subjectId ? updated : s)));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update subject");
      }
    } catch {
      setError("Failed to update subject");
    }
  };

  const handleCreateClassLog = async (
    subjectId: string,
    date: Date,
    status: "ATTENDED" | "MISSED" | "CANCELLED",
    notes: string,
    classTiming: string
  ) => {
    if (!activeSession) throw new Error("No active session");

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        date: date.toISOString(),
        status,
        notes: notes || null,
        classTiming: classTiming || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to log attendance");
    }

    const newRecord = await res.json();
    setRecords((prev) => {
      // Update in-place if same subject + same day + same timing slot
      const index = prev.findIndex(
        (r) =>
          r.subjectId === subjectId &&
          isSameDay(new Date(r.date), date) &&
          r.classTiming === (classTiming || null)
      );
      if (index > -1) {
        const copy = [...prev];
        copy[index] = newRecord;
        return copy;
      }
      return [...prev, newRecord];
    });
  };

  const handleDeleteClassLog = async (recordId: string) => {
    try {
      const res = await fetch(`/api/attendance?id=${recordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };


  if (loading && sessions.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  // Create session prompting screen
  if (sessions.length === 0 || isCreateSessionOpen) {
    return (
      <div className={styles.newSessionContainer}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass-card new-session-card"
        >
          <div className={styles.cardHeader}>
            <CalendarIcon size={32} className={styles.cardIcon} />
            <h2>Start Academic Term</h2>
            <p>Set up an academic term session to start logging classes.</p>
          </div>

          <form onSubmit={handleCreateSession} className={styles.sessionForm}>
            <div className="form-group">
              <label className="form-label">Term Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Fall Semester 2026"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Standard Class Duration (minutes)</label>
              <input
                type="number"
                required
                min={1}
                max={300}
                className="input-field"
                placeholder="e.g. 60"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Math.max(1, parseInt(e.target.value, 10) || 0))}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                Define the length of a single class period (e.g., 60 min) to calculate weight for longer logs.
              </span>
            </div>

            {/* Start and End dates are managed dynamically to handle semester changes */}

            {error && <div className={styles.errorText}>{error}</div>}

            <div className={styles.formActions}>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                Initialize Term
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }


  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTodayLabel = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  return (
    <div className={styles.dashboardGrid}>
      {/* Header Panel */}
      <div className={styles.dashboardHeader}>
        <div>
          <span className={styles.welcomeText}>Academic Session</span>
          <div className={styles.sessionSelectorWrapper}>
            <CustomSelect
              value={activeSession?.id || ""}
              onChange={(val) => {
                const s = sessions.find((x) => x.id === val);
                if (s) setActiveSession(s);
              }}
              options={sessions.map((s) => ({ value: s.id, label: s.name }))}
              triggerClassName={styles.sessionSelector}
            />
            <button
              onClick={() => setIsCreateSessionOpen(true)}
              className={styles.smallAddBtn}
              title="Add New Session"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className={styles.userInfo}>
          <span className={styles.greeting}>{getGreeting()},</span>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.greetingDate}>{getTodayLabel()}</span>
        </div>
      </div>



      <div className={styles.subjectsSectionTop}>
        <SubjectList
          subjects={subjects}
          records={records}
          isAddSubjectOpen={isAddSubjectOpen}
          setIsAddSubjectOpen={setIsAddSubjectOpen}
          subjectName={subjectName}
          setSubjectName={setSubjectName}
          subjectColor={subjectColor}
          setSubjectColor={setSubjectColor}
          onSubmitSubject={handleCreateSubject}
          error={error}
          standardClassDuration={activeSession?.standardClassDuration || 60}
          onDeleteSubject={handleDeleteSubject}
          onEditSubject={handleEditSubject}
        />
      </div>

      {/* Main responsive grid dashboard content */}
      <div className={styles.dashboardContentGrid}>
        <div className={styles.calendarSection}>
          <Calendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            navigateMonth={navigateMonth}
            subjects={subjects}
            records={records}
          />
        </div>

        <div className={styles.loggerSection}>
          <DailyLogger
            selectedDate={selectedDate}
            subjects={subjects}
            records={records}
            onLogAttendance={handleCreateClassLog}
            standardClassDuration={activeSession?.standardClassDuration || 60}
          />
        </div>
      </div>

      <div className={styles.loggedClassesRow}>
        <LoggedClasses
          selectedDate={selectedDate}
          subjects={subjects}
          records={records}
          onDeleteAttendance={handleDeleteClassLog}
          standardClassDuration={activeSession?.standardClassDuration || 60}
        />
      </div>
    </div>
  );
}
