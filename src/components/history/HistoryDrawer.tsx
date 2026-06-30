"use client";

import { useState } from "react";
import { Calendar, Clock, FileText, X, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./HistoryDrawer.module.css";
import CustomSelect from "@/components/CustomSelect";
import { getRecordWeight, parseTimingRange, parseTimeToMinutes } from "@/lib/attendance";
import { formatDate, to24Hour, to12Hour, toISODateString, toUtcYYYYMMDD } from "@/lib/datetime";

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

interface HistoryDrawerProps {
  selectedRecord: AttendanceRecord;
  subjects: Subject[];
  records: AttendanceRecord[];
  activeSession: Session | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onSaveSuccess: (updatedRecord: AttendanceRecord) => void;
}

export default function HistoryDrawer({
  selectedRecord,
  subjects,
  records,
  activeSession,
  onClose,
  onDelete,
  onSaveSuccess,
}: HistoryDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Edit Mode States
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editStatus, setEditStatus] = useState<"ATTENDED" | "MISSED" | "CANCELLED">("ATTENDED");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ATTENDED":
        return styles.statusAttended;
      case "MISSED":
        return styles.statusMissed;
      default:
        return styles.statusCancelled;
    }
  };

  const handleOpenEdit = () => {
    setEditSubjectId(selectedRecord.subjectId);
    setEditDate(toISODateString(selectedRecord.date));

    if (selectedRecord.classTiming) {
      const parts = selectedRecord.classTiming.split(/[\u2013-]/);
      setEditStartTime(parts[0] ? to24Hour(parts[0]) : "");
      setEditEndTime(parts[1] ? to24Hour(parts[1]) : "");
    } else {
      setEditStartTime("");
      setEditEndTime("");
    }

    setEditStatus(selectedRecord.status as "ATTENDED" | "MISSED" | "CANCELLED");
    setEditNotes(selectedRecord.notes || "");
    setEditError("");
    setIsEditing(true);
  };

  const checkOverlapForEdit = (
    recordId: string,
    subjectId: string,
    dateStr: string,
    startTime: string,
    endTime: string,
    status: string
  ): string | null => {
    if (status === "CANCELLED") return null;

    const newStartMinutes = parseTimeToMinutes(to12Hour(startTime));
    const newEndMinutes = parseTimeToMinutes(to12Hour(endTime));
    if (newStartMinutes === null || newEndMinutes === null) return "Invalid time format";
    if (newStartMinutes >= newEndMinutes) return "End time must be after start time";

    // Compare with existing records on the same day (excluding the record being edited)
    const overlap = records.find((rec) => {
      if (rec.id === recordId) return false;
      if (rec.status === "CANCELLED" || !rec.classTiming) return false;

      const isSameDay = toUtcYYYYMMDD(rec.date) === toUtcYYYYMMDD(dateStr);

      if (!isSameDay) return false;

      const extRange = parseTimingRange(rec.classTiming);
      if (!extRange) return false;

      return newStartMinutes < extRange.end && extRange.start < newEndMinutes;
    });

    if (overlap) {
      const sub = subjects.find((s) => s.id === overlap.subjectId);
      return `Time overlaps with ${sub ? sub.name : "another class"} (${overlap.classTiming}).`;
    }

    return null;
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editStatus !== "CANCELLED" && (!editStartTime || !editEndTime)) {
      setEditError("Both Start Time and End Time are required.");
      return;
    }

    if (editStatus !== "CANCELLED" && editStartTime >= editEndTime) {
      setEditError("End time must be after start time.");
      return;
    }

    if (editStatus !== "CANCELLED") {
      const startMin = parseTimeToMinutes(to12Hour(editStartTime));
      const endMin = parseTimeToMinutes(to12Hour(editEndTime));
      if (startMin !== null && endMin !== null) {
        const duration = endMin - startMin;
        if (duration > 300) {
          setEditError("Class duration cannot exceed 5 hours. Please verify your AM/PM selections.");
          return;
        }
      }
    }

    // Overlap validation
    if (editStatus !== "CANCELLED") {
      const overlapError = checkOverlapForEdit(
        selectedRecord.id,
        editSubjectId,
        editDate,
        editStartTime,
        editEndTime,
        editStatus
      );
      if (overlapError) {
        setEditError(overlapError);
        return;
      }
    }

    setIsSaving(true);
    setEditError("");

    const classTiming =
      editStatus !== "CANCELLED"
        ? `${to12Hour(editStartTime)} – ${to12Hour(editEndTime)}`
        : null;

    try {
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRecord.id,
          subjectId: editSubjectId,
          date: editDate,
          status: editStatus,
          notes: editNotes || null,
          classTiming,
        }),
      });

      if (res.ok) {
        const updatedRecord = await res.json();
        onSaveSuccess(updatedRecord);
        setIsEditing(false);
      } else {
        const errData = await res.json();
        setEditError(errData.error || "Failed to update class log.");
      }
    } catch {
      setEditError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const subject = subjects.find((s) => s.id === selectedRecord.subjectId);

  return (
    <motion.div
      className={styles.drawerOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.drawer}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerHeaderTitle}>
            {isEditing ? "Edit Class Log" : "Log Details"}
          </h3>
          <button type="button" className={styles.drawerCloseBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isEditing ? (
          <form
            onSubmit={handleSaveChanges}
            style={{ display: "flex", flexDirection: "column", height: "calc(100% - 81px)", margin: 0 }}
          >
            <div className={styles.drawerBody}>
              {/* Subject Selector */}
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>Subject</label>
                <CustomSelect
                  value={editSubjectId}
                  onChange={(val) => setEditSubjectId(val)}
                  options={[
                    { value: "", label: "— Choose Subject —" },
                    ...subjects.map((sub) => ({ value: sub.id, label: sub.name })),
                  ]}
                  triggerClassName="input-field"
                />
              </div>

              {/* Date Input */}
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>Class Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {/* Time Range Input */}
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>Class Timing</label>
                <div className={styles.timeInputsRow}>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => {
                      setEditStartTime(e.target.value);
                      setEditError("");
                    }}
                    className="input-field"
                  />
                  <span className={styles.timeSeparator}>—</span>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => {
                      setEditEndTime(e.target.value);
                      setEditError("");
                    }}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Status Input */}
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>Attendance Status</label>
                <div className={styles.statusGroup}>
                  {(["ATTENDED", "MISSED", "CANCELLED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setEditStatus(s);
                        setEditError("");
                      }}
                      className={`${styles.statusBtn} ${
                        editStatus === s
                          ? s === "ATTENDED"
                            ? styles.attendedActive
                            : s === "MISSED"
                            ? styles.missedActive
                            : styles.cancelledActive
                          : ""
                      }`}
                    >
                      {s === "ATTENDED" ? "Present" : s === "MISSED" ? "Absent" : "No Class"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Input */}
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel}>Memo / Journal Notes</label>
                <textarea
                  placeholder="Lesson summary, homework..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="input-field"
                  style={{ minHeight: "100px", resize: "vertical" }}
                />
              </div>

              {editError && (
                <div className={styles.editError}>
                  <AlertTriangle size={14} />
                  <span>{editError}</span>
                </div>
              )}
            </div>

            <div className={styles.drawerFooter}>
              <div className={styles.drawerActions}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  {isSaving ? "Saving Changes…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditError("");
                  }}
                  className="btn btn-secondary"
                  style={{ width: "100%" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className={styles.drawerBody}>
              {/* Subject Details */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Subject</span>
                {subject ? (
                  <div className={styles.drawerSubject}>
                    <span
                      className={styles.colorDot}
                      style={{
                        backgroundColor: subject.colorCode,
                        width: "12px",
                        height: "12px",
                      }}
                    />
                    <span>{subject.name}</span>
                  </div>
                ) : (
                  <span className={styles.drawerValue}>Unknown Subject</span>
                )}
              </div>

              {/* Date details */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Class Date</span>
                <div className={styles.drawerValue} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={16} className={styles.calendarIcon} />
                  <span>{formatDate(selectedRecord.date)}</span>
                </div>
              </div>

              {/* Timing details */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Class Timing</span>
                <div className={styles.drawerValue}>
                  {selectedRecord.classTiming ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                      <span className={styles.timeTag}>
                        <Clock size={12} /> {selectedRecord.classTiming}
                      </span>
                      {activeSession && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {(() => {
                            const range = parseTimingRange(selectedRecord.classTiming);
                            if (!range) return "";
                            const duration = range.end - range.start;
                            const weight = getRecordWeight(
                              selectedRecord.classTiming,
                              selectedRecord.status,
                              activeSession.standardClassDuration
                            );
                            return `Duration: ${duration} mins (${weight} equivalent class${weight > 1 ? "es" : ""})`;
                          })()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.emptyNote}>No timing specified (—)</span>
                  )}
                </div>
              </div>

              {/* Status details */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Attendance Status</span>
                <div>
                  <span className={`${styles.statusBadge} ${getStatusStyle(selectedRecord.status)}`}>
                    {selectedRecord.status === "ATTENDED" && <CheckCircle2 size={13} />}
                    {selectedRecord.status === "MISSED" && <XCircle size={13} />}
                    {selectedRecord.status === "CANCELLED" && <AlertTriangle size={13} />}
                    {selectedRecord.status === "CANCELLED"
                      ? "No Class (Cancelled)"
                      : selectedRecord.status.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Notes / Memos */}
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Memo / Journal Notes</span>
                {selectedRecord.notes ? (
                  <div className={styles.drawerNotesCard}>
                    <div className={styles.drawerNotesTitle}>
                      <FileText size={13} />
                      <span>Notes</span>
                    </div>
                    <p>{selectedRecord.notes}</p>
                  </div>
                ) : (
                  <span className={styles.emptyNote}>No notes or memo recorded for this class.</span>
                )}
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <div className={styles.drawerActions}>
                <div className={styles.drawerRow}>
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className={`btn ${styles.editBtn}`}
                    style={{ flex: 1 }}
                  >
                    Edit Log
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const idToDelete = selectedRecord.id;
                      onClose();
                      await onDelete(idToDelete);
                    }}
                    className={`btn ${styles.drawerDeleteBtn}`}
                    style={{ flex: 1 }}
                  >
                    Delete Log
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
