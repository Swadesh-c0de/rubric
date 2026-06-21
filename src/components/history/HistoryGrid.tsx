"use client";

import { Calendar, Clock, FileText, Trash2, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import styles from "./HistoryGrid.module.css";
import { formatDate } from "@/lib/datetime";

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

interface HistoryGridProps {
  records: AttendanceRecord[];
  subjects: Subject[];
  onSelectRecord: (record: AttendanceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function HistoryGrid({
  records,
  subjects,
  onSelectRecord,
  onDeleteRecord,
}: HistoryGridProps) {
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

  return (
    <div className={styles.cardGrid}>
      {records.map((rec) => {
        const subject = subjects.find((s) => s.id === rec.subjectId);
        if (!subject) return null;

        // Custom properties for styling glows
        const cardStyle = {
          "--subject-color": subject.colorCode,
          "--subject-color-glow": `${subject.colorCode}1a`
        } as React.CSSProperties;

        return (
          <div
            key={rec.id}
            className={styles.logCard}
            style={cardStyle}
            onClick={() => onSelectRecord(rec)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardSubject}>
                <span
                  className={styles.subjectTag}
                  style={{
                    backgroundColor: `${subject.colorCode}12`,
                    color: subject.colorCode,
                    border: `1px solid ${subject.colorCode}25`,
                  }}
                >
                  {subject.name}
                </span>
              </div>
              <span className={`${styles.statusBadge} ${getStatusStyle(rec.status)}`}>
                {rec.status === "ATTENDED" && <CheckCircle2 size={12} />}
                {rec.status === "MISSED" && <XCircle size={12} />}
                {rec.status === "CANCELLED" && <AlertTriangle size={12} />}
                {rec.status === "CANCELLED" ? "No Class" : rec.status.toLowerCase()}
              </span>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardDate}>
                <Calendar size={13} className={styles.calendarIcon} />
                <span>{formatDate(rec.date)}</span>
              </div>

              {rec.classTiming ? (
                <span className={`${styles.timeTag} ${styles.cardTimeBadge}`}>
                  <Clock size={11} /> {rec.classTiming}
                </span>
              ) : (
                <span className={styles.emptyNote}>—</span>
              )}

              {rec.notes && (
                <div className={styles.cardNotes}>
                  <FileText size={12} className={styles.cardNotesIcon} />
                  <span className={styles.noteText}>{rec.notes}</span>
                </div>
              )}
            </div>

            <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
              <span className={styles.cardDetailsLink}>
                Details <ChevronRight size={12} />
              </span>
              <button
                type="button"
                onClick={() => onDeleteRecord(rec.id)}
                className={styles.deleteBtn}
                title="Delete Record"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
