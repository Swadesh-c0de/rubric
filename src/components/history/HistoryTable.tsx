"use client";

import { Calendar, Clock, FileText, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import styles from "./HistoryTable.module.css";
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

interface HistoryTableProps {
  records: AttendanceRecord[];
  subjects: Subject[];
  onSelectRecord: (record: AttendanceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function HistoryTable({
  records,
  subjects,
  onSelectRecord,
  onDeleteRecord,
}: HistoryTableProps) {
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
    <div className={styles.tableCard}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Time</th>
              <th>Status</th>
              <th>Memo/Journal Notes</th>
              <th style={{ width: "80px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const subject = subjects.find((s) => s.id === rec.subjectId);
              if (!subject) return null;

              return (
                <tr
                  key={rec.id}
                  className={styles.tableRow}
                  onClick={() => onSelectRecord(rec)}
                >
                  <td>
                    <div className={styles.dateCol}>
                      <Calendar size={14} className={styles.calendarIcon} />
                      <span>{formatDate(rec.date)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.subjectCol}>
                      <span
                        className={styles.colorDot}
                        style={{ backgroundColor: subject.colorCode }}
                      />
                      <span className={styles.subjectName}>{subject.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.timeCol}>
                      {rec.classTiming ? (
                        <span className={styles.timeTag}>
                          <Clock size={11} /> {rec.classTiming}
                        </span>
                      ) : (
                        <span className={styles.emptyNote}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusStyle(rec.status)}`}>
                      {rec.status === "ATTENDED" && <CheckCircle2 size={12} />}
                      {rec.status === "MISSED" && <XCircle size={12} />}
                      {rec.status === "CANCELLED" && <AlertTriangle size={12} />}
                      {rec.status === "CANCELLED" ? "No Class" : rec.status.toLowerCase()}
                    </span>
                  </td>
                  <td className={styles.notesCol}>
                    {rec.notes ? (
                      <div className={styles.noteBox} title={rec.notes}>
                        <FileText size={12} className={styles.noteIcon} />
                        <span className={styles.noteText}>{rec.notes}</span>
                      </div>
                    ) : (
                      <span className={styles.emptyNote}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      className={styles.deleteBtn}
                      title="Delete Record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
