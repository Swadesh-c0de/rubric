"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Calendar.module.css";
import { toLocalYYYYMMDD, toUtcYYYYMMDD } from "@/lib/datetime";

interface Subject {
  id: string;
  name: string;
  colorCode: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  subjectId: string;
}

interface CalendarProps {
  currentMonth: Date;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  navigateMonth: (direction: "prev" | "next") => void;
  subjects: Subject[];
  records: AttendanceRecord[];
}

export default function Calendar({
  currentMonth,
  selectedDate,
  setSelectedDate,
  navigateMonth,
  subjects,
  records,
}: CalendarProps) {

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayIndex = getFirstDayOfMonth(currentMonth);
    const calendarDays = [];

    // Empty offsets
    for (let i = 0; i < firstDayIndex; i++) {
      calendarDays.push(<div key={`empty-${i}`} className={styles.dayEmpty} />);
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = toLocalYYYYMMDD(dayDate) === toLocalYYYYMMDD(selectedDate);
      const isToday = toLocalYYYYMMDD(dayDate) === toLocalYYYYMMDD(new Date());
      const dayRecords = records.filter((r) => toUtcYYYYMMDD(r.date) === toLocalYYYYMMDD(dayDate));

      calendarDays.push(
        <button
          key={`day-${day}`}
          onClick={() => setSelectedDate(dayDate)}
          className={`${styles.day} ${isSelected ? styles.selected : ""} ${isToday ? styles.today : ""}`}
        >
          <span className={styles.dayNumber}>{day}</span>
          <div className={styles.indicators}>
            {dayRecords.slice(0, 4).map((r) => {
              const sub = subjects.find((s) => s.id === r.subjectId);
              if (!sub) return null;

              let dotBg = "var(--text-muted)";
              if (r.status === "ATTENDED") {
                dotBg = sub.colorCode;
              } else if (r.status === "MISSED") {
                dotBg = "var(--accent-danger)";
              }

              return (
                <div
                  key={r.id}
                  className={styles.dot}
                  style={{ backgroundColor: dotBg }}
                />
              );
            })}
          </div>
        </button>
      );
    }

    return calendarDays;
  };

  return (
    <div className={`glass-card ${styles.card}`}>
      <div className={styles.header}>
        <h4>
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h4>
        <div className={styles.nav}>
          <button onClick={() => navigateMonth("prev")} className={styles.navBtn}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => navigateMonth("next")} className={styles.navBtn}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className={styles.weekGrid}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} className={styles.weekLabel}>
            {w}
          </div>
        ))}
      </div>

      <div className={styles.daysGrid}>{renderDays()}</div>
    </div>
  );
}
