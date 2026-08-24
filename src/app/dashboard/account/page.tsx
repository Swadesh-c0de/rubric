import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccountClient from "./AccountClient";

export const instant = false;

export default async function AccountPage() {
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

  // Serialize Date objects to strings for Client Component boundary
  const serializedSessions = sessions.map((s: { id: string; name: string; startDate: Date; endDate: Date; standardClassDuration: number }) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    standardClassDuration: s.standardClassDuration,
  }));

  return (
    <AccountClient
      user={{
        name: session.user.name || "Student",
        email: session.user.email || "",
      }}
      initialSessions={serializedSessions}
    />
  );
}
