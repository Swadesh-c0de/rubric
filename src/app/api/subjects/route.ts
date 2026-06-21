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

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    // Verify session belongs to user
    const userId = (session.user as { id: string }).id;
    const academicSession = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!academicSession) {
      return NextResponse.json({ error: "Academic session not found" }, { status: 404 });
    }

    const subjects = await prisma.subject.findMany({
      where: { sessionId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("GET /api/subjects error:", error);
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
    const { name, colorCode, sessionId } = body;

    if (!name || !sessionId) {
      return NextResponse.json({ error: "Missing required fields: name, sessionId" }, { status: 400 });
    }

    // Verify session belongs to user
    const academicSession = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!academicSession) {
      return NextResponse.json({ error: "Academic session not found" }, { status: 404 });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        colorCode: colorCode || "#7c3aed",
        sessionId,
      },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error("POST /api/subjects error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { id, name, colorCode } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Missing required fields: id, name" }, { status: 400 });
    }

    // Verify subject belongs to user session
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!subject || subject.session.userId !== userId) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name,
        colorCode: colorCode || subject.colorCode,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/subjects error:", error);
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
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    // Verify subject belongs to user session
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!subject || subject.session.userId !== userId) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/subjects error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
