import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { name, standardClassDuration } = body;
    const { startDate, endDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

    const durationValue = standardClassDuration ? parseInt(standardClassDuration, 10) : 50;
    const parsedDuration = isNaN(durationValue) || durationValue <= 0 ? 50 : durationValue;

    const newSession = await prisma.session.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        userId,
        standardClassDuration: parsedDuration,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("POST /api/sessions error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    // Verify ownership before deleting
    const target = await prisma.session.findUnique({ where: { id } });
    if (!target || target.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Cascade delete (subjects + attendance records) via Prisma schema rules
    await prisma.session.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sessions error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
