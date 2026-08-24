import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import styles from "./dashboard.module.css";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className={styles.layoutContainer}>
      <Sidebar
        user={{
          name: session.user?.name || "Student",
          email: session.user?.email || "",
        }}
      />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
