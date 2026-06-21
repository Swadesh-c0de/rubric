"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Trash2, Edit2 } from "lucide-react";
import styles from "./SubjectList.module.css";
import { getRecordWeight } from "@/lib/attendance";

interface Subject {
  id: string;
  name: string;
  colorCode: string;
}

interface AttendanceRecord {
  id: string;
  status: string;
  subjectId: string;
  classTiming: string | null;
}

interface SubjectListProps {
  subjects: Subject[];
  records: AttendanceRecord[];
  isAddSubjectOpen: boolean;
  setIsAddSubjectOpen: (open: boolean) => void;
  subjectName: string;
  setSubjectName: (name: string) => void;
  subjectColor: string;
  setSubjectColor: (color: string) => void;
  onSubmitSubject: (e: React.FormEvent) => void;
  error?: string;
  standardClassDuration: number;
  onDeleteSubject: (id: string) => Promise<void>;
  onEditSubject: (id: string, name: string, colorCode: string) => Promise<void>;
}

export default function SubjectList({
  subjects,
  records,
  isAddSubjectOpen,
  setIsAddSubjectOpen,
  subjectName,
  setSubjectName,
  subjectColor,
  setSubjectColor,
  onSubmitSubject,
  error,
  standardClassDuration,
  onDeleteSubject,
  onEditSubject,
}: SubjectListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const startEdit = (sub: Subject) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setEditColor(sub.colorCode);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onEditSubject(id, editName, editColor);
    setEditingId(null);
  };

  if (!isExpanded) {
    return (
      <div className={`glass-card ${styles.compactContainer}`}>
        <div className={styles.compactList}>
          <span className={styles.compactTitle}>Term Subjects:</span>
          {subjects.length === 0 ? (
            <span className={styles.noSubjectsText}>No subjects added yet.</span>
          ) : (
            subjects.map((sub) => {
              const subRecords = records.filter((r) => r.subjectId === sub.id);
              const subAtt = subRecords
                .filter((r) => r.status === "ATTENDED")
                .reduce((sum, r) => sum + getRecordWeight(r.classTiming, r.status, standardClassDuration), 0);
              const subMiss = subRecords
                .filter((r) => r.status === "MISSED")
                .reduce((sum, r) => sum + getRecordWeight(r.classTiming, r.status, standardClassDuration), 0);
              const subTotal = subAtt + subMiss;
              const subRate = subTotal > 0 ? Math.round((subAtt / subTotal) * 100) : 100;

              return (
                <div
                  key={sub.id}
                  className={styles.compactBadge}
                  style={{
                    borderLeft: `3px solid ${sub.colorCode}`,
                    background: `${sub.colorCode}08`
                  }}
                >
                  <span className={styles.compactName}>{sub.name}</span>
                  <span
                    className={styles.compactRate}
                    style={{
                      color: subRate >= 75 ? "var(--accent-success)" : "var(--accent-danger)"
                    }}
                  >
                    {subRate}%
                  </span>
                </div>
              );
            })
          )}
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className={`btn btn-secondary ${styles.manageBtn}`}
          style={{ padding: "6px 12px", fontSize: "0.78rem", whiteSpace: "nowrap" }}
        >
          Manage Subjects
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Subjects & Classes</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setIsAddSubjectOpen(!isAddSubjectOpen)}
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          >
            <Plus size={16} /> Add Subject
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="btn btn-secondary"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          >
            Done Managing
          </button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {isAddSubjectOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`glass-card ${styles.addBox}`}
          >
            <form onSubmit={onSubmitSubject} className={styles.form}>
              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Advanced Calculus"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Theme Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={subjectColor}
                      onChange={(e) => setSubjectColor(e.target.value)}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Choose card tab color accent
                    </span>
                  </div>
                </div>
              </div>

              {error && <div className={styles.errorText}>{error}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Create Subject
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {subjects.length === 0 ? (
        <div className={styles.emptyBox}>
          <BookOpen size={40} className={styles.emptyIcon} />
          <h4>No Subjects Added</h4>
          <p>Add subjects to start registering daily attendance logs.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {subjects.map((sub, idx) => {
            const subRecords = records.filter((r) => r.subjectId === sub.id);
            const subAtt = subRecords
              .filter((r) => r.status === "ATTENDED")
              .reduce((sum, r) => sum + getRecordWeight(r.classTiming, r.status, standardClassDuration), 0);
            const subMiss = subRecords
              .filter((r) => r.status === "MISSED")
              .reduce((sum, r) => sum + getRecordWeight(r.classTiming, r.status, standardClassDuration), 0);
            const subTotal = subAtt + subMiss;
            const subRate = subTotal > 0 ? Math.round((subAtt / subTotal) * 100) : 100;

            const isEditingThis = editingId === sub.id;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={isEditingThis ? undefined : { y: -3, scale: 1.01 }}
                className={styles.card}
              >
                <div className={styles.folderTab}>
                  <div className={styles.folderTabColor} style={{ backgroundColor: isEditingThis ? editColor : sub.colorCode }} />
                </div>

                {isEditingThis ? (
                  <div className={styles.editForm}>
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field"
                        style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                        required
                        placeholder="Subject Name"
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className={styles.colorPickerSmall}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Accent Color</span>
                    </div>
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        onClick={() => onDeleteSubject(sub.id)}
                        className={styles.iconBtnDanger}
                        style={{ marginRight: "auto", padding: "4px" }}
                        title="Delete Subject"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(sub.id)}
                        className="btn btn-primary"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.cardTop}>
                      <span className={styles.subName}>{sub.name}</span>
                      <div className={styles.cardHeaderRight}>
                        <div className={styles.rateBadge}>
                          <span className={styles.colorDot} style={{ backgroundColor: sub.colorCode }} />
                          <span className={styles.rate}>{subRate}%</span>
                        </div>
                        <div className={styles.cardActions}>
                          <button
                            onClick={() => startEdit(sub)}
                            className={styles.iconBtn}
                            title="Edit Subject"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.stats}>
                      <div className={styles.statLine}>
                        <span>Total Classes:</span> <strong>{subTotal}</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Present:</span> <strong style={{ color: "var(--accent-success)" }}>{subAtt}</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Absent:</span> <strong style={{ color: "var(--accent-danger)" }}>{subMiss}</strong>
                      </div>
                    </div>
                    <div className={styles.cardFooter}>
                      <span className={styles.footerLabel}>Status:</span>
                      <span className={subRate >= 75 ? styles.footerVal : styles.footerValDanger}>
                        {subRate >= 75 ? "On Track (≥75%)" : "Below Limit (<75%)"}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
