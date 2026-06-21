"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Clock, FileText, Trash2, PlusCircle, AlertCircle } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import styles from "./DailyLogger.module.css";
import { getRecordWeight } from "@/lib/attendance";

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

interface DailyLoggerProps {
  selectedDate: Date;
  subjects: Subject[];
  records: AttendanceRecord[];
  onLogAttendance: (
    subjectId: string,
    date: Date,
    status: "ATTENDED" | "MISSED" | "CANCELLED",
    notes: string,
    classTiming: string
  ) => Promise<void>;
  onDeleteAttendance: (recordId: string) => Promise<void>;
  standardClassDuration: number;
}

function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [, hoursStr, minutesStr, modifier] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (modifier.toUpperCase() === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function parseTimingRange(timingStr: string): { start: number; end: number } | null {
  if (!timingStr) return null;
  const cleanTiming = timingStr.split("|")[0];
  const parts = cleanTiming.split(/[\u2013-]/);
  if (parts.length !== 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null) return null;
  return { start, end };
}

export default function DailyLogger({
  selectedDate,
  subjects,
  records,
  onLogAttendance,
  onDeleteAttendance,
  standardClassDuration,
}: DailyLoggerProps) {
  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<"ATTENDED" | "MISSED" | "CANCELLED">("ATTENDED");
  const [notes, setNotes] = useState("");
  const [customWeight, setCustomWeight] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  /** Formats "HH:MM" → "9:00 AM" style */
  const fmt12 = (t: string) => {
    if (!t) return "";
    const [hStr, m] = t.split(":");
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${suffix}`;
  };

  /** Build the classTiming string stored in DB */
  const buildTimingString = () => {
    if (!startTime || !endTime) return "";
    return `${fmt12(startTime)} – ${fmt12(endTime)}`;
  };

  /** Validate end time is after start time */
  const timeError =
    startTime && endTime && startTime >= endTime
      ? "End time must be after start time"
      : "";

  const getPreviewWeight = () => {
    if (status === "CANCELLED" || !startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const duration = endMin - startMin;
    if (duration <= 0) return 0;
    return Math.max(1, Math.round(duration / standardClassDuration));
  };

  const getPreviewDuration = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    return endMin - startMin;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    if (status !== "CANCELLED" && (!startTime || !endTime)) {
      setSubmitError("Both Start Time and End Time are required.");
      return;
    }

    if (timeError) {
      setSubmitError(timeError);
      return;
    }

    // Overlap validation
    if (status !== "CANCELLED") {
      const newTimingStr = buildTimingString();
      const newRange = parseTimingRange(newTimingStr);
      if (newRange) {
        const duration = newRange.end - newRange.start;
        if (duration > 300) {
          setSubmitError("Class duration cannot exceed 5 hours. Please verify your AM/PM selections.");
          return;
        }

        const overlap = dayRecords.find((rec) => {
          if (rec.status === "CANCELLED" || !rec.classTiming) return false;
          // Ignore the slot if we are updating the exact same subject class slot
          if (rec.subjectId === selectedSubjectId && rec.classTiming === newTimingStr) return false;

          const extRange = parseTimingRange(rec.classTiming);
          if (!extRange) return false;
          return newRange.start < extRange.end && extRange.start < newRange.end;
        });

        if (overlap) {
          const overlapSubject = subjects.find(s => s.id === overlap.subjectId);
          const subName = overlapSubject ? overlapSubject.name : "another class";
          setSubmitError(`Time overlaps with ${subName} (${overlap.classTiming}).`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const calculatedWeight = customWeight !== null ? customWeight : getPreviewWeight();
      const timingString = buildTimingString();
      const finalTiming = timingString ? `${timingString}|w:${calculatedWeight}` : "";

      await onLogAttendance(
        selectedSubjectId,
        selectedDate,
        status,
        notes,
        finalTiming
      );
      // Reset timing + notes on success (keep subject & status for quick multi-entry)
      setStartTime("");
      setEndTime("");
      setNotes("");
      setCustomWeight(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      setSubmitError(errorObj?.message || "Failed to log attendance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Records logged for the selected calendar day
  const dayRecords = records.filter((rec) => isSameDay(new Date(rec.date), selectedDate));

  return (
    <div className={`glass-card ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.dateBadge}>
          <CalendarIcon size={15} />
          <span>{formatDate(selectedDate)}</span>
        </div>
        <span className={styles.helperText}>Log classes manually with custom timings</span>
      </div>

      {subjects.length === 0 ? (
        <p className={styles.emptyText}>Add subjects first to begin logging classes.</p>
      ) : (
        <div className={styles.contentContainer}>
          {/* ── LOG ENTRY FORM ── */}
          <form onSubmit={handleSubmit} className={styles.logForm}>

            {/* Row 1: Subject selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject</label>
              <CustomSelect
                value={selectedSubjectId}
                onChange={(val) => setSelectedSubjectId(val)}
                options={[
                  { value: "", label: "— Choose Subject —" },
                  ...subjects.map((sub) => ({ value: sub.id, label: sub.name })),
                ]}
                triggerClassName="input-field"
              />
            </div>

            {/* Row 2: Start + End time */}
            <div className={styles.timeRow}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <Clock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setSubmitError(""); setCustomWeight(null); }}
                  className={`input-field ${styles.timeInput}`}
                />
              </div>

              <div className={styles.timeSeparator}>
                <span>—</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <Clock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setSubmitError(""); setCustomWeight(null); }}
                  className={`input-field ${styles.timeInput} ${timeError ? styles.inputError : ""}`}
                />
              </div>
            </div>

            {startTime && endTime && !timeError && status !== "CANCELLED" && (
              <div className={styles.equivalentClassesInfo}>
                <span>Equivalent classes: </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customWeight !== null ? customWeight : getPreviewWeight()}
                  onChange={(e) => setCustomWeight(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={styles.weightInput}
                />
                <span className={styles.durationMins}> ({getPreviewDuration()} mins)</span>
              </div>
            )}

            {/* Inline time validation */}
            {timeError && (
              <div className={styles.inlineError}>
                <AlertCircle size={13} />
                <span>{timeError}</span>
              </div>
            )}

            {/* Row 3: Attendance status segmented buttons */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Attendance Status</label>
              <div className={styles.statusGroup}>
                {(["ATTENDED", "MISSED", "CANCELLED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setStatus(s); setSubmitError(""); }}
                    className={`${styles.statusBtn} ${
                      status === s
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

            {/* Row 4: Notes + vibe tags */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class Notes (optional)</label>
              <div className={styles.vibeBar}>
                {["📝 Focus", "⚡ Energy", "😴 Tired", "☕ Chill"].map((vibe) => (
                  <button
                    key={vibe}
                    type="button"
                    onClick={() => {
                      if (!notes.includes(vibe)) {
                        setNotes((prev) => (prev ? `${vibe} | ${prev}` : `${vibe} | `));
                      }
                    }}
                    className={styles.vibeTag}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Lesson summary, homework, how the class felt..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                style={{ minHeight: "60px", resize: "vertical" }}
              />
            </div>

            {/* Submit error */}
            {submitError && (
              <div className={styles.submitError}>
                <AlertCircle size={14} />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !selectedSubjectId || !!timeError}
              className={`btn btn-primary ${styles.submitBtn}`}
            >
              <PlusCircle size={16} />
              {isSubmitting ? "Logging…" : "Log Class Attendance"}
            </button>
          </form>

          {/* ── LOGGED CLASSES FOR THIS DAY ── */}
          <div className={styles.logsListContainer}>
            <h5 className={styles.sectionTitle}>
              Logged Classes
              {dayRecords.length > 0 && (
                <span className={styles.logCount}>{dayRecords.length}</span>
              )}
            </h5>

            {dayRecords.length === 0 ? (
              <p className={styles.noLogsText}>No classes logged for this date.</p>
            ) : (
              <div className={styles.ledgerList}>
                {dayRecords.map((rec) => {
                  const sub = subjects.find((s) => s.id === rec.subjectId);
                  if (!sub) return null;

                  return (
                    <div key={rec.id} className={styles.ledgerItem}>
                      <div className={styles.ledgerMain}>
                        <div className={styles.ledgerMeta}>
                          <span
                            className={styles.colorDot}
                            style={{ backgroundColor: sub.colorCode }}
                          />
                          <span className={styles.ledgerSubName}>{sub.name}</span>
                          {rec.classTiming && (() => {
                            const weight = getRecordWeight(rec.classTiming, rec.status, standardClassDuration);
                            return (
                              <span className={styles.ledgerTime}>
                                <Clock size={11} /> {rec.classTiming}
                                {weight > 0 && (
                                  <strong className={styles.ledgerWeight}> ({weight} class{weight !== 1 ? "es" : ""})</strong>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        <span
                          className={`${styles.statusIndicator} ${
                            rec.status === "ATTENDED"
                              ? styles.statusAttended
                              : rec.status === "MISSED"
                              ? styles.statusMissed
                              : styles.statusCancelled
                          }`}
                        >
                          {rec.status === "ATTENDED"
                            ? "Present"
                            : rec.status === "MISSED"
                            ? "Absent"
                            : "No Class"}
                        </span>
                      </div>

                      {rec.notes && (
                        <div className={styles.ledgerNotes}>
                          <FileText size={12} />
                          <span>{rec.notes}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteAttendance(rec.id)}
                        className={styles.deleteBtn}
                        title="Delete log"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
