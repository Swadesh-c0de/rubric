import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const dateStr = searchParams.get("date"); // Expected: YYYY-MM-DD

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    // Verify session ownership
    const userId = (session.user as { id: string }).id;
    const academicSession = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!academicSession) {
      return NextResponse.json({ error: "Academic session not found" }, { status: 404 });
    }

    if (dateStr) {
      const { start: startOfDay, end: endOfDay } = parseToUtcBounds(dateStr);

      // Fetch all subjects for the session
      const subjects = await prisma.subject.findMany({
        where: { sessionId },
      });

      // Fetch all attendance records for these subjects on this day
      const records = await prisma.attendanceRecord.findMany({
        where: {
          subjectId: { in: subjects.map((s: { id: string }) => s.id) },
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      return NextResponse.json({ subjects, records });
    } else {
      // Return all attendance records for this session's subjects
      const subjects = await prisma.subject.findMany({
        where: { sessionId },
      });

      const records = await prisma.attendanceRecord.findMany({
        where: {
          subjectId: { in: subjects.map((s: { id: string }) => s.id) },
        },
        orderBy: { date: "asc" },
      });

      return NextResponse.json({ subjects, records });
    }
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function parseToUtcBounds(dateStr: string): { start: Date; end: Date; target: Date } {
  let year: number;
  let month: number;
  let day: number;

  if (dateStr.includes("-")) {
    const parts = dateStr.split("T")[0].split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    const d = new Date(dateStr);
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    day = d.getUTCDate();
  }

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  const target = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return { start, end, target };
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subjectId, date, status, notes, classTiming } = body;

    if (!subjectId || !date || !status) {
      return NextResponse.json(
        { error: "Missing required fields: subjectId, date, status" },
        { status: 400 }
      );
    }

    // Verify subject belongs to user's session
    const userId = (session.user as { id: string }).id;
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        session: { userId },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const { start: startOfDay, end: endOfDay, target: targetDate } = parseToUtcBounds(date);

    // Get all subjects in the same session to validate overlaps across all session classes
    const subjectsInSession = await prisma.subject.findMany({
      where: { sessionId: subject.sessionId },
      select: { id: true },
    });
    const subjectIds = subjectsInSession.map((s: { id: string }) => s.id);

    // Fetch existing day records
    const dayRecords = await prisma.attendanceRecord.findMany({
      where: {
        subjectId: { in: subjectIds },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Timing and Overlap Validation
    if (status !== "CANCELLED") {
      if (!classTiming) {
        return NextResponse.json(
          { error: "Class timing is required for attendance logs." },
          { status: 400 }
        );
      }
      const newRange = parseTimingRange(classTiming);
      if (!newRange) {
        return NextResponse.json(
          { error: "Invalid class timing format. Both start and end times are required." },
          { status: 400 }
        );
      }

      const duration = newRange.end - newRange.start;
      if (duration > 300) {
        return NextResponse.json(
          { error: "Class duration cannot exceed 5 hours. Please verify your AM/PM selections." },
          { status: 400 }
        );
      }

      // Check overlap
      const overlap = dayRecords.find((rec: { status: string; classTiming: string | null; subjectId: string; id: string }) => {
        if (rec.status === "CANCELLED" || !rec.classTiming) return false;
        // Ignore the slot if we are updating the exact same class slot
        if (rec.subjectId === subjectId && rec.classTiming === classTiming) return false;

        const extRange = parseTimingRange(rec.classTiming);
        if (!extRange) return false;
        return newRange.start < extRange.end && extRange.start < newRange.end;
      });

      if (overlap) {
        return NextResponse.json(
          { error: `Time slot overlaps with an existing class log (${overlap.classTiming}).` },
          { status: 400 }
        );
      }
    }

    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        subjectId,
        classTiming: classTiming || null,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let record;
    if (existingRecord) {
      // Update
      record = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          status,
          notes: notes !== undefined ? notes : existingRecord.notes,
          date: targetDate,
          classTiming: classTiming || null,
        },
      });
    } else {
      // Create
      record = await prisma.attendanceRecord.create({
        data: {
          subjectId,
          date: targetDate,
          status,
          notes: notes || null,
          classTiming: classTiming || null,
        },
      });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    // Verify record ownership through subject and session
    const userId = (session.user as { id: string }).id;
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        id,
        subject: {
          session: { userId }
        }
      }
    });

    if (!record) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    await prisma.attendanceRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/attendance error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, subjectId, date, status, notes, classTiming } = body;

    if (!id || !subjectId || !date || !status) {
      return NextResponse.json(
        { error: "Missing required fields: id, subjectId, date, status" },
        { status: 400 }
      );
    }

    // Verify record ownership and fetch it
    const userId = (session.user as { id?: string }).id;
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        id,
        subject: {
          session: { userId },
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Attendance log not found" }, { status: 404 });
    }

    // Verify new subject belongs to user's session
    const targetSubject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        session: { userId },
      },
    });

    if (!targetSubject) {
      return NextResponse.json({ error: "Selected subject not found" }, { status: 404 });
    }

    const { start: startOfDay, end: endOfDay, target: targetDate } = parseToUtcBounds(date);

    // Get all subjects in the same session to validate overlaps across all session classes
    const subjectsInSession = await prisma.subject.findMany({
      where: { sessionId: targetSubject.sessionId },
      select: { id: true },
    });
    const subjectIds = subjectsInSession.map((s: { id: string }) => s.id);

    // Fetch existing day records
    const dayRecords = await prisma.attendanceRecord.findMany({
      where: {
        subjectId: { in: subjectIds },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Timing and Overlap Validation
    if (status !== "CANCELLED") {
      if (!classTiming) {
        return NextResponse.json(
          { error: "Class timing is required for attendance logs." },
          { status: 400 }
        );
      }
      const newRange = parseTimingRange(classTiming);
      if (!newRange) {
        return NextResponse.json(
          { error: "Invalid class timing format. Both start and end times are required." },
          { status: 400 }
        );
      }

      const duration = newRange.end - newRange.start;
      if (duration > 300) {
        return NextResponse.json(
          { error: "Class duration cannot exceed 5 hours. Please verify your AM/PM selections." },
          { status: 400 }
        );
      }

      // Check overlap
      const overlap = dayRecords.find((rec: { status: string; classTiming: string | null; subjectId: string; id: string }) => {
        if (rec.status === "CANCELLED" || !rec.classTiming) return false;
        // Ignore the record we are currently updating (by ID)
        if (rec.id === id) return false;

        const extRange = parseTimingRange(rec.classTiming);
        if (!extRange) return false;
        return newRange.start < extRange.end && extRange.start < newRange.end;
      });

      if (overlap) {
        return NextResponse.json(
          { error: `Time slot overlaps with an existing class log (${overlap.classTiming}).` },
          { status: 400 }
        );
      }
    }

    // Update
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        subjectId,
        date: targetDate,
        status,
        notes: notes || null,
        classTiming: classTiming || null,
      },
    });

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("PUT /api/attendance error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
