"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, FileText, LayoutGrid, List } from "lucide-react";
import styles from "./HistoryClient.module.css";
import CustomSelect from "@/components/CustomSelect";
import HistoryTable from "@/components/history/HistoryTable";
import HistoryGrid from "@/components/history/HistoryGrid";
import HistoryDrawer from "@/components/history/HistoryDrawer";

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

interface HistoryClientProps {
  user: {
    name: string;
    email: string;
  };
  initialSessions: Session[];
  initialSubjects: Subject[];
  initialRecords: AttendanceRecord[];
}

export default function HistoryClient({
  user,
  initialSessions,
  initialSubjects,
  initialRecords,
}: HistoryClientProps) {
  const [sessions] = useState<Session[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<Session | null>(
    initialSessions.length > 0 ? initialSessions[0] : null
  );
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);

  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const isInitialMount = useRef(true);

  const fetchHistoryData = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const subRes = await fetch(`/api/subjects?sessionId=${sessionId}`);
      const subData = await subRes.json();
      setSubjects(subData);

      const attRes = await fetch(`/api/attendance?sessionId=${sessionId}`);
      const attData = await attRes.json();
      setRecords(attData.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this class log?")) return;
    try {
      const res = await fetch(`/api/attendance?id=${recordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
        if (selectedRecord?.id === recordId) {
          setSelectedRecord(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSuccess = (updatedRecord: AttendanceRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
    setSelectedRecord(null);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (activeSession) {
      fetchHistoryData(activeSession.id);
    }
  }, [activeSession, fetchHistoryData]);

  // Filter logic
  const filteredRecords = records.filter((rec) => {
    const subject = subjects.find((s) => s.id === rec.subjectId);
    if (!subject) return false;

    const matchesSubject = filterSubject === "ALL" || rec.subjectId === filterSubject;
    const matchesStatus = filterStatus === "ALL" || rec.status === filterStatus;
    const matchesSearch =
      searchTerm === "" ||
      (rec.notes && rec.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      subject.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSubject && matchesStatus && matchesSearch;
  });

  // Sort: Newest date first, then by class timing
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    const timeA = a.classTiming || "";
    const timeB = b.classTiming || "";
    return timeA.localeCompare(timeB);
  });

  if (loading && sessions.length === 0) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading History Log...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Panel */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>History & Attendance Logs</h2>
          <p className={styles.headerSubtitle}>
            Review, filter, and audit all logs for {user.name} during the selected academic term.
          </p>
        </div>

        {sessions.length > 0 && (
          <CustomSelect
            value={activeSession?.id || ""}
            onChange={(val) => {
              const s = sessions.find((x) => x.id === val);
              if (s) setActiveSession(s);
            }}
            options={sessions.map((s) => ({ value: s.id, label: s.name }))}
            triggerClassName={styles.sessionSelector}
          />
        )}
      </div>

      {/* Controls & Filters */}
      <div className={styles.controlsCard}>
        <div className={styles.filtersGrid}>
          {/* Search bar */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search Memos</label>
            <div className={styles.inputWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search subject or memo content..."
                className={`input-field ${styles.searchInput}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Subject Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Subject</label>
            <CustomSelect
              value={filterSubject}
              onChange={(val) => setFilterSubject(val)}
              options={[
                { value: "ALL", label: "All Subjects" },
                ...subjects.map((sub) => ({ value: sub.id, label: sub.name })),
              ]}
              triggerClassName="input-field"
            />
          </div>

          {/* Status Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status</label>
            <CustomSelect
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ATTENDED", label: "Attended" },
                { value: "MISSED", label: "Missed" },
                { value: "CANCELLED", label: "No Class" },
              ]}
              triggerClassName="input-field"
            />
          </div>

          {/* Actions button/toggles */}
          <div className={styles.actionsGroup}>
            {(searchTerm !== "" || filterSubject !== "ALL" || filterStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterSubject("ALL");
                  setFilterStatus("ALL");
                }}
                className={styles.resetBtn}
              >
                Clear Filters
              </button>
            )}

            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "table" ? styles.toggleBtnActive : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <List size={14} />
                <span>Table</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "grid" ? styles.toggleBtnActive : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid Card View"
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Logs Representation */}
      {sortedRecords.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} className={styles.emptyIcon} />
          <h3>No records found</h3>
          <p>Try adjusting your search criteria or add new attendance logs in the dashboard calendar.</p>
          {(searchTerm !== "" || filterSubject !== "ALL" || filterStatus !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterSubject("ALL");
                setFilterStatus("ALL");
              }}
              className="btn btn-secondary"
              style={{ marginTop: "12px" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <HistoryTable
          records={sortedRecords}
          subjects={subjects}
          onSelectRecord={setSelectedRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      ) : (
        <HistoryGrid
          records={sortedRecords}
          subjects={subjects}
          onSelectRecord={setSelectedRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      )}

      {/* Sliding Details Drawer overlay & drawer */}
      <AnimatePresence>
        {selectedRecord && (
          <HistoryDrawer
            selectedRecord={selectedRecord}
            subjects={subjects}
            records={records}
            activeSession={activeSession}
            onClose={() => setSelectedRecord(null)}
            onDelete={handleDeleteRecord}
            onSaveSuccess={handleSaveSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
