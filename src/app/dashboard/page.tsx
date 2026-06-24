import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  // Fetch academic sessions
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const activeSession = sessions[0] || null;

  // Fetch subjects for the active session
  const subjects = activeSession
    ? await prisma.subject.findMany({
        where: { sessionId: activeSession.id },
        orderBy: { name: "asc" },
      })
    : [];

  // Fetch attendance records for these subjects
  const records = activeSession && subjects.length > 0
    ? await prisma.attendanceRecord.findMany({
        where: {
          subjectId: { in: subjects.map((s) => s.id) },
        },
        orderBy: { date: "asc" },
      })
    : [];

  // Serialize Date objects to strings for Client Component boundary
  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    standardClassDuration: s.standardClassDuration,
  }));

  const serializedSubjects = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    colorCode: s.colorCode,
  }));

  const serializedRecords = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    status: r.status,
    notes: r.notes,
    classTiming: r.classTiming,
    subjectId: r.subjectId,
  }));

  return (
    <DashboardClient
      user={{
        name: session.user.name || "Student",
        email: session.user.email || "",
      }}
      initialSessions={serializedSessions}
      initialSubjects={serializedSubjects}
      initialRecords={serializedRecords}
    />
  );
}
