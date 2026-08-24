"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, FileText, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./HistoryClient.module.css";
import CustomSelect from "@/components/CustomSelect";
import HistoryTable from "@/components/history/HistoryTable";
import HistoryGrid from "@/components/history/HistoryGrid";
import HistoryDrawer from "@/components/history/HistoryDrawer";
import { toLocalYYYYMMDD, toUtcYYYYMMDD } from "@/lib/datetime";

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
  const [timelinePreset, setTimelinePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isInitialMount = useRef(true);

  const handleTimelinePresetChange = (preset: string) => {
    setTimelinePreset(preset);
    const now = new Date();
    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = toLocalYYYYMMDD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "THIS_WEEK") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      setStartDate(toLocalYYYYMMDD(monday));
      setEndDate(toLocalYYYYMMDD(sunday));
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toLocalYYYYMMDD(firstDay));
      setEndDate(toLocalYYYYMMDD(lastDay));
    } else if (preset === "LAST_30_DAYS") {
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      setStartDate(toLocalYYYYMMDD(thirtyDaysAgo));
      setEndDate(toLocalYYYYMMDD(now));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterSubject("ALL");
    setFilterStatus("ALL");
    setTimelinePreset("ALL");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    filterSubject !== "ALL" ||
    filterStatus !== "ALL" ||
    timelinePreset !== "ALL" ||
    startDate !== "" ||
    endDate !== "";

  // Reset page when filters, session or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubject, filterStatus, searchTerm, startDate, endDate, activeSession, pageSize]);

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

    const recDateStr = toUtcYYYYMMDD(rec.date);
    const matchesStartDate = !startDate || recDateStr >= startDate;
    const matchesEndDate = !endDate || recDateStr <= endDate;

    return (
      matchesSubject &&
      matchesStatus &&
      matchesSearch &&
      matchesStartDate &&
      matchesEndDate
    );
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

  // Pagination calculations
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

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
          <div className={`${styles.filterGroup} ${styles.searchFilterGroup}`}>
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
          <div className={`${styles.filterGroup} ${styles.subjectFilterGroup}`}>
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
          <div className={`${styles.filterGroup} ${styles.statusFilterGroup}`}>
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

          {/* Timeline Filter */}
          <div className={`${styles.filterGroup} ${styles.timelineFilterGroup}`}>
            <label className={styles.filterLabel}>Timeline</label>
            <CustomSelect
              value={timelinePreset}
              onChange={(val) => handleTimelinePresetChange(val)}
              options={[
                { value: "ALL", label: "All Time" },
                { value: "TODAY", label: "Today" },
                { value: "THIS_WEEK", label: "This Week" },
                { value: "THIS_MONTH", label: "This Month" },
                { value: "LAST_30_DAYS", label: "Past 30 Days" },
                { value: "CUSTOM", label: "Custom Range" },
              ]}
              triggerClassName="input-field"
            />
          </div>

          {/* Date range pickers (only rendered when 'Custom Range' is active) */}
          {timelinePreset === "CUSTOM" && (
            <div className={styles.dateRangeGroup}>
              <div className={styles.dateField}>
                <label className={styles.filterLabel}>From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`input-field ${styles.dateInput}`}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.filterLabel}>To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`input-field ${styles.dateInput}`}
                />
              </div>
            </div>
          )}

          {/* Actions button/toggles */}
          <div className={styles.actionsGroup}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
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
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ marginTop: "12px" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "table" ? (
            <HistoryTable
              records={paginatedRecords}
              subjects={subjects}
              onSelectRecord={setSelectedRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          ) : (
            <HistoryGrid
              records={paginatedRecords}
              subjects={subjects}
              onSelectRecord={setSelectedRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {/* Pagination Toolbar */}
          <div className={styles.paginationContainer}>
            <div className={styles.paginationTopRow}>
              <div className={styles.paginationInfo}>
                Showing <strong>{totalRecords > 0 ? startIndex + 1 : 0}</strong>–<strong>{endIndex}</strong> of <strong>{totalRecords}</strong> logs
              </div>

              <div className={styles.pageSizeWrapper}>
                <span className={styles.pageSizeLabel}>Rows per page:</span>
                <div className={styles.pageSizePills}>
                  {[10, 25, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`${styles.pageSizePill} ${pageSize === size ? styles.pageSizePillActive : ""}`}
                      onClick={() => setPageSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {totalPages > 1 && (
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className={styles.pageEllipsis}>
                      •••
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      className={`${styles.pageBtn} ${safeCurrentPage === p ? styles.pageBtnActive : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
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
