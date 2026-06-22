"use client";

import { Clock, FileText, Trash2 } from "lucide-react";
import styles from "./LoggedClasses.module.css";
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

interface LoggedClassesProps {
  selectedDate: Date;
  subjects: Subject[];
  records: AttendanceRecord[];
  onDeleteAttendance: (recordId: string) => Promise<void>;
  standardClassDuration: number;
}

export default function LoggedClasses({
  selectedDate,
  subjects,
  records,
  onDeleteAttendance,
  standardClassDuration,
}: LoggedClassesProps) {
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const dayRecords = records.filter((rec) => isSameDay(new Date(rec.date), selectedDate));

  return (
    <div className={`glass-card ${styles.card}`}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          Logged Classes for {formatDate(selectedDate)}
          {dayRecords.length > 0 && (
            <span className={styles.logCount}>{dayRecords.length}</span>
          )}
        </h3>
        <span className={styles.helperText}>Review or remove class logs for this day</span>
      </div>

      {dayRecords.length === 0 ? (
        <p className={styles.noLogsText}>No classes logged for this date.</p>
      ) : (
        <div className={styles.ledgerGrid}>
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
  );
}
