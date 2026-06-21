# Rubric • Attendance & Journal Monitor

Rubric is a premium, responsive web application designed for students and educators to organize academic terms, manage subjects, log daily class attendances, and keep journal entries/memos for each class session. Built with **Next.js**, **Prisma**, **SQLite**, and styled using a warm, editorial clay design system.

**Production URL:** [https://rubric-core.vercel.app](https://rubric-core.vercel.app)

---

## Key Features

1. **Academic Session (Term) Management**
   - Separate logs and analytics across semesters or academic terms.
   - Define custom "standard class durations" per term to calculate equivalent attendance weightings for longer labs or double periods.
2. **Subject Configuration**
   - Create, edit, and color-code academic subjects.
   - Live analytics including attendance rates, required class counts to reach target thresholds, and detailed warning status states.
3. **Daily Class Logging & Calendar**
   - Add, edit, or delete logs for classes directly via an interactive monthly calendar.
   - Support for multiple statuses: `ATTENDED` (Present), `MISSED` (Absent), and `CANCELLED` (No Class).
   - Add journal entries or notes describing lessons, homework, or assignments.
   - Real-time overlap collision warnings to prevent scheduling duplicate classes at the same hour.
4. **History Log Audit**
   - Filter and search logs by date, subject, attendance status, or keyword queries inside memos.
   - Toggle layouts between compact spreadsheet table views and mobile-friendly grid cards.
   - Custom sliding detail drawer to inspect and adjust individual logs.
5. **Secure Authentication**
   - Built-in Next-Auth JWT authentication with encrypted password hashing.
   - Fully isolated user spaces (all terms, logs, and subjects are sandboxed per user).
6. **Responsive Matte Design**
   - Beautiful dark mode utilizing a warm clay tone palette.
   - Clean, lightweight micro-animations powered by Framer Motion.
   - 100% responsive down to small mobile views, including a custom slider menu and scroll bars.

---

## Tech Stack & Architecture

- **Framework:** Next.js (App Router, Turbopack enabled)
- **Database:** SQLite
- **ORM:** Prisma Client
- **Authentication:** Next-Auth (Credentials Provider)
- **Styling:** CSS Modules, Vanilla CSS variables, Lucide React Icons
- **Animation:** Framer Motion

```
src/
├── app/               # Next.js App Router (pages & API endpoints)
├── components/        # Reusable UI Elements (Calendar, SubjectList, Drawers)
├── lib/               # Utility functions (auth config, Prisma client, helpers)
└── styles/            # Global theme variables & editorial reset
```

---

## Database Models

Refer to the Prisma schema (`prisma/schema.prisma`):
- **User:** Manages authentication details.
- **Session:** Represents an academic term or semester.
- **Subject:** Tracks individual course names, colors, and limits.
- **AttendanceRecord:** Stores class log dates, duration/timing, status, and journal memos.

---
